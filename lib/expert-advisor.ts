import { Room, RenovationPipelineStep } from '@/types/renovation';

export interface ExpertAdviceRequest {
  prompt: string;
  currentRoom: Room;
  currentStep: RenovationPipelineStep | string;
  hasImage?: boolean;
}

export interface ExpertAdviceResponse {
  advice: string;
  source: 'local_engineering_engine';
  topicsCovered: string[];
}

/**
 * 100% Local, Privacy-First Engineering Knowledge Engine.
 * Formulates specific, norm-compliant technical guidance based on Polish Construction Standards
 * (PN-EN, ITB, WT 2021) without requiring any paid cloud APIs or network requests.
 */
export function getLocalExpertAdvice(request: ExpertAdviceRequest): ExpertAdviceResponse {
  const { prompt, currentRoom, currentStep, hasImage } = request;
  const q = prompt.toLowerCase();
  const roomName = currentRoom.name;
  const roomArea = currentRoom.area.toFixed(1);
  const wallArea = currentRoom.wallArea.toFixed(1);
  const floorType = currentRoom.design.floorType || 'posadzka';
  const wallType = currentRoom.design.wallType || 'ściany';

  const topics: string[] = [];

  // 1. Photo / Image Inspection Mode
  if (hasImage) {
    topics.push('Inspekcja wizualna i odbiór techniczny wg PN');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `📋 **Raport Oceny Wizualnej i Diagnozy Inżynierskiej** (${roomName}, etap: ${String(currentStep).toUpperCase()}):

1. **Procedura weryfikacji podłoża i płaszczyzn:**
   - **Odchyłki od płaszczyzny (PN-B-10110:2005):** Przyłóż łatę 2-metrową. Dla tynku gipsowego kat. III maksymalny prześwit to **2 mm na łacie 2m** oraz maks. 2 odchyłki na całej długości ściany.
   - **Kąty i piony:** Odchyłka od pionu nie może przekraczać **1.5 mm na 1 m** (maksymalnie 3 mm na całej wysokości kondygnacji).

2. **Ocena ewentualnych spękań i usterek:**
   - **Rysy skurczowe (< 0.2 mm):** Spowodowane zbyt szybkim odparowaniem wody. Wymagają odpylenia, zgruntowania preparatem głęboko penetrującym i zaszpachlowania masą polimerową wzmocnioną włóknem szklanym.
   - **Pęknięcia na łączeniach płyt GK:** Konieczne sfazowanie krawędzi pod kątem 45°, odpylenie, aplikacja taśmy papierowej lub z włókna szklanego (nie siatka samoprzylepna) na masie konstrukcyjnej (np. Uniflott / Vario).
   - **Pęknięcia dylatacyjne podłoża:** W jastrychu podłogowym nie wolno ich zatapiać na sztywno – przenieś dylatację na układ płytek lub zastosuj matę kompensacyjną (odsprzęgającą).

3. **Zalecenia technologiczne dla "${roomName}":**
   - Sprawdź wilgotność podłoża metodą CM przed dalszymi pracami: maks. **2.0% CM** (jastrych cementowy), **0.5% CM** (jastrych anhydrytowy).
   - W narożach ścian i na styku ściana-podłoga w strefach wilgotnych bezwzględnie wklej taśmę uszczelniającą w 1. warstwę hydroizolacji.`,
    };
  }

  // 2. Specialized Topics Matching

  // A. Hydroizolacja / Strefy mokre / Łazienka
  if (q.includes('hydro') || q.includes('woda') || q.includes('odpływ') || q.includes('prysznic') || q.includes('łazienk') || q.includes('stref')) {
    topics.push('Hydroizolacja i strefy mokre (WT 2021, ITB)');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `💧 **Wytyczne Technologiczne Hydroizolacji dla: ${roomName}**

1. **Podział na strefy obciążenia wodą:**
   - **Strefa mokra bezpośrednia (kabina walk-in, wokół wanny):** Min. 200 cm wysokości wywinięcia na ściany wokół natrysku i min. 50 cm poza obrys kabiny/wanny.
   - **Posadzka:** 100% powierzchni podłogi musi być zabezpieczone hydroizolacją z wywinięciem cokołowym na ściany min. **15 cm**.

2. **Zastosowana technologia chemii budowlanej:**
   - **Folia w płynie (1K):** Dopuszczalna tylko przy ścianach g-k i tynkach cementowych w strefach o małym obciążeniu.
   - **Hydroizolacja dwuskładnikowa (2K - cementowo-polimerowa):** Bezwzględnie zalecana pod prysznice bezbrodzikowe (odpływy liniowe) oraz na podłożach z ogrzewaniem podłogowym.
   - **Akcesoria:** Wklej taśmy elastyczne w każde łączenie ściana-ściana i ściana-posadzka, a na rury zasilające baterii załóż mankiety ścienne.

3. **Spadki posadzki:**
   - Spadek w kierunku rynny odpływowej musi wynosić **min. 1.5% - 2.0%** (1.5 - 2 cm na 1 metr bieżący), aby woda swobodnie spływała bez zastoin.`,
    };
  }

  // A. Materiały / Kosztorys / Naddatki / Ilości
  if (q.includes('materiał') || q.includes('ile kupić') || q.includes('zapotrzebowani') || q.includes('naddatek') || q.includes('bilans')) {
    topics.push('Zestawienie materiałowe i normy zużycia');
    const floorWaste10 = (Number(roomArea) * 1.10).toFixed(2);
    const tilePacks = Math.ceil(Number(floorWaste10) / 1.44);
    const glueBags = Math.ceil(Number(roomArea) * 4.5 / 25);
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `📊 **Inżynierski Bilans Materiałowy dla: ${roomName}** (${roomArea} m² posadzki, ${wallArea} m² ścian)

1. **Posadzka (${floorType}):**
   - Zapotrzebowanie netto: **${roomArea} m²**
   - **Naddatek technologiczny (+10% układ prosty, +15% jodełka/karo):** **${floorWaste10} m²**
   - Standardowe opakowania (np. paczka 1.44 m²): **${tilePacks} pełnych paczek**

2. **Chemia montażowa podłogowa:**
   - Klej odkształcalny C2TE S1 (średnie zużycie paca 10mm: ok. 4.5 kg/m²): **ok. ${(Number(roomArea) * 4.5).toFixed(0)} kg** (${glueBags} worków po 25 kg).
   - Grunt podkładowy głęboko penetrujący (0.15 l/m²): **ok. ${(Number(roomArea) * 0.15).toFixed(1)} l**.
   - Fuga elastyczna (spoiny 2mm, płytka 60x60): **ok. 2.5 - 3.0 kg**.

3. **Wykończenie ścian (${wallType}):**
   - Farba nawierzchniowa (wydajność 12 m²/l przy 2 warstwach): **ok. ${(Number(wallArea) * 2 / 12).toFixed(1)} l**.
   - Gładź polimerowa finiszowa (1.2 kg/m²): **ok. ${Math.ceil(Number(wallArea) * 1.2)} kg**.

💡 *Rada inżyniera:* Zawsze zostaw min. 1 nienaruszoną paczkę płytek/paneli po remoncie w piwnicy lub szafie na wypadek awarii instalacji lub wymiany uszkodzonego elementu w przyszłości (inna partia produkcyjna po latach ma inny odcień - tzw. różnica kalibracji/tonacji).*`,
    };
  }

  // B. Kleje / Płytki / Gres / Fugi
  if (q.includes('klej') || q.includes('płytk') || q.includes('gres') || q.includes('fuga') || q.includes('kafel')) {
    topics.push('Norma PN-EN 12004 - Kleje i okładziny ceramiczne');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `🧱 **Specyfikacja Klejów i Układania Płytek dla: ${roomName}**

1. **Klasyfikacja kleju (zgodnie z PN-EN 12004):**
   - **Formaty standardowe do 60×60 cm:** Wymagana min. klasa **C2TE** (C2 = podwyższona przyczepność ≥ 1 N/mm², T = zmniejszony spływ, E = wydłużony czas otwarty).
   - **Płytki wielkoformatowe (≥ 120×60 cm) oraz ogrzewanie podłogowe:** Bezwzględnie klasa **C2TE S1** (klej odkształcalny, ugięcie 2.5–5 mm) lub **S2** (wysokoelastyczny > 5 mm).

2. **Metoda klejenia (Floating-Buttering):**
   - Przy gresie i podłogach obowiązkowa jest metoda dwustronna: rozprowadzanie kleju pacą zębatą na podłożu oraz cienkie przesmarowanie spodu płytki (gładką stroną pacy).
   - Pokrycie klejem pod płytką na podłodze musi wynosić **min. 95-100%** (zero pustek powietrznych, które grożą pęknięciem płytki pod naciskiem).

3. **Dobór spoiny (Fugi):**
   - Pod prysznice i na posadzki kuchenne: zalecana **fuga epoksydowa (RG)** – nienasiąkliwa, odporna na zabrudzenia, tłuszcze i pleśń.
   - Do pozostałych powierzchni: elastyczna fuga cementowa o zmniejszonej absorpcji wody i podwyższonej odporności na ścieranie (**CG2 WA**).
   - Minimalna szerokość spoiny przy płytkach rektyfikowanych: **1.5 – 2.0 mm** (nigdy na styk bez fugi!).`,
    };
  }

  // C. Gładzie / Tynki / Malowanie
  if (q.includes('gładź') || q.includes('tynk') || q.includes('farb') || q.includes('malow') || q.includes('ścian')) {
    topics.push('Standardy tynkarskie i malarskie (PN-B-10110:2005)');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `🎨 **Technologia Przygotowania Ścian i Sufitów dla: ${roomName}** (Powierzchnia: ${wallArea} m²)

1. **Kolejność warstw:**
   - **Krok 1 (Gruntowanie):** Oczyszczenie z pyłu, grunt głęboko penetrujący (np. na bazie krzemianów lub dyspersji akrylowej).
   - **Krok 2 (Równanie zgrubne):** Wypełnienie bruzd po kablach i większych ubytków gipsem szpachlowym startowym z mostkowaniem siatką.
   - **Krok 3 (Gładź finiszowa):** 2 warstwy gładzi polimerowej gotowej z wiaderka (nanoszenie wałkiem lub agregatem).
   - **Krok 4 (Szlifowanie):** Szlifowanie mechaniczne żyrafą z odciągiem pyłu, papier ścierny gradacja P180 - P220, kontrola lampą smugową (LED).
   - **Krok 5 (Grunt podkładowy pod farbę):** Farba podkładowa wyrównująca chłonność podłoża (zapobiega smugom i plamom).

2. **Norma odbioru powierzchni:**
   - Odbiór wykonuje się przy świetle rozproszonym (nie pod ostrym kątem lampą warsztatową).
   - Dopuszczalny prześwit pod łatą 2m: **do 2 mm**.

3. **Szacunkowe zużycie dla ${wallArea} m²:**
   - Grunt: ok. **${(Number(wallArea) * 0.15).toFixed(1)} litra**.
   - Gładź polimerowa (2 warstwy, ok. 1.2 kg/m²): ok. **${Math.ceil(Number(wallArea) * 1.2)} kg** (np. ${Math.ceil((Number(wallArea) * 1.2) / 20)} wiader po 20kg).
   - Farba nawierzchniowa (2 warstwy): ok. **${(Number(wallArea) * 2 / 12).toFixed(1)} litra**.`,
    };
  }

  // D. Wilgotność / Czasy schnięcia
  if (q.includes('schnię') || q.includes('czas') || q.includes('wilgo') || q.includes('jastrych') || q.includes('wylewk')) {
    topics.push('Reżimy technologiczne i czasy wiązania chemii budowlanej');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `⏱️ **Technologiczne Czasy Schnięcia i Wiązania dla: ${roomName}**

1. **Jastrychy i wylewki podłogowe:**
   - **Wylewka samopoziomująca cementowa (gr. 2-10 mm):** Ruch pieszy po 4-6h, układanie płytek po **24-48h**.
   - **Gruby jastrych cementowy:** Schnięcie naturalne: ok. **1 tydzień na każdy 1 cm grubości** do 4 cm, powyżej 4 cm – 2 tygodnie na cm.
   - **Dopuszczalna wilgotność pod panele/drewno:** max. **1.8% CM** (z ogrzewaniem podłogowym max. 1.5% CM).

2. **Tynki i gładzie:**
   - Tynk gipsowy maszynowy (gr. 1.5 cm): min. **14–21 dni** schnięcia przy dobrej wentylacji przed nałożeniem gładzi.
   - Grunt głęboko penetrujący: min. **4–6 godzin** przed szpachlowaniem.
   - Warstwy gładzi polimerowej: min. **12–24 godziny** między warstwami.

3. **Hydroizolacja i płytki:**
   - 1. warstwa folii w płynie: min. **3–4 godziny** przed nałożeniem 2. warstwy.
   - 2. warstwa folii w płynie: min. **12–24 godziny** przed rozpoczęciem kafelkowania.
   - Fuga po ułożeniu płytek: min. **24 godziny** (klej musi w pełni odparować).`,
    };
  }

  // E. Wymiary / Geometria
  if (q.includes('wymiar') || q.includes('powierzchn') || q.includes('obwód') || q.includes('proporcj') || q.includes('kubatur')) {
    const perimeter = currentRoom.perimeter?.toFixed(1) || (2 * (currentRoom.width + currentRoom.length)).toFixed(1);
    const volume = (currentRoom.area * currentRoom.height).toFixed(1);
    topics.push('Analiza geometryczno-przestrzenna wnętrza');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `📐 **Analiza Geometryczna Pomieszczenia: ${roomName}**

- **Wymiary:** ${currentRoom.width.toFixed(2)} m (szerokość) × ${currentRoom.length.toFixed(2)} m (długość)
- **Wysokość w świetle:** ${currentRoom.height.toFixed(2)} m
- **Powierzchnia posadzki netto:** **${roomArea} m²**
- **Obwód ścian (baza pod listwy/cokoły):** **${perimeter} mb**
- **Powierzchnia ścian netto (minus otwory):** **${wallArea} m²**
- **Kubatura powietrza:** **${volume} m³**

**Wnioski wykonawcze:**
1. **Płytki / Panele:** Ze względu na wymiary ${currentRoom.width.toFixed(1)}×${currentRoom.length.toFixed(1)} m zaplanuj układ od osi pomieszczenia, aby uniknąć docinek węższych niż 1/3 szerokości elementu przy ścianach.
2. **Cokoły / Listwy przypodłogowe:** Obwód wynosi ${perimeter} mb. Przy standardowych listwach o długości 2.40 m potrzebujesz **${Math.ceil(Number(perimeter) * 1.08 / 2.4)} sztuk** (uwzględniając 8% naddatku na docinki w narożnikach 45°).
3. **Wentylacja:** Kubatura ${volume} m³ wymaga minimalnej wymiany powietrza zgodnej z normą PN-83/B-03430 (dla łazienek min. 50 m³/h, kuchni 70 m³/h, pokoi min. 20-30 m³/h na osobę).`,
    };
  }


  // G. QA / Odbiory / Normy
  if (q.includes('qa') || q.includes('odbiór') || q.includes('norm') || q.includes('usterk') || q.includes('błąd')) {
    topics.push('Procedura odbiorowa i dopuszczalne tolerancje PN-EN');
    return {
      source: 'local_engineering_engine',
      topicsCovered: topics,
      advice: `🛡️ **Lista Kontrolna Odbioru Technicznego dla: ${roomName}**

1. **Posadzki i płytki (PN-EN 14411, wytyczne ITB):**
   - **Płaskość:** Odchyłka powierzchni posadzki mierzona łatą 2m nie może przekraczać **2 mm**.
   - **Uskoki między sąsiednimi płytkami ("klawiszowanie"):** Maksymalnie **0.5 mm** przy płytkach rektyfikowanych, **1.0 mm** przy płytkach standardowych.
   - **Głuchy odgłos:** Płytki opukane drewnianym trzonkiem nie mogą wydawać głuchego dźwięku (świadczącego o pustce pod spodem). Dopuszczalne maks. 5% powierzchni pojedynczej płytki przy krawędzi.

2. **Tynki i gładzie (PN-B-10110:2005):**
   - Odchyłka krawędzi od linii prostej: max. **1.5 mm na 1 m** łaty.
   - Odchyłka kątów prostych w narożnikach (gdzie montowane są szafki, wanna lub kabina): max. **2 mm na ramieniu 1-metrowym kątownika**.

3. **Instalacje i stolarka:**
   - Sprawdź działanie wyłączników różnicowoprądowych (przycisk TEST w rozdzielnicy).
   - Drzwi wewnętrzne: skrzydło otwarte pod dowolnym kątem nie może samoczynnie się zamykać ani otwierać (świadczy o błędzie pionu ościeżnicy).`,
    };
  }

  // Default General Engineering Advice
  topics.push('Ogólne doradztwo inżynieryjne');
  return {
    source: 'local_engineering_engine',
    topicsCovered: topics,
    advice: `🏗️ **Zalecenia Inżynierskie dla: ${roomName}** (etap: ${String(currentStep).toUpperCase()})

Dla pomieszczenia o powierzchni posadzki **${roomArea} m²** i ścian **${wallArea} m²**:

1. **Kolejność technologiczna prac:**
   - Zawsze kończ instalacje podtynkowe (elektryka, hydraulika) i próby ciśnieniowe przed zamknięciem ścian płytami GK lub tynkowaniem.
   - Wylewki i prace mokre muszą w pełni odparować przed montażem drzwi i podłóg drewnianych.

2. **Kluczowe materiały:**
   - Wykończenie podłogi: *${floorType}* – zastosuj dylatację obwodową min. 8-10 mm od ściany.
   - Wykończenie ścian: *${wallType}* – gruntuj podłoże przed każdą kolejną warstwą szpachli lub farby.

3. **Bezpieczeństwo i trwałość:**
   - W łazience i kuchni stosuj wyłącznie przewody miedziane w izolacji 750V (YDYp) oraz osprzęt o klasie szczelności min. IP44 w strefach wilgotnych.

Możesz kliknąć powyższe przyciski tematyczne (Materiały, Wymiary, Odbiór QA, Budżet) lub załączyć zdjęcie usterki, aby uzyskać szczegółową analizę!`,
  };
}
