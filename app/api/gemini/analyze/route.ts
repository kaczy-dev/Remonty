import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, roomContext, mode } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        advice: 'Tryb demonstracyjny offline / Klucz API nie jest skonfigurowany. RenovAI działa w 100% lokalnie z wbudowaną bazą wiedzy budowlanej (PN-EN, ITB). Aby włączyć generowanie AI na żywo, dodaj klucz GEMINI_API_KEY w ustawieniach środowiska.',
        isFallback: true,
        metrics: {
          recommendedCureHours: 24,
          wasteMarginPercent: 12,
          qualityRiskScore: 'Niski',
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Jesteś RenovAI - elitarnym, polskim inżynierem budowlanym, rzeczoznawcą i architektem wnętrz. 
Odpowiadasz konkretnie, technicznie i z uwzględnieniem polskich norm budowlanych (PN-EN, wytycznych ITB, warunków technicznych WT 2021). 
Twoje rekomendacje zawierają:
1. Konkretne technologie (np. kleje C2TE S1, hydroizolacja 2-składnikowa, gładzie polimerowe, przewody miedziane YDYp).
2. Ostrzeżenia o błędach wykonawczych i czasach technologicznych (schnięcie jastrychów, wilgotność podłoża CM).
3. Szacunki zużycia materiałów z naddatkiem na docinki (np. 10-15%).
4. Oszacowania kosztów rynkowych w PLN (materiał + robocizna za m²).
Pisz zwięźle, w punktach, profesjonalnym językiem budowlanym.`;

    const contextStr = roomContext ? `
Kontekst pomieszczenia:
- Nazwa: ${roomContext.name} (${roomContext.type})
- Wymiary: ${roomContext.width}m x ${roomContext.length}m, wys. ${roomContext.height}m
- Powierzchnia: ${roomContext.area} m²
- Powierzchnia ścian: ${roomContext.wallArea} m²
- Wykończenie podłogi: ${roomContext.design?.floorType}
- Wykończenie ścian: ${roomContext.design?.wallType}
` : '';

    const finalPrompt = `${systemInstruction}\n${contextStr}\nTryb zapytania: ${mode || 'ogólny'}\nZapytanie użytkownika:\n${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: finalPrompt,
    });

    return NextResponse.json({
      advice: response.text || 'Brak odpowiedzi modelu.',
      isFallback: false,
    });
  } catch (error: unknown) {
    console.error('Gemini API error in /api/gemini/analyze:', error);
    const message = error instanceof Error ? error.message : 'Wystąpił błąd podczas analizy AI.';
    return NextResponse.json({
      advice: `Uwaga: Usługa AI jest chwilowo niedostępna (${message}). RenovAI kontynuuje pracę w trybie lokalnym i offline.`,
      isFallback: true,
    }, { status: 200 });
  }
}
