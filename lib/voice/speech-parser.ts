/**
 * Construction Site Hands-Free Voice Recognition & Polish Speech Parser
 * Specjalistyczny moduł parsowania mowy i komend budowlanych po polsku
 */

export type VoiceCommandType =
  | 'SET_DIMENSION'
  | 'ADD_EXPENSE'
  | 'ADD_OPENING'
  | 'ADD_NOTE'
  | 'TRIGGER_ACTION'
  | 'UNKNOWN';

export type DimensionTarget = 'width' | 'length' | 'height' | 'diagonal1' | 'diagonal2';

export interface SetDimensionPayload {
  target: DimensionTarget;
  targetLabel: string;
  value: number; // in meters (e.g. 3.45)
  unit: 'm';
}

export interface AddExpensePayload {
  title: string;
  amount: number; // in PLN
  category: string;
}

export interface AddOpeningPayload {
  type: 'window' | 'door';
  typeLabel: string;
  width: number; // in meters
  height: number; // in meters
}

export interface AddNotePayload {
  note: string;
  isDefect: boolean;
}

export type TriggerActionType =
  | 'laser_measure'
  | 'laser_connect'
  | 'laser_multishot'
  | 'camera_freeze'
  | 'camera_torch'
  | 'auto_square'
  | 'calculate_materials'
  | 'next_room'
  | 'prev_room'
  | 'save'
  | 'cancel';

export interface TriggerActionPayload {
  action: TriggerActionType;
  actionLabel: string;
}

export interface VoiceCommandResult {
  type: VoiceCommandType;
  rawTranscript: string;
  feedbackText: string;
  spokenFeedback: string;
  dimensionPayload?: SetDimensionPayload;
  expensePayload?: AddExpensePayload;
  openingPayload?: AddOpeningPayload;
  notePayload?: AddNotePayload;
  actionPayload?: TriggerActionPayload;
}

// Słownik polskich liczebników do konwersji tekstu mówionego na liczby
const POLISH_WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  jeden: 1,
  jedna: 1,
  jedno: 1,
  dwa: 2,
  dwie: 2,
  trzy: 3,
  cztery: 4,
  pięć: 5,
  piec: 5,
  sześć: 6,
  szesc: 6,
  siedem: 7,
  osiem: 8,
  dziewięć: 9,
  dziewiec: 9,
  dziesięć: 10,
  dziesiec: 10,
  jedenaście: 11,
  jedenascie: 11,
  dwanaście: 12,
  dwanascie: 12,
  trzynaście: 13,
  trzynascie: 13,
  czternaście: 14,
  czternascie: 14,
  piętnaście: 15,
  pietnascie: 15,
  szesnaście: 16,
  szesnascie: 16,
  siedemnaście: 17,
  siedemnascie: 17,
  osiemnaście: 18,
  osiemnascie: 18,
  dziewiętnaście: 19,
  dziewietnascie: 19,
  dwadzieścia: 20,
  dwadziescia: 20,
  trzydzieści: 30,
  trzydziesci: 30,
  czterdzieści: 40,
  czterdziesci: 40,
  pięćdziesiąt: 50,
  piecdziesiat: 50,
  sześćdziesiąt: 60,
  szeszdziesiat: 60,
  szescdziesiat: 60,
  siedemdziesiąt: 70,
  siedemdziesiat: 70,
  osiemdziesiąt: 80,
  osiemdziesiat: 80,
  dziewięćdziesiąt: 90,
  dziewiecdziesiat: 90,
  sto: 100,
  dwieście: 200,
  dwiescie: 200,
  trzysta: 300,
  czterysta: 400,
  pięćset: 500,
  piecset: 500,
  sześćset: 600,
  szescset: 600,
  siedemset: 700,
  osiemset: 800,
  dziewięćset: 900,
  dziewiecset: 900,
  tysiąc: 1000,
  tysiac: 1000,
  tysiące: 1000,
  tysiace: 1000,
};

/**
 * Normalizuje polski tekst: małe litery, usuwanie zbędnych znaków interpunkcyjnych
 */
export function normalizePolishText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[;?!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parsuje polski ciąg słów w liczbę (np. "trzy i pół" -> 3.5, "sto dwadzieścia" -> 120, "trzy przecinek cztery" -> 3.4)
 */
export function parsePolishWordsToNumber(tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  // Sprawdź czy to pojedyncza liczba zapisana cyframi (np. "3.45", "3,45", "120")
  if (tokens.length === 1) {
    const rawNum = tokens[0].replace(',', '.');
    const val = parseFloat(rawNum);
    if (!isNaN(val)) return val;
  }

  // Sprawdź frazy z "i pół" / "pół"
  if (tokens.includes('pół') || tokens.includes('pol')) {
    const halfIdx = tokens.findIndex((t) => t === 'pół' || t === 'pol');
    const beforeTokens = tokens.slice(0, halfIdx).filter((t) => t !== 'i');
    if (beforeTokens.length === 0) return 0.5;
    const base = parsePolishWordsToNumber(beforeTokens);
    if (base !== null) return base + 0.5;
  }

  // Sprawdź frazy z "przecinek" lub "kropka"
  const commaIdx = tokens.findIndex((t) => t === 'przecinek' || t === 'kropka');
  if (commaIdx > 0 && commaIdx < tokens.length - 1) {
    const intTokens = tokens.slice(0, commaIdx);
    const decTokens = tokens.slice(commaIdx + 1);
    const intVal = parsePolishWordsToNumber(intTokens);
    const decVal = parsePolishWordsToNumber(decTokens);

    if (intVal !== null && decVal !== null) {
      const decStr = decVal.toString();
      return parseFloat(`${intVal}.${decStr}`);
    }
  }

  // Sumowanie standardowych części setek, dziesiątek i jedności
  let total = 0;
  let currentGroup = 0;
  let matchedAny = false;

  for (const token of tokens) {
    const directNum = parseFloat(token.replace(',', '.'));
    if (!isNaN(directNum)) {
      currentGroup += directNum;
      matchedAny = true;
      continue;
    }

    const wordVal = POLISH_WORD_NUMBERS[token];
    if (wordVal !== undefined) {
      matchedAny = true;
      if (wordVal >= 1000) {
        total += (currentGroup === 0 ? 1 : currentGroup) * wordVal;
        currentGroup = 0;
      } else {
        currentGroup += wordVal;
      }
    }
  }

  if (!matchedAny) return null;
  return total + currentGroup;
}

/**
 * Ekstrahuje wartość wymiaru w metrach ze zdań budowlanych
 */
export function extractDimensionMeters(text: string): number | null {
  const norm = normalizePolishText(text);

  // Wzorzec 1: Metry i centymetry (np. "3 metry 40", "5 metrów 20", "3 metry 45 cm", "3m 40cm", "3 metra 25")
  const metersAndCmMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metr(?:[aey]|ów)?)\s*(?:i\s*)?(\d+)\s*(?:cm|centymetr(?:[aey]|ów)?)?/iu);
  if (metersAndCmMatch) {
    const m = parseFloat(metersAndCmMatch[1].replace(',', '.'));
    const cm = parseFloat(metersAndCmMatch[2]);
    if (!isNaN(m) && !isNaN(cm)) {
      return parseFloat((m + cm / 100).toFixed(3));
    }
  }

  // Wzorzec 2: Tylko centymetry (np. "340 cm", "340 centymetrów", "85 centymetrów", "85 cm")
  const onlyCmMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centymetr(?:[aey]|ów)?)\b/iu);
  if (onlyCmMatch) {
    const cm = parseFloat(onlyCmMatch[1].replace(',', '.'));
    if (!isNaN(cm)) {
      return parseFloat((cm / 100).toFixed(3));
    }
  }

  // Wzorzec 3: Tylko milimetry (np. "3400 mm", "3400 milimetrów")
  const onlyMmMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|milimetr(?:[aey]|ów)?)\b/iu);
  if (onlyMmMatch) {
    const mm = parseFloat(onlyMmMatch[1].replace(',', '.'));
    if (!isNaN(mm)) {
      return parseFloat((mm / 1000).toFixed(3));
    }
  }

  // Wzorzec 4: Jawne metry z przecinkiem/kropką (np. "3,45 m", "3.45 metra", "3,45")
  const metersMatch = norm.match(/(\d+[.,]\d+)\s*(?:m|metr(?:[aey]|ów)?)?/iu);
  if (metersMatch) {
    const m = parseFloat(metersMatch[1].replace(',', '.'));
    if (!isNaN(m)) return m;
  }

  // Wzorzec 5: Liczba całkowita jako metry (jeśli występuje słowo metr)
  const intMetersMatch = norm.match(/(\d+)\s*(?:m|metr(?:[aey]|ów)?)\b/iu);
  if (intMetersMatch) {
    const m = parseFloat(intMetersMatch[1]);
    if (!isNaN(m)) return m;
  }

  // Słowne "i pół", np. "dwa i pół metra", "4 i pół metra"
  const cleanTokens = norm.split(/\s+/).filter(
    (w) => !['metr', 'metry', 'metra', 'metrów', 'cm', 'centymetrów', 'centymetry'].includes(w)
  );

  if (cleanTokens.includes('pół') || cleanTokens.includes('pol')) {
    const num = parsePolishWordsToNumber(cleanTokens);
    if (num !== null) return num;
  }

  // Słowne polskie metry i centymetry (np. "trzy metry czterdzieści", "metr dwadzieścia")
  const words = norm.split(/\s+/);
  const meterWordIdx = words.findIndex((w) => /^metr/i.test(w) || w === 'm');
  if (meterWordIdx >= 0) {
    let mVal: number | null = null;
    if (meterWordIdx === 0) {
      mVal = 1;
    } else {
      const beforeMeterWords = words.slice(0, meterWordIdx);
      mVal = parsePolishWordsToNumber(beforeMeterWords);
    }

    if (mVal !== null) {
      const afterMeterWords = words.slice(meterWordIdx + 1).filter(
        (w) => !/^centymetr/i.test(w) && w !== 'cm' && w !== 'i'
      );
      if (afterMeterWords.length > 0) {
        const cmVal = parsePolishWordsToNumber(afterMeterWords);
        if (cmVal !== null) {
          const cmMeters = cmVal < 100 ? cmVal / 100 : cmVal / 1000;
          return parseFloat((mVal + cmMeters).toFixed(3));
        }
      }
      return mVal;
    }
  }

  // Wzorzec 7: Sama liczba w typowym zakresie budowlanym (np. "340" -> 3.40m)
  const bareNumMatch = norm.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (bareNumMatch) {
    const val = parseFloat(bareNumMatch[1].replace(',', '.'));
    if (!isNaN(val)) {
      if (val >= 30 && val <= 1000) {
        return parseFloat((val / 100).toFixed(3));
      }
      return val;
    }
  }

  return parsePolishWordsToNumber(words);
}

/**
 * Automatycznie przypisuje kategorię kosztu na podstawie słów kluczowych
 */
export function guessExpenseCategory(title: string): string {
  const norm = normalizePolishText(title);
  if (norm.match(/ekip|robocizn|fachowiec|glazurnik|malarz|hydraulik|elektryk|montaż|montaz|zaliczka/i)) {
    return 'Robocizna / Ekipa';
  }
  if (norm.match(/wiertark|pędzel|pedzel|wałek|walek|szpachl|tarcza|poziomic|laser|młot|mlot|narzędz|narzedz/i)) {
    return 'Narzędzia i sprzęt';
  }
  if (norm.match(/transport|dostawa|wniesienie|paliwo|kurier/i)) {
    return 'Transport i wniesienie';
  }
  if (norm.match(/gruz|kontener|worek|utylizac|odpady/i)) {
    return 'Wywóz gruzu i utylizacja';
  }
  if (norm.match(/farb|panele|płytk|plytk|glazur|listw|lampa|gniazdk|bater|umywalk|drzwi/i)) {
    return 'Wykończenie i dekoracje';
  }
  return 'Materiały budowlane';
}

/**
 * Główny parser komend głosowych w języku polskim
 */
export function parseVoiceCommand(transcript: string): VoiceCommandResult {
  const norm = normalizePolishText(transcript);

  if (!norm) {
    return {
      type: 'UNKNOWN',
      rawTranscript: transcript,
      feedbackText: 'Czekam na polecenie głosowe...',
      spokenFeedback: 'Nie usłyszałem polecenia.',
    };
  }

  // 1. Polecenia akcji natychmiastowych (laser, następne pomieszczenie, zapisz)
  if (/(?<=^|\s)(laser|mierz|zrób pomiar|strzał|pomiar laserem|zmierz)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Wyzwalanie pomiaru laserowego BLE...',
      spokenFeedback: 'Wyzwalanie pomiaru laserowego.',
      actionPayload: {
        action: 'laser_measure',
        actionLabel: 'Pomiar laserem BLE',
      },
    };
  }

  if (/(?<=^|\s)(następne pomieszczenie|kolejny pokój|kolejne pomieszczenie)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Przełączanie na kolejne pomieszczenie...',
      spokenFeedback: 'Przechodzę do następnego pomieszczenia.',
      actionPayload: {
        action: 'next_room',
        actionLabel: 'Kolejne pomieszczenie',
      },
    };
  }

  if (/(?<=^|\s)(poprzednie pomieszczenie|poprzedni pokój)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Przełączanie na poprzednie pomieszczenie...',
      spokenFeedback: 'Przechodzę do poprzedniego pomieszczenia.',
      actionPayload: {
        action: 'prev_room',
        actionLabel: 'Poprzednie pomieszczenie',
      },
    };
  }

  if (/(?<=^|\s)(zapisz|zapisz projekt|zapisz zmiany)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Zapisywanie projektu...',
      spokenFeedback: 'Projekt został zapisany.',
      actionPayload: {
        action: 'save',
        actionLabel: 'Zapisz projekt',
      },
    };
  }

  if (/(?<=^|\s)(połącz dalmierz|polacz dalmierz|włącz dalmierz|wlacz dalmierz|szukaj dalmierza)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Nawiązywanie połączenia BLE z dalmierzem...',
      spokenFeedback: 'Łączenie z dalmierzem laserowym.',
      actionPayload: {
        action: 'laser_connect',
        actionLabel: 'Połącz dalmierz BLE',
      },
    };
  }

  if (/(?<=^|\s)(kolejka pomiarów|kolejka pomiarow|tryb serii|seria pomiarowa|resetuj serię|zresetuj serię)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Przełączanie trybu serii pomiarowej...',
      spokenFeedback: 'Włączono tryb szybkiej serii pomiarowej.',
      actionPayload: {
        action: 'laser_multishot',
        actionLabel: 'Tryb serii pomiarowej',
      },
    };
  }

  if (/(?<=^|\s)(zamroź kadr|zamroz kadr|stopklatka|odmroź kadr|odmroz kadr|wznów kadr)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Przełączanie stopklatki kamery...',
      spokenFeedback: 'Przełączono stopklatkę.',
      actionPayload: {
        action: 'camera_freeze',
        actionLabel: 'Zamroź / wznów kadr',
      },
    };
  }

  if (/(?<=^|\s)(włącz latarkę|wlacz latarke|wyłącz latarkę|wylacz latarke|latarka)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Przełączanie latarki aparatu...',
      spokenFeedback: 'Przełączono latarkę.',
      actionPayload: {
        action: 'camera_torch',
        actionLabel: 'Latarka aparatu',
      },
    };
  }

  if (/(?<=^|\s)(wyrównaj kąty|wyrownaj katy|wyprostuj kąty|wyprostuj katy|kąty proste|katy proste|prostuj narożniki)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Wyrównywanie narożników do kątów prostych (90°)...',
      spokenFeedback: 'Wyrównano kąty wielokąta do dziewięćdziesięciu stopni.',
      actionPayload: {
        action: 'auto_square',
        actionLabel: 'Wyrównaj do kątów 90°',
      },
    };
  }

  if (/(?<=^|\s)(oblicz materiały|oblicz materialy|ile farby|ile tynku|ile gładzi|ile gladzi|zapotrzebowanie)(?=\s|$)/iu.test(norm)) {
    return {
      type: 'TRIGGER_ACTION',
      rawTranscript: transcript,
      feedbackText: 'Kalkulacja zużycia materiałów...',
      spokenFeedback: 'Obliczam zapotrzebowanie na materiały.',
      actionPayload: {
        action: 'calculate_materials',
        actionLabel: 'Oblicz materiały',
      },
    };
  }

  // 2. Wprowadzanie wymiarów (szerokość, długość, wysokość, przekątna)
  const isWidth = /(?<=^|\s)(szerokość|szerokosc|szer|szeroki|szerokie)(?=\s|:|$)/iu.test(norm);
  const isLength = /(?<=^|\s)(długość|dlugosc|długi|dlugi|długie|dlugie)(?=\s|:|$)/iu.test(norm);
  const isHeight = /(?<=^|\s)(wysokość|wysokosc|wysoki|wysokie|wys)(?=\s|:|$)/iu.test(norm);
  const isDiagonal1 = /(?<=^|\s)(przekątna 1|przekatna 1|przekątna jeden|przekatna jeden|d1)(?=\s|:|$)/iu.test(norm);
  const isDiagonal2 = /(?<=^|\s)(przekątna 2|przekatna 2|przekątna dwa|przekatna dwa|d2)(?=\s|:|$)/iu.test(norm);
  const isGenericDiagonal = !isDiagonal1 && !isDiagonal2 && /(?<=^|\s)(przekątna|przekatna)(?=\s|:|$)/iu.test(norm);

  if (isWidth || isLength || isHeight || isDiagonal1 || isDiagonal2 || isGenericDiagonal) {
    let target: DimensionTarget = 'width';
    let targetLabel = 'Szerokość';

    if (isWidth) {
      target = 'width';
      targetLabel = 'Szerokość';
    } else if (isLength) {
      target = 'length';
      targetLabel = 'Długość';
    } else if (isHeight) {
      target = 'height';
      targetLabel = 'Wysokość';
    } else if (isDiagonal1) {
      target = 'diagonal1';
      targetLabel = 'Przekątna D₁';
    } else if (isDiagonal2) {
      target = 'diagonal2';
      targetLabel = 'Przekątna D₂';
    } else if (isGenericDiagonal) {
      target = 'diagonal1';
      targetLabel = 'Przekątna D₁';
    }

    // Bezpieczne usuwanie słów kluczowych wymiaru
    const cleanedText = norm
      .replace(/(?<=^|\s)(szerokość|szerokosc|szer|szeroki|szerokie|długość|dlugosc|długi|dlugi|długie|dlugie|wysokość|wysokosc|wysoki|wysokie|wys|przekątna 1|przekatna 1|przekątna jeden|przekatna jeden|przekątna 2|przekatna 2|przekątna dwa|przekatna dwa|przekątna|przekatna|d1|d2|na|równa|rowna|wynosi|ustaw)(?=\s|:|$)/giu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const val = extractDimensionMeters(cleanedText);

    if (val !== null && val > 0 && val < 50) {
      const formattedVal = val.toFixed(2);
      return {
        type: 'SET_DIMENSION',
        rawTranscript: transcript,
        feedbackText: `Ustawiono ${targetLabel.toLowerCase()}: ${formattedVal} m`,
        spokenFeedback: `Ustawiono ${targetLabel.toLowerCase()}: ${formattedVal.replace('.', ' i ')} metra.`,
        dimensionPayload: {
          target,
          targetLabel,
          value: parseFloat(formattedVal),
          unit: 'm',
        },
      };
    }
  }

  // 3. Dodawanie wydatków / materiałów ("dodaj wydatek 120 zł na klej do płytek", "wydatek 350 pln cement")
  if (/(?<=^|\s)(wydatek|koszt|kupiono|kupiłem|kupilem|rachunek|faktura)(?=\s|$)/iu.test(norm)) {
    let amount: number | null = null;
    const plnMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:zł|złotych|zl|pln)\b/iu);
    if (plnMatch) {
      amount = parseFloat(plnMatch[1].replace(',', '.'));
    } else {
      const anyNum = norm.match(/\b(\d+(?:[.,]\d+)?)\b/);
      if (anyNum) {
        amount = parseFloat(anyNum[1].replace(',', '.'));
      }
    }

    // Wyciągamy tytuł wydatku usuwając słowa kluczowe i kwotę
    let title = norm
      .replace(/(?<=^|\s)(dodaj|nowy|wydatek|koszt|kupiono|kupiłem|kupilem|rachunek|faktura|za|na|złotych|zł|zl|pln)(?=\s|$)/giu, ' ')
      .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!title) {
      title = 'Wydatek budowlany';
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    if (amount !== null && amount > 0) {
      const category = guessExpenseCategory(title);
      return {
        type: 'ADD_EXPENSE',
        rawTranscript: transcript,
        feedbackText: `Dodano wydatek: ${title} (${amount.toFixed(2)} PLN)`,
        spokenFeedback: `Zapisano wydatek ${title} na kwotę ${amount} złotych.`,
        expensePayload: {
          title,
          amount,
          category,
        },
      };
    }
  }

  // 4. Dodawanie otworów ("dodaj okno 120 na 140", "drzwi osiemdziesiątki", "okno metr dwadzieścia na metr czterdzieści")
  const isWindow = /(?<=^|\s)(okno|okna)(?=\s|$)/iu.test(norm);
  const isDoor = /(?<=^|\s)(drzwi)(?=\s|$)/iu.test(norm);
  if (isWindow || isDoor) {
    const type = isWindow ? 'window' : 'door';
    const typeLabel = isWindow ? 'Okno' : 'Drzwi';

    // Standardowe polskie nazewnictwo skrzydeł drzwiowych na budowie (70, 80, 90, 100)
    const hasNa = /\bna\b/i.test(norm);
    if (isDoor && !hasNa) {
      if (/(?<=^|\s)(siedemdziesiątki|siedemdziesiatki|skrzydło 70|skrzydlo 70)(?=\s|$)/iu.test(norm)) {
        return {
          type: 'ADD_OPENING',
          rawTranscript: transcript,
          feedbackText: 'Dodano drzwi: 0.80m × 2.05m (skrzydło 70)',
          spokenFeedback: 'Dodano drzwi siedemdziesiątki o szerokości osiemdziesiąt centymetrów w świetle muru.',
          openingPayload: { type: 'door', typeLabel: 'Drzwi 70', width: 0.8, height: 2.05 },
        };
      }
      if (/(?<=^|\s)(osiemdziesiątki|osiemdziesiatki|skrzydło 80|skrzydlo 80)(?=\s|$)/iu.test(norm)) {
        return {
          type: 'ADD_OPENING',
          rawTranscript: transcript,
          feedbackText: 'Dodano drzwi: 0.90m × 2.05m (skrzydło 80)',
          spokenFeedback: 'Dodano drzwi osiemdziesiątki o szerokości dziewięćdziesiąt centymetrów w świetle muru.',
          openingPayload: { type: 'door', typeLabel: 'Drzwi 80', width: 0.9, height: 2.05 },
        };
      }
      if (/(?<=^|\s)(dziewięćdziesiątki|dziewiecdziesiatki|skrzydło 90|skrzydlo 90)(?=\s|$)/iu.test(norm)) {
        return {
          type: 'ADD_OPENING',
          rawTranscript: transcript,
          feedbackText: 'Dodano drzwi: 1.00m × 2.05m (skrzydło 90)',
          spokenFeedback: 'Dodano drzwi dziewięćdziesiątki o szerokości jeden metr w świetle muru.',
          openingPayload: { type: 'door', typeLabel: 'Drzwi 90', width: 1.0, height: 2.05 },
        };
      }
      if (/(?<=^|\s)(setki|skrzydło 100|skrzydlo 100)(?=\s|$)/iu.test(norm)) {
        return {
          type: 'ADD_OPENING',
          rawTranscript: transcript,
          feedbackText: 'Dodano drzwi: 1.10m × 2.05m (skrzydło 100)',
          spokenFeedback: 'Dodano drzwi setki o szerokości metr dziesięć w świetle muru.',
          openingPayload: { type: 'door', typeLabel: 'Drzwi 100', width: 1.1, height: 2.05 },
        };
      }
    }

    const match = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*na\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i);
    if (match) {
      let w = parseFloat(match[1].replace(',', '.'));
      let h = parseFloat(match[2].replace(',', '.'));
      if (w >= 30) w = w / 100;
      if (h >= 30) h = h / 100;

      return {
        type: 'ADD_OPENING',
        rawTranscript: transcript,
        feedbackText: `Dodano ${typeLabel.toLowerCase()}: ${w.toFixed(2)}m × ${h.toFixed(2)}m`,
        spokenFeedback: `Dodano ${typeLabel.toLowerCase()} o wymiarach ${w.toFixed(2)} na ${h.toFixed(2)} metra.`,
        openingPayload: {
          type,
          typeLabel,
          width: parseFloat(w.toFixed(2)),
          height: parseFloat(h.toFixed(2)),
        },
      };
    }

    // Wzorzec słowny: "metr dwadzieścia na metr czterdzieści"
    const naSplit = norm.split(/\bna\b/i);
    if (naSplit.length === 2) {
      const partW = naSplit[0].replace(/(?<=^|\s)(dodaj|okno|okna|drzwi)(?=\s|$)/giu, ' ').trim();
      const partH = naSplit[1].trim();
      const parsedW = extractDimensionMeters(partW);
      const parsedH = extractDimensionMeters(partH);

      if (parsedW !== null && parsedW > 0 && parsedH !== null && parsedH > 0) {
        return {
          type: 'ADD_OPENING',
          rawTranscript: transcript,
          feedbackText: `Dodano ${typeLabel.toLowerCase()}: ${parsedW.toFixed(2)}m × ${parsedH.toFixed(2)}m`,
          spokenFeedback: `Dodano ${typeLabel.toLowerCase()} o wymiarach ${parsedW.toFixed(2)} na ${parsedH.toFixed(2)} metra.`,
          openingPayload: {
            type,
            typeLabel,
            width: parseFloat(parsedW.toFixed(2)),
            height: parseFloat(parsedH.toFixed(2)),
          },
        };
      }
    }
  }

  // 5. Dodawanie notatek lub usterek ("notatka brak pionu", "usterka pęknięty tynk")
  if (/(?<=^|\s)(notatka|zanotuj|usterka|wada|uwaga|zapisz notatkę)(?=\s|$)/iu.test(norm)) {
    const isDefect = /(?<=^|\s)(usterka|wada|błąd|uszkodzenie|poprawka)(?=\s|$)/iu.test(norm);
    const noteText = transcript
      .replace(/(?<=^|\s)(notatka|zanotuj|usterka|wada|uwaga|zapisz notatkę|zapisz notatke|wpisz|dodaj notatkę|dodaj)(?=\s|$)/giu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (noteText) {
      return {
        type: 'ADD_NOTE',
        rawTranscript: transcript,
        feedbackText: `${isDefect ? 'Zarejestrowano usterkę' : 'Zapisano notatkę'}: "${noteText}"`,
        spokenFeedback: `${isDefect ? 'Zarejestrowano usterkę' : 'Zapisano notatkę'}.`,
        notePayload: {
          note: noteText,
          isDefect,
        },
      };
    }
  }

  // Nie rozpoznano
  return {
    type: 'UNKNOWN',
    rawTranscript: transcript,
    feedbackText: `Nie rozpoznano polecenia: "${transcript}". Spróbuj np. "szerokość 3,5" lub "wydatek 150 zł cement".`,
    spokenFeedback: 'Nie zrozumiałem polecenia. Spróbuj podać wymiar lub wydatek.',
  };
}

/**
 * Text-to-Speech (TTS) w języku polskim z bezpiecznym fallbackiem
 */
export function speakPolish(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const plVoice = voices.find((v) => v.lang.startsWith('pl'));
    if (plVoice) {
      utterance.voice = plVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS error:', err);
    onEnd?.();
  }
}

/**
 * Odtwarzanie dźwięków potwierdzających akcje głosowe (Web Audio API)
 */
export function playVoiceSoundCue(type: 'listening' | 'success' | 'error'): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'listening') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch (e) {
    // Silently ignore audio context autoplay restrictions
  }
}
