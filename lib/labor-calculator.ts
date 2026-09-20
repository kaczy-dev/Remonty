import { Room, RenovationProject, Contractor, ContractorTrade } from '@/types/renovation';

export interface LaborRateItem {
  id: string;
  category: string;
  trade: ContractorTrade;
  name: string;
  unit: 'm²' | 'mb' | 'pkt' | 'szt.' | 'kpl.';
  minRate: number; // PLN
  avgRate: number; // PLN
  maxRate: number; // PLN
  description: string;
}

/**
 * Aktualna baza średnich stawek rynkowych robocizny w Polsce (stan na lata 2024-2026).
 * Stawki uśrednione dla prac wykończeniowych wysokiej jakości.
 */
export const POLISH_LABOR_MARKET_RATES: LaborRateItem[] = [
  // Malowanie i gładzie
  {
    id: 'lr-gladzie',
    category: 'Ściany i Sufity',
    trade: 'painter',
    name: 'Gładź gipsowa 2x + gruntowanie + szlif bezpyłowy',
    unit: 'm²',
    minRate: 45,
    avgRate: 55,
    maxRate: 70,
    description: 'Przygotowanie podłoża, grunt głęboko penetrujący, 2 warstwy masy szpachlowej, szlifowanie żyrafą z odkurzaczem.',
  },
  {
    id: 'lr-malowanie',
    category: 'Ściany i Sufity',
    trade: 'painter',
    name: 'Malowanie ścian i sufitów (2 warstwy farby lateksowej/ceramicznej)',
    unit: 'm²',
    minRate: 18,
    avgRate: 24,
    maxRate: 32,
    description: 'Zabezpieczenie narożników taśmami, gruntowanie malarskie oraz dwukrotne malowanie hydrodynamiczne lub wałkiem.',
  },
  // Glazurnictwo i posadzki
  {
    id: 'lr-plytki-std',
    category: 'Płytki i Glazura',
    trade: 'tiler',
    name: 'Układanie gresu / płytek ceramicznych (format 60x60 / 30x60)',
    unit: 'm²',
    minRate: 120,
    avgRate: 150,
    maxRate: 190,
    description: 'Gruntowanie, klejenie na grzebień z systemem poziomowania (klipsy), fugowanie cementowe elastyczne.',
  },
  {
    id: 'lr-plytki-duze',
    category: 'Płytki i Glazura',
    trade: 'tiler',
    name: 'Układanie gresu wielkoformatowego (format 120x60 i większe)',
    unit: 'm²',
    minRate: 160,
    avgRate: 210,
    maxRate: 280,
    description: 'Podwójne smarowanie (buttering-floating), precyzyjne docinki maszynowe na mokro, ukosowanie krawędzi 45° (jolly).',
  },
  {
    id: 'lr-hydroizolacja',
    category: 'Płytki i Glazura',
    trade: 'tiler',
    name: 'Hydroizolacja podpłytkowa (folia w płynie 2x + wklejenie taśm w narożnikach)',
    unit: 'm²',
    minRate: 40,
    avgRate: 55,
    maxRate: 70,
    description: 'Wzmocnienie narożników taśmą elastyczną, mankiety ścienne/podłogowe wokół podejść wod-kan i odpływu.',
  },
  {
    id: 'lr-panele',
    category: 'Podłogi',
    trade: 'doors_floors',
    name: 'Układanie paneli podłogowych / winylowych na klik z podkładem',
    unit: 'm²',
    minRate: 35,
    avgRate: 45,
    maxRate: 60,
    description: 'Folia paroizolacyjna, ułożenie podkładu akustycznego, zachowanie dylatacji obwodowych 10-15 mm.',
  },
  {
    id: 'lr-listwy',
    category: 'Podłogi',
    trade: 'doors_floors',
    name: 'Montaż listew przypodłogowych (MDF / polimer z docinaniem pod kątem 45°)',
    unit: 'mb',
    minRate: 25,
    avgRate: 35,
    maxRate: 48,
    description: 'Docinanie ukośnicą, klejenie montażowe, uszczelnienie akrylem od góry.',
  },
  // Instalacje Wod-Kan
  {
    id: 'lr-punkt-wodkan',
    category: 'Hydraulika',
    trade: 'plumber',
    name: 'Wykonanie punktu instalacji wod-kan (podejście ciepła/zimna + odpływ)',
    unit: 'pkt',
    minRate: 180,
    avgRate: 240,
    maxRate: 320,
    description: 'Bruzdowanie w ścianie, montaż rur PEX/zgrzewanych, podejście kanalizacyjne ze spadkiem min. 2%.',
  },
  {
    id: 'lr-stelaz-wc',
    category: 'Hydraulika',
    trade: 'plumber',
    name: 'Montaż stelaża podtynkowego WC / Bidetu (typu Geberit) z podłączeniem',
    unit: 'szt.',
    minRate: 220,
    avgRate: 290,
    maxRate: 380,
    description: 'Kotwienie stelaża do ściany i posadzki, poziomowanie, podłączenie zasilania wody i rury spustowej.',
  },
  {
    id: 'lr-odplyw-liniowy',
    category: 'Hydraulika',
    trade: 'plumber',
    name: 'Montaż odpływu liniowego z wyprofilowaniem spadków posadzki (kopertowy)',
    unit: 'kpl.',
    minRate: 300,
    avgRate: 420,
    maxRate: 550,
    description: 'Wypoziomowanie rynny odpływowej, wykonanie spadku min. 2% w stronę korytka, podłączenie syfonu.',
  },
  {
    id: 'lr-bialy-montaz',
    category: 'Hydraulika',
    trade: 'plumber',
    name: 'Biały montaż (miska WC + deska + przycisk + umywalka z baterią i syfonem)',
    unit: 'kpl.',
    minRate: 250,
    avgRate: 350,
    maxRate: 480,
    description: 'Zawieszenie ceramiki, montaż zaworów kątowych, uszczelnienie silikonem sanitarnym z fungicydem.',
  },
  // Elektryka
  {
    id: 'lr-punkt-elektryczny',
    category: 'Elektryka',
    trade: 'electrician',
    name: 'Punkt elektryczny (gniazdo 230V, łącznik oświetlenia, wypust sufitowy)',
    unit: 'pkt',
    minRate: 90,
    avgRate: 120,
    maxRate: 160,
    description: 'Wycięcie puszki otwornicą, bruzdowanie, ułożenie przewodu YDYp 3x2.5 / 3x1.5 w tynku, osadzenie puszki.',
  },
  {
    id: 'lr-rozdzielnica',
    category: 'Elektryka',
    trade: 'electrician',
    name: 'Montaż i uzbrojenie rozdzielnicy mieszkaniowej z pomiarami odbiorczymi',
    unit: 'kpl.',
    minRate: 800,
    avgRate: 1200,
    maxRate: 1800,
    description: 'Osadzenie szafki, podłączenie wyłącznika RCD, zabezpieczeń nadprądowych B10/B16, sporządzenie protokołu.',
  },
  {
    id: 'lr-szlif-45',
    category: 'Płytki i Glazura',
    trade: 'tiler',
    name: 'Szlifowanie krawędzi płytek pod kątem 45° (jolly / naroża zewnętrzne)',
    unit: 'mb',
    minRate: 90,
    avgRate: 130,
    maxRate: 170,
    description: 'Precyzyjne ukosowanie krawędzi gresu na mokro, mikrofaza bez profilu aluminiowego.',
  },
  {
    id: 'lr-otwory-gres',
    category: 'Płytki i Glazura',
    trade: 'tiler',
    name: 'Wycinanie otworów w gresie / spiekach (koronki diamentowe fi 20-110 mm)',
    unit: 'szt.',
    minRate: 35,
    avgRate: 50,
    maxRate: 70,
    description: 'Wiercenie otworów pod baterie podtynkowe, przyłącza wod-kan i puszki elektryczne.',
  },
  {
    id: 'lr-silikon',
    category: 'Płytki i Glazura',
    trade: 'tiler',
    name: 'Silikonowanie dylatacji obwodowych, naroży i styków sanitariatów',
    unit: 'mb',
    minRate: 15,
    avgRate: 22,
    maxRate: 30,
    description: 'Wypełnienie elastycznym silikonem sanitarnym z fungicydem i profilowanie spoiny.',
  },
  {
    id: 'lr-wylewka',
    category: 'Posadzki i Podkłady',
    trade: 'doors_floors',
    name: 'Wylewka samopoziomująca cienkowarstwowa (grunt szczepny + wylanie + odpowietrzenie)',
    unit: 'm²',
    minRate: 35,
    avgRate: 48,
    maxRate: 65,
    description: 'Przygotowanie podłoża, gruntowanie, wylanie masy z niwelacją i wałkowanie kolczastym wałkiem.',
  },
  {
    id: 'lr-zabudowa-gk',
    category: 'Zabudowy G-K i Sufity',
    trade: 'plasterer',
    name: 'Sufit podwieszany jednopoziomowy na stelażu krzyżowym z płytowaniem',
    unit: 'm²',
    minRate: 100,
    avgRate: 140,
    maxRate: 180,
    description: 'Konstrukcja stalowa CD/UD 60, taśmy akustyczne, płyty gipsowo-kartonowe 12.5 mm, spoinowanie Q1.',
  },
  {
    id: 'lr-zabudowa-stelaż',
    category: 'Zabudowy G-K i Sufity',
    trade: 'plasterer',
    name: 'Zabudowa stelaża podtynkowego WC / rur instalacyjnych płytą wodoodporną zieloną (H2)',
    unit: 'kpl.',
    minRate: 180,
    avgRate: 260,
    maxRate: 350,
    description: 'Podwójne płytowanie 2x12.5 mm GKBI, wzmocnienia profili, wycięcie otworów serwisowych.',
  },
  // Drzwi i zabudowy
  {
    id: 'lr-drzwi',
    category: 'Stolarka',
    trade: 'doors_floors',
    name: 'Montaż drzwi wewnętrznych z ościeżnicą regulowaną i klamką',
    unit: 'szt.',
    minRate: 220,
    avgRate: 290,
    maxRate: 380,
    description: 'Złożenie ościeżnicy, zakotwienie, pianowanie niskoprężne, montaż opasek maskujących, zawieszenie skrzydła.',
  },
  {
    id: 'lr-demontaz',
    category: 'Wyburzenia i Przygotowanie',
    trade: 'general',
    name: 'Skucie starych płytek / tynku wraz ze znoszeniem gruzu do worków BigBag',
    unit: 'm²',
    minRate: 45,
    avgRate: 65,
    maxRate: 90,
    description: 'Kucie młotowiertarką do surowego podłoża, pakowanie do worków, oczyszczenie i zamiecenie pomieszczenia.',
  },
];

export interface RoomLaborItem {
  rateId: string;
  name: string;
  category: string;
  trade: ContractorTrade;
  quantity: number;
  unit: string;
  unitRate: number; // avg rate
  totalCost: number;
  formulaDescription: string;
}

export interface RoomLaborEstimate {
  roomId: string;
  roomName: string;
  items: RoomLaborItem[];
  totalMin: number;
  totalAvg: number;
  totalMax: number;
}

export interface ProjectLaborSummary {
  rooms: RoomLaborEstimate[];
  totalMin: number;
  totalAvg: number;
  totalMax: number;
  byTrade: Record<ContractorTrade, { totalCost: number; itemsCount: number }>;
}

/**
 * Automatycznie szacuje zakres i rynkowy koszt robocizny dla danego pokoju
 * na podstawie wymiarów geometrycznych i liczby instalacji.
 */
export function calculateRoomLaborEstimate(room: Room): RoomLaborEstimate {
  const items: RoomLaborItem[] = [];
  const isWetRoom = room.type === 'lazienka';
  const isLivingOrBed = room.type === 'salon' || room.type === 'sypialnia' || room.type === 'przedpokoj';

  // 1. Ściany - Gładzie i Malowanie
  const gladzRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-gladzie')!;
  const malowanieRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-malowanie')!;

  if (!isWetRoom) {
    // Standardowe pomieszczenie suche - pełna gładź i malowanie ścian
    items.push({
      rateId: gladzRate.id,
      name: gladzRate.name,
      category: gladzRate.category,
      trade: gladzRate.trade,
      quantity: Math.round(room.wallArea * 10) / 10,
      unit: gladzRate.unit,
      unitRate: gladzRate.avgRate,
      totalCost: Math.round(room.wallArea * gladzRate.avgRate),
      formulaDescription: `${room.wallArea.toFixed(1)} m² ścian netto × ${gladzRate.avgRate} zł/m²`,
    });

    items.push({
      rateId: malowanieRate.id,
      name: malowanieRate.name,
      category: malowanieRate.category,
      trade: malowanieRate.trade,
      quantity: Math.round((room.wallArea + room.area) * 10) / 10, // ściany + sufit
      unit: malowanieRate.unit,
      unitRate: malowanieRate.avgRate,
      totalCost: Math.round((room.wallArea + room.area) * malowanieRate.avgRate),
      formulaDescription: `${(room.wallArea + room.area).toFixed(1)} m² (ściany ${room.wallArea.toFixed(1)} m² + sufit ${room.area.toFixed(1)} m²) × ${malowanieRate.avgRate} zł/m²`,
    });
  }

  // 2. Łazienka - Hydroizolacja i Płytki
  if (isWetRoom) {
    const hydroRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-hydroizolacja')!;
    const tilerRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-plytki-std')!;

    items.push({
      rateId: hydroRate.id,
      name: hydroRate.name,
      category: hydroRate.category,
      trade: hydroRate.trade,
      quantity: Math.round((room.area + 10) * 10) / 10, // posadzka + 10m² strefy mokrej natrysku
      unit: hydroRate.unit,
      unitRate: hydroRate.avgRate,
      totalCost: Math.round((room.area + 10) * hydroRate.avgRate),
      formulaDescription: `Posadzka ${room.area.toFixed(1)} m² + 10 m² strefa prysznica × ${hydroRate.avgRate} zł/m²`,
    });

    items.push({
      rateId: tilerRate.id,
      name: tilerRate.name,
      category: tilerRate.category,
      trade: tilerRate.trade,
      quantity: Math.round((room.area + room.wallArea) * 10) / 10,
      unit: tilerRate.unit,
      unitRate: tilerRate.avgRate,
      totalCost: Math.round((room.area + room.wallArea) * tilerRate.avgRate),
      formulaDescription: `Posadzka i ściany łącznie ${(room.area + room.wallArea).toFixed(1)} m² × ${tilerRate.avgRate} zł/m²`,
    });

    const stelazRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-stelaz-wc')!;
    items.push({
      rateId: stelazRate.id,
      name: stelazRate.name,
      category: stelazRate.category,
      trade: stelazRate.trade,
      quantity: 1,
      unit: stelazRate.unit,
      unitRate: stelazRate.avgRate,
      totalCost: stelazRate.avgRate,
      formulaDescription: `1 szt. stelaża WC z zabudową i podłączeniem`,
    });
  }

  // 3. Podłogi w pokojach suchych
  if (isLivingOrBed) {
    const paneleRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-panele')!;
    const listwyRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-listwy')!;

    items.push({
      rateId: paneleRate.id,
      name: paneleRate.name,
      category: paneleRate.category,
      trade: paneleRate.trade,
      quantity: Math.round(room.area * 10) / 10,
      unit: paneleRate.unit,
      unitRate: paneleRate.avgRate,
      totalCost: Math.round(room.area * paneleRate.avgRate),
      formulaDescription: `Posadzka netto ${room.area.toFixed(1)} m² × ${paneleRate.avgRate} zł/m²`,
    });

    items.push({
      rateId: listwyRate.id,
      name: listwyRate.name,
      category: listwyRate.category,
      trade: listwyRate.trade,
      quantity: Math.round(room.perimeter * 10) / 10,
      unit: listwyRate.unit,
      unitRate: listwyRate.avgRate,
      totalCost: Math.round(room.perimeter * listwyRate.avgRate),
      formulaDescription: `Obwód pomieszczenia ${room.perimeter.toFixed(1)} mb × ${listwyRate.avgRate} zł/mb`,
    });
  }

  // 4. Punkty elektryczne
  const outletsCount = room.outlets?.length || (isLivingOrBed ? 8 : 4);
  const elekRate = POLISH_LABOR_MARKET_RATES.find((r) => r.id === 'lr-punkt-elektryczny')!;
  items.push({
    rateId: elekRate.id,
    name: `${elekRate.name} (wypusty i puszki)`,
    category: elekRate.category,
    trade: elekRate.trade,
    quantity: outletsCount,
    unit: elekRate.unit,
    unitRate: elekRate.avgRate,
    totalCost: outletsCount * elekRate.avgRate,
    formulaDescription: `${outletsCount} punktów el. w pomieszczeniu × ${elekRate.avgRate} zł/pkt`,
  });

  const totalAvg = items.reduce((sum, it) => sum + it.totalCost, 0);
  const totalMin = Math.round(totalAvg * 0.82);
  const totalMax = Math.round(totalAvg * 1.25);

  return {
    roomId: room.id,
    roomName: room.name,
    items,
    totalMin,
    totalAvg,
    totalMax,
  };
}

/**
 * Szacuje całościowy rynkowy koszt robocizny dla całego projektu inwestycyjnego.
 */
export function calculateProjectLaborEstimate(rooms: Room[]): ProjectLaborSummary {
  const roomEstimates = rooms.map(calculateRoomLaborEstimate);

  let totalMin = 0;
  let totalAvg = 0;
  let totalMax = 0;

  const byTrade: Record<ContractorTrade, { totalCost: number; itemsCount: number }> = {
    general: { totalCost: 0, itemsCount: 0 },
    electrician: { totalCost: 0, itemsCount: 0 },
    plumber: { totalCost: 0, itemsCount: 0 },
    tiler: { totalCost: 0, itemsCount: 0 },
    painter: { totalCost: 0, itemsCount: 0 },
    carpenter: { totalCost: 0, itemsCount: 0 },
    plasterer: { totalCost: 0, itemsCount: 0 },
    hvac: { totalCost: 0, itemsCount: 0 },
    doors_floors: { totalCost: 0, itemsCount: 0 },
  };

  roomEstimates.forEach((r) => {
    totalMin += r.totalMin;
    totalAvg += r.totalAvg;
    totalMax += r.totalMax;

    r.items.forEach((item) => {
      if (!byTrade[item.trade]) {
        byTrade[item.trade] = { totalCost: 0, itemsCount: 0 };
      }
      byTrade[item.trade].totalCost += item.totalCost;
      byTrade[item.trade].itemsCount += 1;
    });
  });

  return {
    rooms: roomEstimates,
    totalMin,
    totalAvg,
    totalMax,
    byTrade,
  };
}

export interface ContractorSettlementSummary {
  agreedTotalCost: number;
  totalPaid: number;
  remainingToPay: number;
  paidPercent: number;
  advancesPaid: number;
  stagesPaid: number;
  finalPaid: number;
}

/**
 * Podsumowuje stan rozliczeń z danym wykonawcą.
 */
export function calculateContractorSettlement(contractor: Contractor): ContractorSettlementSummary {
  const payments = contractor.payments || [];
  const agreedTotalCost = contractor.agreedTotalCost || 0;

  let advancesPaid = 0;
  let stagesPaid = 0;
  let finalPaid = 0;

  payments.forEach((p) => {
    if (p.type === 'advance') advancesPaid += p.amount;
    else if (p.type === 'stage_settlement') stagesPaid += p.amount;
    else if (p.type === 'final') finalPaid += p.amount;
  });

  const totalPaid = advancesPaid + stagesPaid + finalPaid;
  const remainingToPay = Math.max(0, agreedTotalCost - totalPaid);
  const paidPercent = agreedTotalCost > 0 ? Math.min(100, Math.round((totalPaid / agreedTotalCost) * 100)) : 0;

  return {
    agreedTotalCost,
    totalPaid,
    remainingToPay,
    paidPercent,
    advancesPaid,
    stagesPaid,
    finalPaid,
  };
}

export interface ContractGenerationOptions {
  project: RenovationProject;
  contractor: Contractor;
  investorName?: string;
  investorAddress?: string;
  investorPhone?: string;
  contractCity?: string;
  contractDate?: string;
  warrantyMonths?: number;
  penaltyPerDayPercent?: number;
}

/**
 * Generuje profesjonalny, gotowy wzór Umowy o Roboty Remontowo-Budowlane
 * sporządzony w oparciu o Kodeks Cywilny (art. 647 i nast. k.c. / art. 627 k.c.),
 * chroniący inwestora przed opóźnieniami, wadami i porzuceniem budowy.
 */
export function generateRenovationContractText(options: ContractGenerationOptions): string {
  const {
    project,
    contractor,
    investorName = 'Inwestor / Właściciel lokalu',
    investorAddress = project.address,
    investorPhone = '+48 ...',
    contractCity = 'Warszawa',
    contractDate = new Date().toISOString().split('T')[0],
    warrantyMonths = 24,
    penaltyPerDayPercent = 0.2,
  } = options;

  const tradeLabels: Record<ContractorTrade, string> = {
    general: 'Prace ogólnobudowlane i wykończeniowe',
    electrician: 'Instalacje elektryczne i osprzęt',
    plumber: 'Instalacje hydrauliczne i biały montaż',
    tiler: 'Glazurnictwo i okładziny ceramiczne',
    painter: 'Gładzie gipsowe i malowanie',
    carpenter: 'Stolarka meblowa i montaż',
    plasterer: 'Tynkowanie i przygotowanie podłoży',
    hvac: 'Wentylacja i klimatyzacja',
    doors_floors: 'Montaż podłóg i drzwi wewnętrznych',
  };

  return `UMOWA O PRACE REMONTOWO-WYKOŃCZENIOWE
Nr rej.: UM-${contractor.id.toUpperCase()}/${contractDate.replace(/-/g, '')}
Zawarta w dniu ${contractDate} r. w miejscowości ${contractCity}, pomiędzy:

1. ZAMAWIAJĄCYM (INWESTOREM):
   Imię i nazwisko / Nazwa: ${investorName}
   Adres zamieszkania / Siedziby: ${investorAddress}
   Telefon: ${investorPhone}

oraz

2. WYKONAWCĄ:
   Imię i nazwisko / Nazwa firmy: ${contractor.companyName || contractor.name}
   reprezentowany przez: ${contractor.name}
   NIP: ${contractor.nip || '[do uzupełnienia]'}
   Telefon kontaktowy: ${contractor.phone}
   E-mail: ${contractor.email || '[brak]'}
   Specjalizacja branżowa: ${tradeLabels[contractor.trade] || contractor.trade}

§ 1. PRZEDMIOT UMOWY
1. Zamawiający zleca, a Wykonawca przyjmuje do wykonania kompleksowe prace remontowo-wykończeniowe w lokalu:
   Adres inwestycji: ${project.address} (Projekt: "${project.title}").
2. Szczegółowy zakres rzeczowy prac powierzonych Wykonawcy obejmuje:
   ${contractor.scopeNotes || 'Wykonanie prac wykończeniowych zgodnie z ustaleniami stron i sztuką budowlaną.'}
3. Wykonawca oświadcza, że posiada odpowiednie kwalifikacje, doświadczenie oraz sprawny park maszynowy niezbędny do terminowego i bezusterkowego zrealizowania przedmiotu umowy zgodnie z normami budowlanymi PN-EN oraz warunkami technicznymi wykonania i odbioru robót (WTWiORB ITB).
4. Prace zanikające i ulegające zakryciu (m.in. hydroizolacja stref mokrych, próby ciśnieniowe instalacji wod-kan, okablowanie przed otynkowaniem/zabudową G-K) podlegają bezwzględnemu obowiązkowi zgłoszenia i odbioru częściowego przed ich zakryciem. W razie zaniechania zgłoszenia Wykonawca zobowiązany jest na własny koszt do ich odkrycia.

§ 2. TERMINY REALIZACJI
1. Strony ustalają następujące terminy realizacji przedmiotu umowy:
   a) Rozpoczęcie prac: ${contractor.startDate || project.startDate || '[do ustalenia]'} r.
   b) Zakończenie prac i zgłoszenie do odbioru: ${contractor.endDate || project.targetEndDate || '[do ustalenia]'} r.
2. Zmiana terminów wymaga formy pisemnej lub elektronicznej pod rygorem nieważności (aneks do umowy).

§ 3. WYNAGRODZENIE I ZASADY ROZLICZEŃ
1. Za prawidłowe i bezusterkowe wykonanie przedmiotu umowy Zamawiający zapłaci Wykonawcy ustalone wynagrodzenie ryczałtowe w łącznej kwocie:
   ${contractor.agreedTotalCost.toLocaleString('pl-PL')} PLN (słownie: ${numberToPolishWords(contractor.agreedTotalCost)} złotych 00/100).
2. Wynagrodzenie będzie wypłacane w transzach na podstawie odbiorów etapowych oraz odbioru końcowego:
   - Zaliczka początkowa: płatna w dniu wejścia na budowę na zakup materiałów i zabezpieczenie prac.
   - Rozliczenia częściowe: po bezusterkowym odbiorze poszczególnych etapów technologicznych.
   - Płatność końcowa (min. 10-15% kwoty umowy): płatna w terminie 5 dni po podpisaniu bezusterkowego Protokołu Odbioru Końcowego.
3. Wypłata każdej transzy zostanie poświadczona pisemnym pokwitowaniem lub przelewem bankowym.

§ 4. OBOWIĄZKI WYKONAWCY I UTRZYMANIE PORZĄDKU
1. Wykonawca zobowiązuje się do:
   a) Prowadzenia prac zgodnie ze sztuką budowlaną, przepisami BHP oraz normami technicznymi.
   b) Zabezpieczenia części wspólnych budynku (korytarz, winda, klatka schodowa) przed zabrudzeniem i uszkodzeniem.
   c) Codziennego sprzątania stanowiska pracy oraz regularnego pakowania gruzu i odpadów do worków typu BigBag.
   d) Respektowania ciszy nocnej oraz regulaminu wspólnoty mieszkaniowej (prace głośne wyłącznie w godz. 8:00 - 18:00 w dni robocze).

§ 5. KARY UMOWNE I ODSTĄPIENIE OD UMOWY
1. W przypadku nieterminowego wykonania prac z winy Wykonawcy, Zamawiający ma prawo naliczyć karę umowną w wysokości ${penaltyPerDayPercent}% wartości wynagrodzenia brutto za każdy rozpoczęty dzień opóźnienia.
2. W przypadku stwierdzenia rażących wad technologicznych, niestawiennictwa ekipy przez okres dłuższy niż 3 dni robocze bez usprawiedliwienia, Zamawiający ma prawo odstąpić od umowy ze skutkiem natychmiastowym i powierzyć dokończenie prac innemu wykonawcy na koszt i ryzyko Wykonawcy.

§ 6. GWARANCJA I RĘKOJMIA
1. Wykonawca udziela Zamawiającemu pisemnej gwarancji jakości na wykonane prace na okres ${warrantyMonths} miesięcy, licząc od dnia podpisania bezusterkowego Protokołu Odbioru Końcowego.
2. Wszelkie wady ujawnione w okresie gwarancji Wykonawca zobowiązuje się usunąć na własny koszt w terminie do 14 dni od daty pisemnego lub mailowego zgłoszenia.

§ 7. POSTANOWIENIA KOŃCOWE
1. W sprawach nieuregulowanych niniejszą umową zastosowanie mają właściwe przepisy Kodeksu Cywilnego.
2. Wszelkie spory wynikające z realizacji umowy strony będą rozstrzygać polubownie, a w przypadku braku porozumienia przed sądem właściwym dla miejsca położenia nieruchomości.
3. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.


.....................................................                .....................................................
         Podpis Zamawiającego (Inwestor)                                      Podpis Wykonawcy (Ekipa)



================================================================================
ZAŁĄCZNIK NR 1: PROTOKÓŁ ODBIORU KOŃCOWEGO ROBÓT REMONTOWYCH
Sporządzony w lokalu: ${project.address} w dniu ............................. r.

1. Komisja odbiorowa w składzie:
   - Zamawiający: ${investorName}
   - Wykonawca: ${contractor.name}
   stwierdza, że prace powierzone umową zostały wykonane.

2. Ocena jakościowa prac i stwierdzone usterki:
   [  ] Prace wykonano bezusterkowo - obiekt nadaje się do natychmiastowego użytkowania.
   [  ] Stwierdzono następujące drobne usterki podlegające usunięciu:
        1. ............................................................................................ (termin usunięcia: .................)
        2. ............................................................................................ (termin usunięcia: .................)

3. Ostateczne rozliczenie finansowe:
   - Wynagrodzenie umowne: ${contractor.agreedTotalCost.toLocaleString('pl-PL')} PLN
   - Wypłacone zaliczki i transze: .................... PLN
   - Kwota pozostała do zapłaty: .................... PLN

Podpisy stron protokołu:


.....................................................                .....................................................
               Zamawiający                                                          Wykonawca
`;
}

/**
 * Pomocnicza funkcja formatowania liczb na słowa w języku polskim (dla standardowych kwot umownych).
 */
function numberToPolishWords(n: number): string {
  if (!n || isNaN(n) || n <= 0) return 'zero';

  const units = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
  const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
  const tens = ['', 'dziesięć', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
  const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

  function convertGroup(val: number): string {
    const h = Math.floor(val / 100);
    const rem = val % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;
    const parts: string[] = [];

    if (h > 0) parts.push(hundreds[h]);
    if (rem >= 10 && rem <= 19) {
      parts.push(teens[rem - 10]);
    } else {
      if (t > 0) parts.push(tens[t]);
      if (u > 0) parts.push(units[u]);
    }
    return parts.join(' ');
  }

  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;
  const result: string[] = [];

  if (thousands > 0) {
    if (thousands === 1) {
      result.push('jeden tysiąc');
    } else if (thousands % 10 >= 2 && thousands % 10 <= 4 && (thousands % 100 < 10 || thousands % 100 >= 20)) {
      result.push(`${convertGroup(thousands)} tysiące`);
    } else {
      result.push(`${convertGroup(thousands)} tysięcy`);
    }
  }

  if (remainder > 0) {
    result.push(convertGroup(remainder));
  }

  return result.join(' ').trim();
}
