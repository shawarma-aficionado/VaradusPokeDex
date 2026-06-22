# Pokémon Conviction Pokédex & Database Editor

A premium, interactive client-side Pokédex, move repository, ability log, type chart, and customized database editor built specifically for **Pokémon Conviction**.

Designed with clean GBA retro aesthetics, rich glassmorphic overlays, harmonic themed accents, and smooth pixel-art micro-animations.

---

## 🌟 Key Features

### 1. Varadus Pokédex
- **Dual Display Modes**: Toggle between an interactive pixel-art grid of cards and a detailed tabular spreadsheet view.
- **Smart Filtering & Sorting**: Filter instantly by name, ID number, or elemental type. Sort by ID order, alphabetical order, or Base Stat Total (BST).
- **Detail View Modals**: Click any Pokémon card/row to open a comprehensive details panel containing:
  - Base statistics visual bars (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed).
  - Compatibility (Egg groups) and wild encounter locations.
  - Interactive evolution chains.
  - Complete movesets grouped by learn method: Level Up (ordered by level), TM/HM machines, and Egg moves.

### 2. MoveDex (Move Repository) & Ability Log
- Complete searchable indexes of all 831 moves and 310 abilities in the database.
- **Interactive Move Learners**: Click any move in the MoveDex to open a details modal displaying:
  - Category icons (Physical, Special, Status) and type badges.
  - Move statistics (Power, Accuracy, PP) and descriptions.
  - **Learn lists**: Grouped by method (Level Up, TM/HM, Egg) showing card icons for every Pokémon that learns the move, allowing for one-click seamless navigation to that Pokémon's details.

### 3. Dynamic Type Chart Grid
- A fully responsive, structured 18x18 elemental matchup grid.
- Highlights match defense values (Super Effective `2` in green, Not Very Effective `½` in red, Immune `0` in dark grey, Neutral blank).
- Zoom scale animations on hover.

### 4. Database Editor (Admin Panel)
- Client-side database management console for administrators.
- Preconfigured administrator accounts:
  - **Username**: `WardenZero` | **Password**: `$1lv4lly`
  - **Username**: `Samudra` | **Password**: `$phe4l`
- **Dynamic Configuration Form**: Selecting any Pokémon loads its data directly into form fields to edit:
  - Name, Elemental Types, and Pokédex Description.
  - Specs (Height, Weight) and all 6 Base Stats.
  - **Wild Encounters** (comma/line-separated lists).
  - **Movesets** (Level Up lists in `level, Move Name` format, and TM/Egg moves line-separated).
- **Data Synchronization**: Saves persist in `localStorage` under `varadus_custom_pokemon_db` and immediately propagate to update all PokéDex grids, tables, detail views, and dropdown selectors.
- **Database Tools**: Includes **Reset to Default** to restore original JSON values and **Export Custom JSON** to download a compiled `pokemon.json` update payload.

### 5. Multi-Theme Engine
- Floating quick-selector in the top-right corner with persistent themes:
  - **Default**: Classic retro style.
  - **Ninth Echo**: Burgundy sidebar (`#9E1C36`), custom sidebar panel overlays, and fixed theme wallpaper.
  - **Blue Static**: Ocean blue sidebar (`#3083C6`), custom sidebar panel overlays, and fixed theme wallpaper.
  - **The State**: Midnight purple sidebar (`#25243C`), custom sidebar panel overlays, and fixed theme wallpaper.

---

## 🛠️ File Structure

```
conviction_pokedex/
│
├── data/
│   ├── pokemon.json          # Main PokéDex entries database
│   ├── moves.json            # Move specifications database
│   └── abilities.json        # Ability descriptions database
│
├── js/
│   ├── db-manager.js         # Asynchronous client-side database loader
│   └── app.js                # Core app controller, state, auth & views
│
├── assets/
│   ├── backgrounds/          # High-resolution themed wallpapers
│   ├── logo/                 # Header bar and brand logo graphics
│   ├── move_category/        # Physical/Special/Status badge icons
│   ├── pokemon_images/       # Pixel-art sprites for all 331 Pokémon
│   ├── sidebar/              # Custom menu icon sheets and panel tiles
│   └── types/                # Elemental type badges (Normal, Fire, etc.)
│
├── index.html                # Main application template
├── index.css                 # Comprehensive styling sheet
├── LICENSE                   # Project license details
└── README.md                 # Project documentation
```

---

## 🚀 Running the Project

Since the project loads databases asynchronously using the Fetch API, it must be run from a local server environment:

### Method A: VS Code Live Server (Recommended)
1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Click the **Go Live** button in the status bar at the bottom right.

### Method B: Python HTTP Server
1. Open PowerShell or Terminal in the project directory.
2. Run the command:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to `http://localhost:8000`.

### Method C: NodeJS HTTP Server
1. Run `npx http-server` in the project directory.
2. Navigate to the local address displayed.
