import JSZip from 'jszip';
import { RenovationProject } from '@/types/renovation';
import { getAllPhotosMap, saveMultiplePhotoBlobs } from './db/photos';
import { saveProjectToDB } from './db/projects';
import { isRenovationProjectShape } from './storage';

export interface ExportArchiveResult {
  blob: Blob;
  filename: string;
  photoCount: number;
}

export interface ImportArchiveResult {
  project: RenovationProject;
  restoredPhotosCount: number;
}

/**
 * Sanitize filename strings for Windows/UNIX safe paths inside ZIP.
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').slice(0, 50);
}

/**
 * Generates a clean, human-readable Polish summary text file for the project archive.
 */
export function generateProjectSummaryText(
  project: RenovationProject,
  photosCount: number,
  exportDate: Date = new Date()
): string {
  const totalSpent = project.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = project.totalPlannedBudget - totalSpent;
  const spentPercent = Math.round((totalSpent / (project.totalPlannedBudget || 1)) * 100);

  const lines: string[] = [
    '================================================================================',
    `   ARCHIWUM PROJEKTU REMONTOWEGO: ${project.title.toUpperCase()}`,
    '   System Zarządzania Remontem: Renowacje u Kaczaka',
    '================================================================================',
    `Data wygenerowania archiwum: ${exportDate.toLocaleString('pl-PL')}`,
    `Identyfikator projektu:      ${project.id}`,
    `Adres / Lokalizacja:         ${project.address || 'Nie podano'}`,
    `Termin inwestycji:           ${project.startDate} do ${project.targetEndDate}`,
    `Zdjęć i dokumentacji w bazie: ${photosCount}`,
    '',
    '--------------------------------------------------------------------------------',
    '1. BILANS FINANSOWY I BUDŻET',
    '--------------------------------------------------------------------------------',
    `Budżet planowany bazowy:     ${project.totalPlannedBudget.toLocaleString('pl-PL')} PLN`,
    `Rezerwa inwestycyjna:        ${project.contingencyReservePercent}% (${Math.round(
      (project.totalPlannedBudget * project.contingencyReservePercent) / 100
    ).toLocaleString('pl-PL')} PLN)`,
    `Rzeczywiste wydatki:         ${totalSpent.toLocaleString('pl-PL')} PLN (${spentPercent}% budżetu)`,
    `Pozostałe środki:            ${remainingBudget.toLocaleString('pl-PL')} PLN`,
    `Liczba zarejestrowanych pozycji: ${project.expenses.length}`,
    '',
    '--------------------------------------------------------------------------------',
    '2. POMIESZCZENIA I OBLICZENIA POWIERZCHNI',
    '--------------------------------------------------------------------------------',
  ];

  project.rooms.forEach((r, idx) => {
    lines.push(
      `${idx + 1}. ${r.name} (${r.type})` +
      ` | Podłoga: ${r.area} m²` +
      ` | Ściany: ${r.wallArea} m²` +
      ` | Wysokość: ${r.height} m` +
      ` | Obwód: ${r.perimeter} m`
    );
  });

  lines.push(
    '',
    '--------------------------------------------------------------------------------',
    '3. ETAPY HARMONOGRAMU I POSTĘP PRAC',
    '--------------------------------------------------------------------------------'
  );

  project.stages.forEach((s, idx) => {
    const cost = s.isDiy ? s.diyCostEstimate : s.contractorCostEstimate;
    lines.push(
      `${idx + 1}. [${s.status.toUpperCase()}] ${s.name} (${s.progressPercent}%)` +
      ` | Termin: ${s.startDate} - ${s.endDate}` +
      ` | Koszt plan: ${(cost || 0).toLocaleString('pl-PL')} PLN`
    );
  });

  if (project.contractors && project.contractors.length > 0) {
    lines.push(
      '',
      '--------------------------------------------------------------------------------',
      '4. EKIPY WYKONAWCZE I ROZLICZENIA',
      '--------------------------------------------------------------------------------'
    );
    project.contractors.forEach((c, idx) => {
      const paid = c.payments.reduce((sum, p) => sum + p.amount, 0);
      lines.push(
        `${idx + 1}. ${c.name} (${c.trade}) - Status: ${c.status}` +
        ` | Umowa: ${c.agreedTotalCost.toLocaleString('pl-PL')} PLN` +
        ` | Wypłacono: ${paid.toLocaleString('pl-PL')} PLN` +
        ` | Do zapłaty: ${(c.agreedTotalCost - paid).toLocaleString('pl-PL')} PLN`
      );
    });
  }

  const defects = project.qaChecklist?.filter((q) => q.status === 'failed') || [];
  if (defects.length > 0) {
    lines.push(
      '',
      '--------------------------------------------------------------------------------',
      '5. PROTOKÓŁ USTEREK I KONTROLI JAKOŚCI (QA / PUNCH LIST)',
      '--------------------------------------------------------------------------------'
    );
    defects.forEach((d, idx) => {
      lines.push(
        `${idx + 1}. [${d.status.toUpperCase()}] (${d.severity}) ${d.title}` +
        (d.standardNorm ? ` | Norma: ${d.standardNorm}` : '') +
        (d.toleranceGuide ? ` | Tolerancja: ${d.toleranceGuide}` : '')
      );
    });
  }

  const workLogs = project.workLogs || [];
  if (workLogs.length > 0) {
    lines.push(
      '',
      '--------------------------------------------------------------------------------',
      '6. FOTO-DZIENNIK BUDOWY (OSTATNIE WPISY)',
      '--------------------------------------------------------------------------------'
    );
    workLogs.slice(-10).forEach((entry, idx) => {
      const photosCount = (entry.photoIds?.length || 0) + (entry.photoId ? 1 : 0);
      lines.push(
        `${idx + 1}. ${entry.date} - ${entry.title} (Autor: ${entry.author || 'Kierownik'})` +
        ` | Zdjęć: ${photosCount}` +
        ` | Opis: ${entry.description}`
      );
    });
  }

  lines.push(
    '',
    '================================================================================',
    'Archiwum zawiera kompletne dane projektu w formacie JSON oraz wszystkie załączone zdjęcia.',
    'Aby przywrócić projekt w aplikacji, wybierz opcję "Przywróć z pliku" i wskaż to archiwum ZIP.',
    '================================================================================'
  );

  return lines.join('\n');
}

/**
 * Creates a complete ZIP archive with:
 * - project.json (complete JSON data)
 * - metadata.json (versioning & statistics)
 * - podsumowanie_inwestycji.txt (readable project summary)
 * - raw_photos/ (all Blobs indexed by photoId for lossless restoring)
 * - zdjecia/ (organized user-friendly folders with photos)
 */
export async function exportProjectArchiveZip(project: RenovationProject): Promise<ExportArchiveResult> {
  const zip = new JSZip();
  const photosMap = await getAllPhotosMap();

  // 1. Add core project data
  zip.file('project.json', JSON.stringify(project, null, 2));

  // 2. Add metadata
  const metadata = {
    appName: 'Renowacje u Kaczaka',
    formatVersion: '1.0',
    exportDate: new Date().toISOString(),
    projectId: project.id,
    projectTitle: project.title,
    roomsCount: project.rooms.length,
    expensesCount: project.expenses.length,
    workLogCount: project.workLogs?.length || 0,
    punchListDefectsCount: project.qaChecklist?.filter((q) => q.status === 'failed').length || 0,
    photosCount: photosMap.size,
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // 3. Add text summary
  const summaryText = generateProjectSummaryText(project, photosMap.size);
  zip.file('podsumowanie_inwestycji.txt', summaryText);

  // 4. Raw photos folder for precise 1:1 restoring
  const rawFolder = zip.folder('raw_photos');
  photosMap.forEach((blob, photoId) => {
    if (rawFolder) {
      rawFolder.file(`${photoId}.bin`, blob);
    }
  });

  // 5. Organized human-friendly folders for user browsing
  const photosFolder = zip.folder('zdjecia');
  if (photosFolder) {
    // Paragony
    const receiptsFolder = photosFolder.folder('paragony');
    project.expenses.forEach((exp) => {
      if (exp.receiptPhotoId && photosMap.has(exp.receiptPhotoId)) {
        const blob = photosMap.get(exp.receiptPhotoId)!;
        const cleanTitle = sanitizeFileName(exp.title || 'paragon');
        receiptsFolder?.file(`${exp.date}_${cleanTitle}_${exp.id.slice(0, 6)}.webp`, blob);
      }
    });

    // Foto-Dziennik
    const journalFolder = photosFolder.folder('dziennik_budowy');
    project.workLogs?.forEach((entry) => {
      const allPIds = [...(entry.photoIds || []), ...(entry.photoId ? [entry.photoId] : [])];
      allPIds.forEach((pId, idx) => {
        if (pId && photosMap.has(pId)) {
          const blob = photosMap.get(pId)!;
          const cleanTitle = sanitizeFileName(entry.title || 'wpis');
          journalFolder?.file(`${entry.date}_${cleanTitle}_foto${idx + 1}.webp`, blob);
        }
      });
    });

    // Pokoje (zdjęcia skanowania/wymiarowania)
    const roomsFolder = photosFolder.folder('pokoje');
    project.rooms.forEach((room) => {
      if (room.photoUrl?.startsWith('idb:')) {
        const pId = room.photoUrl.slice(4);
        if (photosMap.has(pId)) {
          const blob = photosMap.get(pId)!;
          const cleanRoom = sanitizeFileName(room.name);
          roomsFolder?.file(`${cleanRoom}_pomieszczenie.webp`, blob);
        }
      }
    });

    // Usterki Punch List
    const defectsFolder = photosFolder.folder('usterki_punchlist');
    project.qaChecklist?.forEach((defect, idx) => {
      if (defect.defectPhotoId && photosMap.has(defect.defectPhotoId)) {
        const blob = photosMap.get(defect.defectPhotoId)!;
        const cleanTitle = sanitizeFileName(defect.title || 'usterka');
        defectsFolder?.file(`usterka_${idx + 1}_${cleanTitle}.webp`, blob);
      }
    });
  }

  // 6. Generate ZIP Blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const titleSlug = sanitizeFileName(project.title.toLowerCase());
  const filename = `archiwum-remontu-${titleSlug}-${dateSlug}.zip`;

  return { blob, filename, photoCount: photosMap.size };
}

/**
 * Triggers a browser download of a given Blob.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a project archive from either a .zip or .json file.
 * If a .zip is provided, it parses project.json and restores all raw photo blobs to IndexedDB.
 */
export async function importProjectArchive(file: File): Promise<ImportArchiveResult> {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip');

  if (isZip) {
    const zip = await JSZip.loadAsync(file);
    const projectFile = zip.file('project.json');
    if (!projectFile) {
      throw new Error('Nie znaleziono pliku project.json wewnątrz archiwum ZIP.');
    }

    const projectText = await projectFile.async('text');
    const parsedProject = JSON.parse(projectText);
    if (!isRenovationProjectShape(parsedProject)) {
      throw new Error('Struktura danych projektu w archiwum ZIP jest nieprawidłowa.');
    }

    // Restore photos from raw_photos/
    const photoEntries: [string, Blob][] = [];
    const rawFolder = zip.folder('raw_photos');

    if (rawFolder) {
      const fileNames: string[] = [];
      rawFolder.forEach((relativePath) => {
        fileNames.push(relativePath);
      });

      for (const relPath of fileNames) {
        const rawFile = rawFolder.file(relPath);
        if (rawFile && !rawFile.dir) {
          // Extract photo ID: strip folder and extension (.bin / .webp / .jpg)
          const cleanName = relPath.replace(/^raw_photos\//, '').replace(/\.[^/.]+$/, '');
          if (cleanName) {
            const photoBlob = await rawFile.async('blob');
            photoEntries.push([cleanName, photoBlob]);
          }
        }
      }
    }

    if (photoEntries.length > 0) {
      await saveMultiplePhotoBlobs(photoEntries);
    }

    await saveProjectToDB(parsedProject);
    return {
      project: parsedProject,
      restoredPhotosCount: photoEntries.length,
    };
  } else {
    // Standard JSON import
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isRenovationProjectShape(parsed)) {
      throw new Error('Nieprawidłowy format lub uszkodzony plik JSON projektu.');
    }

    await saveProjectToDB(parsed);
    return {
      project: parsed,
      restoredPhotosCount: 0,
    };
  }
}
