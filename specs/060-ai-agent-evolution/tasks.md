# 060 - AI Gear Agent Evolution: Implementation Plan

## Implementierungsreihenfolge

### Phase 1: Context Layer (Fundament)
1. Supabase Migration: `gear_intelligence` Tabelle + RPC-Funktionen
2. System-Prompt radikal verschlanken (von ~8.000 auf ~2.500 Tokens)
3. Enrichment-Service für Gear Cards implementieren

### Phase 2: Intelligence Layer (Klügere Tools)
4. Composite Tool: `analyzeLoadout`
5. Composite Tool: `inventoryInsights`
6. Composite Tool: `findAlternatives`
7. Composite Tool: `calculateSystemWeight`
8. Composite Tool: `checkSuitability`
9. Composite Tool: `searchGearKnowledge` (Unified Search)
10. Agent-Konfiguration: Neue Tools registrieren, alte entfernen

### Phase 3: Speed Layer (Geschwindigkeit)
11. Intent Router mit Gemini Flash implementieren
12. Parallel Pre-Fetch Pipeline implementieren
13. Chat-Route refactoren: Intent Router → Pre-Fetch → Agent
14. Fast-Path für Simple Facts (kein Sonnet nötig)

### Phase 4: Integration & Polish
15. Prompt-Builder an neue Architektur anpassen
16. Tests und Monitoring
