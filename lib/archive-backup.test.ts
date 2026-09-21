// @vitest-environment node
import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import JSZip from 'jszip';
import {
  generateProjectSummaryText,
  exportProjectArchiveZip,
  importProjectArchive,
} from './archive-backup';
import { INITIAL_RENOVATION_PROJECT } from './default-data';
import { savePhotoBlob, getPhotoBlob } from './db/photos';
import { getProjectFromDB } from './db/projects';

describe('Archive Backup and Restore Engine', () => {
  const sampleProject = {
    ...INITIAL_RENOVATION_PROJECT,
    title: 'Testowy Remont Apartamentu',
    qaChecklist: [
      {
        id: 'defect-1',
        stageCategory: 'finishing' as const,
        title: 'Pęknięcie tynku przy oknie',
        severity: 'critical' as const,
        status: 'failed' as const,
        standardNorm: 'PN-B-10110:2024',
        toleranceGuide: 'Max 1mm',
        inspectionTips: 'Sprawdź przy ościeżnicy',
      },
    ],
    workLogs: [
      {
        id: 'log-1',
        date: '2026-09-21',
        title: 'Gładzie i malowanie',
        author: 'Kierownik',
        description: 'Pierwsza warstwa gruntująca położona.',
        createdAt: '2026-09-21T10:00:00Z',
        photoIds: [],
      },
    ],
  };

  it('generates a detailed text summary of the project', () => {
    const summary = generateProjectSummaryText(sampleProject, 5);
    expect(summary).toContain('TESTOWY REMONT APARTAMENTU');
    expect(summary).toContain('BILANS FINANSOWY I BUDŻET');
    expect(summary).toContain('POMIESZCZENIA I OBLICZENIA');
    expect(summary).toContain('PROTOKÓŁ USTEREK I KONTROLI JAKOŚCI');
    expect(summary).toContain('Pęknięcie tynku przy oknie');
    expect(summary).toContain('FOTO-DZIENNIK BUDOWY');
  });

  it('exports a full ZIP archive with project.json, metadata, text summary, and raw photos', async () => {
    const photoBlob = new Blob(['photo-binary-content-123'], { type: 'image/webp' });
    await savePhotoBlob('test-photo-id-1', photoBlob);

    const result = await exportProjectArchiveZip(sampleProject);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toMatch(/^archiwum-remontu-testowy[-_]remont[-_]apartamentu-.*\.zip$/);
    expect(result.photoCount).toBeGreaterThanOrEqual(1);

    // Verify ZIP contents using JSZip
    const arrayBuffer = await result.blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    expect(zip.file('project.json')).not.toBeNull();
    expect(zip.file('metadata.json')).not.toBeNull();
    expect(zip.file('podsumowanie_inwestycji.txt')).not.toBeNull();
    expect(zip.file('raw_photos/test-photo-id-1.bin')).not.toBeNull();

    const rawProjectJson = await zip.file('project.json')?.async('text');
    const parsed = JSON.parse(rawProjectJson!);
    expect(parsed.title).toBe(sampleProject.title);
  });

  it('imports and restores project from JSON file', async () => {
    const jsonFile = new File([JSON.stringify(sampleProject)], 'project.json', {
      type: 'application/json',
    });

    const result = await importProjectArchive(jsonFile);
    expect(result.project.title).toBe(sampleProject.title);
    expect(result.restoredPhotosCount).toBe(0);

    const stored = await getProjectFromDB(sampleProject.id);
    expect(stored?.title).toBe(sampleProject.title);
  });

  it('imports and restores project and photos from ZIP archive', async () => {
    const zip = new JSZip();
    const modifiedProject = { ...sampleProject, id: 'proj-zip-test', title: 'Projekt z ZIP' };
    zip.file('project.json', JSON.stringify(modifiedProject));

    const restoredPhotoBlob = new Blob(['restored-image-data-abc'], { type: 'image/webp' });
    zip.folder('raw_photos')?.file('restored-photo-99.bin', restoredPhotoBlob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], 'archiwum.zip', { type: 'application/zip' });

    const importRes = await importProjectArchive(zipFile);
    expect(importRes.project.id).toBe('proj-zip-test');
    expect(importRes.project.title).toBe('Projekt z ZIP');
    expect(importRes.restoredPhotosCount).toBe(1);

    // Verify photo is restored in IndexedDB
    const photoFromDB = await getPhotoBlob('restored-photo-99');
    expect(photoFromDB).toBeDefined();
    expect(photoFromDB?.size).toBe(restoredPhotoBlob.size);
  });
});
