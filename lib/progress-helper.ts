import { Room, RoomType, RoomWorkStage, StageCategory, StageStatus } from '@/types/renovation';

/**
 * Standard work stages per room type tailored to Polish construction practices.
 */
export function getDefaultWorkStagesForRoom(roomType: RoomType, roomId: string): RoomWorkStage[] {
  switch (roomType) {
    case 'lazienka':
      return [
        {
          id: `${roomId}-st-1`,
          name: 'Burzenie i skucie starych płytek',
          category: 'demolition',
          completed: true,
          status: 'done',
          completedAt: '2026-09-04',
          order: 1,
          notes: 'Skucie starych okładzin do gołego muru, usunięcie gruzu w big-bagu.',
        },
        {
          id: `${roomId}-st-2`,
          name: 'Instalacja wod-kan i odpływ liniowy',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-09',
          order: 2,
          notes: 'Podejścia PEX, stelaż podtynkowy WC i próba ciśnieniowa 10 bar.',
        },
        {
          id: `${roomId}-st-3`,
          name: 'Instalacja elektryczna i oświetlenie LED',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-13',
          order: 3,
          notes: 'Puszki IP44 lustro, zasilacz taśm LED w puszce rewizyjnej.',
        },
        {
          id: `${roomId}-st-4`,
          name: 'Tynkowanie i hydroizolacja 2-składnikowa',
          category: 'insulation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-17',
          order: 4,
          notes: 'Mankiety i taśmy w narożach, podwójna warstwa folii w płynie w strefie mokrej.',
        },
        {
          id: `${roomId}-st-5`,
          name: 'Układanie gresu 120x60 i kafelkowanie',
          category: 'finishing',
          completed: false,
          status: 'in_progress',
          order: 5,
          notes: 'Montaż ze spadkiem 2% do odpływu, fazowanie narożników pod kątem 45°.',
        },
        {
          id: `${roomId}-st-6`,
          name: 'Fugowanie epoksydowe i silikonowanie',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 6,
          notes: 'Fuga epoksydowa o zerowej nasiąkliwości, silikony sanitarne z grzybobójem.',
        },
        {
          id: `${roomId}-st-7`,
          name: 'Biały montaż, kabina walk-in i armatura',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 7,
          notes: 'Montaż miski WC rimless, ścianki prysznicowej 100cm i baterii termostatycznej.',
        },
      ];

    case 'kuchnia':
      return [
        {
          id: `${roomId}-st-1`,
          name: 'Demontaż starych szafek i okładzin',
          category: 'demolition',
          completed: true,
          status: 'done',
          completedAt: '2026-09-03',
          order: 1,
          notes: 'Odłączenie zmywarki, zlewu i bezpieczne zabezpieczenie rur.',
        },
        {
          id: `${roomId}-st-2`,
          name: 'Elektryka pod indukcję (400V) i gniazda blatowe',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-11',
          order: 2,
          notes: 'Dedykowane bezpieczniki B16/B20 dla piekarnika i zmywarki.',
        },
        {
          id: `${roomId}-st-3`,
          name: 'Podejścia wod-kan i odpływ zlewu',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-12',
          order: 3,
          notes: 'Zawory kątowe Schell z filtrem siatkowym.',
        },
        {
          id: `${roomId}-st-4`,
          name: 'Tynkowanie i gładzie ścian pod meble',
          category: 'masonry',
          completed: false,
          status: 'in_progress',
          order: 4,
          notes: 'Trzymanie kątów prostych 90° w narożnikach pod zabudowę stolarską.',
        },
        {
          id: `${roomId}-st-5`,
          name: 'Malowanie ścian farbą zmywalną (hydrofobową)',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 5,
          notes: 'Farba ceramiczna odporna na tłuszcz i szorowanie.',
        },
        {
          id: `${roomId}-st-6`,
          name: 'Fartuch kuchenny (płytki/spiek na ścianie roboczej)',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 6,
          notes: 'Montaż między blatem a szafkami wiszącymi.',
        },
        {
          id: `${roomId}-st-7`,
          name: 'Montaż zabudowy meblowej i sprzętu AGD',
          category: 'carpentry',
          completed: false,
          status: 'planned',
          order: 7,
          notes: 'Podłączenie płyty, okapu z odprowadzeniem i zmywarki.',
        },
      ];

    case 'salon':
      return [
        {
          id: `${roomId}-st-1`,
          name: 'Demontaże i usunięcie starych listew/paneli',
          category: 'demolition',
          completed: true,
          status: 'done',
          completedAt: '2026-09-02',
          order: 1,
          notes: 'Przygotowanie podłoża i odkurzenie przemysłowe.',
        },
        {
          id: `${roomId}-st-2`,
          name: 'Instalacja elektryczna, peszle TV i szynoprzewody',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-14',
          order: 2,
          notes: 'Trasy pod kino domowe i magistralę smart home.',
        },
        {
          id: `${roomId}-st-3`,
          name: 'Tynki i bezpyłowe gładzie gipsowe Q3/Q4',
          category: 'masonry',
          completed: false,
          status: 'in_progress',
          order: 3,
          notes: 'Wtopienie taśmy amerykańskiej na łączeniach, szlif z lampą smugową.',
        },
        {
          id: `${roomId}-st-4`,
          name: 'Gruntowanie i malowanie sufitu oraz ścian',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 4,
          notes: 'Sufit matowa biel głęboka, ściany odcień ciepłej szarości.',
        },
        {
          id: `${roomId}-st-5`,
          name: 'Montaż posadzki (deska w jodełkę klasyczną)',
          category: 'flooring',
          completed: false,
          status: 'planned',
          order: 5,
          notes: 'Sprawdzenie wilgotności wylewki CM <1.8%, klejenie silanowe.',
        },
        {
          id: `${roomId}-st-6`,
          name: 'Montaż listew przypodłogowych i drzwi',
          category: 'carpentry',
          completed: false,
          status: 'planned',
          order: 6,
          notes: 'Listwy MDF 80mm malowane na biało, dylatacje korkowe.',
        },
        {
          id: `${roomId}-st-7`,
          name: 'Montaż osprzętu elektrycznego i oświetlenia',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 7,
          notes: 'Ramki szklane czarny mat, szyny magnetyczne reflektorowe.',
        },
      ];

    case 'sypialnia':
      return [
        {
          id: `${roomId}-st-1`,
          name: 'Przygotowanie powierzchni i bruzdowanie',
          category: 'demolition',
          completed: true,
          status: 'done',
          completedAt: '2026-09-05',
          order: 1,
          notes: 'Oczyszczenie tynków i zabezpieczenie okien.',
        },
        {
          id: `${roomId}-st-2`,
          name: 'Elektryka (włączniki schodowe i gniazda USB przy łóżku)',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-10',
          order: 2,
          notes: 'Sterowanie oświetleniem z poziomu materaca.',
        },
        {
          id: `${roomId}-st-3`,
          name: 'Wygłuszenie akustyczne ściany wezgłowia',
          category: 'insulation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-15',
          order: 3,
          notes: 'Płyty g-k akustyczne niebieskie + wełna mineralna 50mm.',
        },
        {
          id: `${roomId}-st-4`,
          name: 'Tynkowanie i gładzie polimerowe',
          category: 'masonry',
          completed: false,
          status: 'planned',
          order: 4,
          notes: 'Gładź finiszowa gotowa do malowania.',
        },
        {
          id: `${roomId}-st-5`,
          name: 'Malowanie ścian i montaż lameli dębowych',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 5,
          notes: 'Akcent kolorystyczny za łóżkiem i panele filcowe.',
        },
        {
          id: `${roomId}-st-6`,
          name: 'Montaż wykładziny / podłogi i listew',
          category: 'flooring',
          completed: false,
          status: 'planned',
          order: 6,
          notes: 'Miękki podkład piankowy pod wykładzinę hotelową.',
        },
        {
          id: `${roomId}-st-7`,
          name: 'Montaż garderoby w zabudowie i oświetlenia',
          category: 'carpentry',
          completed: false,
          status: 'planned',
          order: 7,
          notes: 'Drzwi przesuwne z cichym domykiem i oświetleniem w szafie.',
        },
      ];

    case 'przedpokoj':
    default:
      return [
        {
          id: `${roomId}-st-1`,
          name: 'Demontaż starej szafy i ościeżnicy',
          category: 'demolition',
          completed: true,
          status: 'done',
          completedAt: '2026-09-02',
          order: 1,
          notes: 'Przygotowanie wnęki na szafę pod wymiar.',
        },
        {
          id: `${roomId}-st-2`,
          name: 'Rozdzielnica główna i okablowanie teletechniczne',
          category: 'installation',
          completed: true,
          status: 'done',
          completedAt: '2026-09-08',
          order: 2,
          notes: 'Podział na obwody, kabel światłowodowy do szafy.',
        },
        {
          id: `${roomId}-st-3`,
          name: 'Wyrównanie posadzki i mata grzewcza w strefie brudnej',
          category: 'flooring',
          completed: true,
          status: 'done',
          completedAt: '2026-09-12',
          order: 3,
          notes: 'Elektryczne dogrzewanie strefy wejścia na osuszanie butów.',
        },
        {
          id: `${roomId}-st-4`,
          name: 'Tynki i gładzie odporne na uderzenia',
          category: 'masonry',
          completed: false,
          status: 'planned',
          order: 4,
          notes: 'Zastosowanie narożników aluminiowych w ciągach komunikacyjnych.',
        },
        {
          id: `${roomId}-st-5`,
          name: 'Układanie gresu wielkoformatowego (80x80)',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 5,
          notes: 'Płynne łączenie gresu z deską za pomocą profilu mosiężnego.',
        },
        {
          id: `${roomId}-st-6`,
          name: 'Malowanie farbą ceramiczną i montaż plafonów',
          category: 'finishing',
          completed: false,
          status: 'planned',
          order: 6,
          notes: 'Czujniki ruchu na nocne podświetlenie przypodłogowe.',
        },
        {
          id: `${roomId}-st-7`,
          name: 'Montaż drzwi wejściowych i szafy z lustrem',
          category: 'carpentry',
          completed: false,
          status: 'planned',
          order: 7,
          notes: 'Ościeżnica ciepła z uszczelkami akustycznymi 42dB.',
        },
      ];
  }
}

/**
 * Returns room's stages or initialized defaults.
 */
export function getRoomWorkStages(room: Room): RoomWorkStage[] {
  if (room.workStages && room.workStages.length > 0) {
    return room.workStages;
  }
  return getDefaultWorkStagesForRoom(room.type, room.id);
}

export interface RoomProgressInfo {
  percent: number;
  completedCount: number;
  totalCount: number;
  statusText: 'Ukończony' | 'Zaawansowany' | 'W toku' | 'Rozpoczęty' | 'Do rozpoczęcia';
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  progressBarGradient: string;
}

/**
 * Calculates progress metrics and visual styling for a specific room.
 */
export function calculateRoomProgress(room: Room): RoomProgressInfo {
  const stages = getRoomWorkStages(room);
  const totalCount = stages.length;

  if (totalCount === 0) {
    return {
      percent: 0,
      completedCount: 0,
      totalCount: 0,
      statusText: 'Do rozpoczęcia',
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-900',
      badgeText: 'text-slate-300',
      badgeBorder: 'border-slate-800',
      progressBarGradient: 'from-slate-700 to-slate-600',
    };
  }

  // If marked explicitly completed
  if (room.isCompleted) {
    return {
      percent: 100,
      completedCount: totalCount,
      totalCount,
      statusText: 'Ukończony',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      progressBarGradient: 'from-emerald-500 to-teal-400',
    };
  }

  const completedCount = stages.filter((s) => s.completed || s.status === 'done').length;
  const inProgressCount = stages.filter((s) => !s.completed && s.status === 'in_progress').length;
  
  // Stages in progress count as 50%
  const effectiveScore = completedCount + inProgressCount * 0.5;
  const percent = Math.min(100, Math.round((effectiveScore / totalCount) * 100));

  if (percent === 100) {
    return {
      percent: 100,
      completedCount: totalCount,
      totalCount,
      statusText: 'Ukończony',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      progressBarGradient: 'from-emerald-500 to-teal-400',
    };
  }

  if (percent >= 60) {
    return {
      percent,
      completedCount,
      totalCount,
      statusText: 'Zaawansowany',
      colorClass: 'text-teal-400',
      badgeBg: 'bg-teal-950/80',
      badgeText: 'text-teal-300',
      badgeBorder: 'border-teal-500/40',
      progressBarGradient: 'from-teal-500 to-cyan-400',
    };
  }

  if (percent >= 25) {
    return {
      percent,
      completedCount,
      totalCount,
      statusText: 'W toku',
      colorClass: 'text-amber-400',
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      progressBarGradient: 'from-amber-500 to-yellow-400',
    };
  }

  if (percent > 0) {
    return {
      percent,
      completedCount,
      totalCount,
      statusText: 'Rozpoczęty',
      colorClass: 'text-sky-400',
      badgeBg: 'bg-sky-950/80',
      badgeText: 'text-sky-300',
      badgeBorder: 'border-sky-500/40',
      progressBarGradient: 'from-sky-500 to-blue-400',
    };
  }

  return {
    percent: 0,
    completedCount: 0,
    totalCount,
    statusText: 'Do rozpoczęcia',
    colorClass: 'text-slate-400',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-400',
    badgeBorder: 'border-slate-800',
    progressBarGradient: 'from-slate-700 to-slate-600',
  };
}

export interface ProjectProgressSummary {
  percent: number; // area-weighted
  simpleAveragePercent: number;
  totalStages: number;
  completedStages: number;
  totalRooms: number;
  completedRooms: number;
  inProgressRooms: number;
  pendingRooms: number;
  totalArea: number;
  completedArea: number;
  overallStatusText: string;
}

/**
 * Calculates global project progress metrics across all rooms.
 */
export function calculateProjectProgress(rooms: Room[]): ProjectProgressSummary {
  if (!rooms || rooms.length === 0) {
    return {
      percent: 0,
      simpleAveragePercent: 0,
      totalStages: 0,
      completedStages: 0,
      totalRooms: 0,
      completedRooms: 0,
      inProgressRooms: 0,
      pendingRooms: 0,
      totalArea: 0,
      completedArea: 0,
      overallStatusText: 'Brak danych',
    };
  }

  let totalStages = 0;
  let completedStages = 0;
  let totalArea = 0;
  let weightedProgressSum = 0;
  let simplePercentSum = 0;

  let completedRooms = 0;
  let inProgressRooms = 0;
  let pendingRooms = 0;

  rooms.forEach((room) => {
    const roomProgress = calculateRoomProgress(room);
    const roomStages = getRoomWorkStages(room);

    totalStages += roomStages.length;
    completedStages += roomProgress.completedCount;
    totalArea += room.area;

    weightedProgressSum += roomProgress.percent * room.area;
    simplePercentSum += roomProgress.percent;

    if (roomProgress.percent === 100) {
      completedRooms += 1;
    } else if (roomProgress.percent > 0) {
      inProgressRooms += 1;
    } else {
      pendingRooms += 1;
    }
  });

  const simpleAveragePercent = Math.round(simplePercentSum / rooms.length);
  const weightedPercent = totalArea > 0 ? Math.round(weightedProgressSum / totalArea) : simpleAveragePercent;
  const completedArea = parseFloat(((weightedPercent / 100) * totalArea).toFixed(1));

  let overallStatusText = 'W trakcie realizacji';
  if (weightedPercent === 100) overallStatusText = 'Remont ukończony';
  else if (weightedPercent >= 75) overallStatusText = 'Faza wykończeniowa';
  else if (weightedPercent >= 40) overallStatusText = 'Zaawansowane prace';
  else if (weightedPercent > 0) overallStatusText = 'Wczesny etap prac';
  else overallStatusText = 'Stan przygotowawczy';

  return {
    percent: weightedPercent,
    simpleAveragePercent,
    totalStages,
    completedStages,
    totalRooms: rooms.length,
    completedRooms,
    inProgressRooms,
    pendingRooms,
    totalArea: parseFloat(totalArea.toFixed(1)),
    completedArea,
    overallStatusText,
  };
}
