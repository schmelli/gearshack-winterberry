# Project Rules & Architecture (READ FIRST)

## 1. Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS (Niemals CSS Files anlegen, außer globals.css)
- **Components:** shadcn/ui (in `@/components/ui`). Erfinde keine neuen Basis-Komponenten.
- **Language:** TypeScript (Strict mode). Keine `any` Typen!

## 2. Architecture: "Feature-Sliced Light"
Wir trennen Logik strikt von UI.
- **UI Components:** Dürfen KEINE `useEffect` oder komplexe Logik enthalten. Sie erhalten Daten nur via Props.
- **Hooks:** Jede Business-Logik (Data Fetching, Berechnung) gehört in einen Custom Hook (z.B. `useProjectData.ts`).
- **Types:** Alle Daten-Modelle kommen in `@/types`.

## 3. Design System
- Nutze für Layouts immer `flex`, `grid` und Tailwind Spacing (gap-4, p-6).
- Nutze für Interaktionen die shadcn Komponenten:
  - `Card` für Container
  - `Button` für Aktionen
  - `Dialog` für Modals
  - `Sheet` für Mobile Drawers

## 4. Coding Workflow (Spec-Driven)
Bevor du Code schreibst:
1. Prüfe die Markdown-Spec im Ordner `/specs` (falls vorhanden).
2. Erstelle erst die TypeScript Interfaces (`types.ts`).
3. Erstelle dann den Logik-Hook.
4. Erstelle zum Schluss die UI-Komponente.
