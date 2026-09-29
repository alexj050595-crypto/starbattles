# Star Battles

Modernes Star-Battles-Logikspiel mit Next.js, React, TypeScript und npm.

## Spielregeln

- Genau ein Stern pro Zeile
- Genau ein Stern pro Spalte
- Genau ein Stern pro Region
- Sterne dürfen sich nicht horizontal, vertikal oder diagonal berühren
- Linksklick setzt einen Stern bzw. entfernt ihn
- Rechtsklick setzt ein X als Notiz

## Features

- 1.000 deterministisch erzeugte Level
- Eindeutigkeitsprüfung des Rätsels durch einen Solver
- Vier Schwierigkeitsstufen
- Levelsuche und Levelauswahl
- Undo / Redo / Reset
- Hinweise
- Pause
- Timer
- Lokaler Spielfortschritt
- Responsive Dark UI für Desktop, Tablet und Smartphone
- Tastatur- und Screenreader-freundliche Grundstruktur

## Start

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen.

## Produktion

```bash
npm run build
npm start
```

## Architektur

- `app/` – Next.js App Router
- `components/Game.tsx` – Spieloberfläche und Interaktion
- `lib/game.ts` – Levelgenerator, Regeln und Solver

Die Level werden deterministisch aus ihrer Nummer erzeugt. Dadurch muss keine riesige statische JSON-Datei mit 1.000 Rätseln ausgeliefert werden.
