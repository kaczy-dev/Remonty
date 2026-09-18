# 📐 Permanent Directive: Full Responsiveness (Desktop & Mobile)

Każda zmiana w kodzie (HTML, CSS, JS, TS) MUSI bezwzględnie respektować zasadę podwójnej doskonałości (Dual-Tier Excellence):

## 1. Desktop (> 1024px, QHD, 4K):
- Wygląd profesjonalnego Google Maps Web: lewy panel boczny (Sidebar 380–420px) lub pływające okna detali nad mapą.
- Zero sztucznego rozciągania elementów na całą szerokość ekranu 4K/QHD (stosuj max-width i grid).
- Wsparcie dla myszy: precyzyjne hover states, płynny scroll wheel.
- Wsparcie dla klawiatury: focus rings, skróty klawiszowe (ESC, /).

## 2. Mobile (< 768px, iPhone, Android):
- Ergonomia kciuka: dolny pasek nawigacji (Bottom Nav) + wysuwany gestem Bottom Sheet (Peek/Half/Full).
- Jednostki dynamiczne: `100dvh` (brak ucinania przez chowane paski adresu Safari/Chrome).
- Bezpieczne strefy: `env(safe-area-inset-bottom)`, `env(safe-area-inset-top)`.
- Rozmiar elementów dotykowych: minimum 48×48 px.
- Zero poziomego paska przewijania (`overflow-x: hidden`).

## 3. Tablet (768px - 1024px):
- Płynny split-view lub pływający panel boczny, 2 kolumny w gridach.
