// Main App Orchestration and State
let db = { pokemon: [], moves: [], abilities: [] };
let currentTab = 'pokedex';
let dexViewMode = 'grid'; // 'grid' or 'table'
let currentDetailPokemon = null;
let currentDetailTab = 'stats';
let currentUser = null;

// Pokémon Type Chart Definition
const TYPES = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
  "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
  "Rock", "Ghost", "Dragon", "Steel", "Fairy", "Dark"
];

const TYPE_MATRIX = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Steel: 2, Fairy: 0.5, Dark: 2 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5, Fairy: 0.5, Dark: 2 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Steel: { Fire: 0.5, Water: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Steel: 0.5, Dark: 2 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Fairy: 0.5, Dark: 0.5 }
};

function getTypeEffectiveness(attacker, defender) {
  if (!attacker || !defender) return 1;
  if (TYPE_MATRIX[attacker] && TYPE_MATRIX[attacker][defender] !== undefined) {
    return TYPE_MATRIX[attacker][defender];
  }
  return 1;
}


// Page lifecycle
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Theme
  initTheme();

  // Initialize Users Database
  initUsersDb();

  // Bind tab switching
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Load Database and Initialize
  await initApp();
});

// Toast notification helper
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toast-icon");
  const msgEl = document.getElementById("toast-msg");

  if (!toast || !icon || !msgEl) return;

  msgEl.textContent = message;
  toast.className = `toast show ${type}`;

  // Set Icon
  if (type === "success") {
    icon.className = "fa-solid fa-circle-check";
  } else if (type === "error") {
    icon.className = "fa-solid fa-triangle-exclamation";
  } else {
    icon.className = "fa-solid fa-circle-info";
  }

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Initialize Application Databases & Render
async function initApp() {
  try {
    db = await loadDatabases();

    // Check for customized Pokemon database in localStorage
    const customPoke = localStorage.getItem("varadus_custom_pokemon_db");
    if (customPoke) {
      try {
        db.pokemon = JSON.parse(customPoke);
        console.log("Loaded customized Pokemon database from localStorage.");
      } catch (e) {
        console.error("Failed to parse custom Pokemon DB, falling back to default.", e);
      }
    }

    // Render lists
    renderPokedex();
    renderMovesList();
    renderAbilitiesList();
    renderTypeChart();

    // Initialize search bindings
    filterPokemon();
    filterMoves();
    filterAbilities();

  } catch (err) {
    console.error("App Init Error:", err);
    showToast("Error loading game database.", "error");
  }
}

// Switch Sidebar Tabs
function switchTab(tabId) {
  currentTab = tabId;

  // Toggle active tab link
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Toggle visible tab panel
  const panels = document.querySelectorAll(".tab-panel");
  panels.forEach(panel => {
    if (panel.id === tabId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  if (tabId === 'dbeditor') {
    checkAuthAndToggleView();
  }
}

// Get Official Artwork URL or fallback
function getPokemonImage(poke) {
  if (poke && poke.internal_name) {
    return `assets/pokemon_images/${poke.internal_name}.png`;
  }
  return 'assets/pokemon_images/000.png';
}

// Render Pokédex list (Grid & Table views)
function renderPokedex() {
  const gridContainer = document.getElementById("pokemon-grid-container");
  const tableBody = document.getElementById("pokemon-table-body");

  if (!gridContainer || !tableBody) return;

  gridContainer.innerHTML = "";
  tableBody.innerHTML = "";

  db.pokemon.forEach(poke => {
    const bst = poke.hp + poke.atk + poke.def + poke.spa + poke.spd + poke.spe;
    const imgUrl = getPokemonImage(poke);

    // ================= GRID VIEW CARD =================
    const card = document.createElement("div");
    card.className = "pokemon-card";
    card.setAttribute("data-id", poke.id);
    card.onclick = () => openPokeDetailModal(poke.id);

    // Set type color border
    card.style.setProperty('--type-normal', `var(--type-${poke.type1.toLowerCase()})`);

    const idLabel = document.createElement("div");
    idLabel.className = "pokemon-card-id";
    idLabel.textContent = `#${String(poke.id).padStart(3, '0')}`;
    card.appendChild(idLabel);

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "pokemon-card-image";
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = poke.name;
    img.loading = "lazy";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);

    // ── Info row: Name · Types · BST ──
    const infoRow = document.createElement("div");
    infoRow.className = "pokemon-card-info-row";

    const nameWrapper = document.createElement("div");
    nameWrapper.style.display = "flex";
    nameWrapper.style.alignItems = "center";
    nameWrapper.style.gap = "6px";

    const name = document.createElement("span");
    name.className = "pokemon-card-name";
    name.textContent = poke.name;
    nameWrapper.appendChild(name);

    const badgeContainer = document.createElement("div");
    badgeContainer.className = "type-badge-container";
    badgeContainer.style.gap = "4px";
    badgeContainer.style.width = "auto";
    badgeContainer.style.justifyContent = "flex-start";

    const badge1 = document.createElement("img");
    badge1.className = "type-badge-img";
    badge1.src = `assets/types/${poke.type1.toLowerCase()}.png`;
    badge1.alt = poke.type1;
    badge1.title = poke.type1;
    badgeContainer.appendChild(badge1);

    if (poke.type2) {
      const badge2 = document.createElement("img");
      badge2.className = "type-badge-img";
      badge2.src = `assets/types/${poke.type2.toLowerCase()}.png`;
      badge2.alt = poke.type2;
      badge2.title = poke.type2;
      badgeContainer.appendChild(badge2);
    }
    nameWrapper.appendChild(badgeContainer);
    infoRow.appendChild(nameWrapper);

    const bstPill = document.createElement("div");
    bstPill.className = "pokemon-card-bst";
    bstPill.textContent = `BST ${bst}`;
    infoRow.appendChild(bstPill);

    card.appendChild(infoRow);
    gridContainer.appendChild(card);

    // ================= TABLE VIEW ROW =================
    const row = document.createElement("tr");
    row.onclick = () => openPokeDetailModal(poke.id);

    row.innerHTML = `
      <td>#${String(poke.id).padStart(3, '0')}</td>
      <td>
        <img src="${imgUrl}" class="dex-table-img" alt="${poke.name}">
        <strong>${poke.name}</strong>
      </td>
      <td>
        <img class="type-badge-img" src="assets/types/${poke.type1.toLowerCase()}.png" alt="${poke.type1}" title="${poke.type1}">
        ${poke.type2 ? `<img class="type-badge-img" src="assets/types/${poke.type2.toLowerCase()}.png" alt="${poke.type2}" title="${poke.type2}">` : ''}
      </td>
      <td>${poke.hp}</td>
      <td>${poke.atk}</td>
      <td>${poke.def}</td>
      <td>${poke.spa}</td>
      <td>${poke.spd}</td>
      <td>${poke.spe}</td>
      <td><strong>${bst}</strong></td>
    `;
    tableBody.appendChild(row);
  });
}

// Toggle grid/table views in Pokedex
function setDexView(mode) {
  dexViewMode = mode;
  const gridContainer = document.getElementById("pokemon-grid-container");
  const tableContainer = document.getElementById("pokemon-table-container");
  const btnGrid = document.getElementById("btn-view-grid");
  const btnTable = document.getElementById("btn-view-table");

  if (mode === 'grid') {
    gridContainer.style.display = "grid";
    tableContainer.style.display = "none";
    btnGrid.classList.add("active");
    btnTable.classList.remove("active");
  } else {
    gridContainer.style.display = "none";
    tableContainer.style.display = "block";
    btnGrid.classList.remove("active");
    btnTable.classList.add("active");
  }
}

// Render Moves Dex tab table
function renderMovesList() {
  const tbody = document.getElementById("moves-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  db.moves.forEach(move => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    row.onclick = () => openMoveDetailModal(move.name);

    const catIcon = `<img class="move-cat-img" src="assets/move_category/move-${move.category.toLowerCase()}.png" alt="${move.category}" title="${move.category}">`;

    row.innerHTML = `
      <td><strong>${move.name}</strong></td>
      <td>
        <img class="type-badge-img" src="assets/types/${move.type.toLowerCase()}.png" alt="${move.type}" title="${move.type}">
      </td>
      <td>${catIcon}</td>
      <td>${move.power > 0 ? move.power : '--'}</td>
      <td>${move.accuracy > 0 ? move.accuracy + '%' : '--'}</td>
      <td>${move.pp}</td>
      <td style="color: var(--text-secondary); max-width: 300px; font-size: 13px;">${move.description}</td>
    `;
    tbody.appendChild(row);
  });
}

// Render Abilities Dex tab table
function renderAbilitiesList() {
  const tbody = document.getElementById("abilities-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  db.abilities.forEach(abil => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${abil.name}</strong></td>
      <td style="color: var(--text-secondary); font-size: 13px;">${abil.description}</td>
    `;
    tbody.appendChild(row);
  });
}

// Render dynamic interactive type chart matrix
function renderTypeChart() {
  const table = document.getElementById("typechart-table");
  if (!table) return;

  table.innerHTML = "";

  // Head row (Defenders)
  let headHtml = "<tr><th class=\"corner-cell\">ATK<br>&darr;<br><br>DEF<br>&rarr;</th>";
  TYPES.forEach(type => {
    headHtml += `<th class="col-header"><img class="type-badge-img" src="assets/types/${type.toLowerCase()}.png" alt="${type}" title="${type}"></th>`;
  });
  headHtml += "</tr>";

  let bodyHtml = "";

  // Attacking Rows
  TYPES.forEach(atkType => {
    let rowHtml = `<tr><td class="row-header"><img class="type-badge-img" src="assets/types/${atkType.toLowerCase()}.png" alt="${atkType}" title="${atkType}"></td>`;
    TYPES.forEach(defType => {
      const mult = getTypeEffectiveness(atkType, defType);
      let cellText = "";
      let cellClass = "";

      if (mult === 2) {
        cellText = "2";
        cellClass = "tc-super";
      } else if (mult === 0.5) {
        cellText = "&frac12;";
        cellClass = "tc-half";
      } else if (mult === 0) {
        cellText = "0";
        cellClass = "tc-zero";
      } else {
        cellText = "";
        cellClass = "tc-neutral";
      }

      rowHtml += `<td class="${cellClass}">${cellText}</td>`;
    });
    rowHtml += "</tr>";
    bodyHtml += rowHtml;
  });

  table.innerHTML = headHtml + bodyHtml;
}


// Filter PokéDex
function filterPokemon() {
  const query = document.getElementById("poke-search").value.toLowerCase();
  const selectedType = document.getElementById("filter-type").value;
  const sortBy = document.getElementById("filter-sort").value;

  const cardElements = document.querySelectorAll("#pokemon-grid-container .pokemon-card");
  const tableRows = document.querySelectorAll("#pokemon-table-body tr");

  // Load standard lists and perform sorting
  let filtered = [...db.pokemon];

  // 1. Search Query
  if (query) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || String(p.id).includes(query));
  }

  // 2. Type Filter
  if (selectedType) {
    filtered = filtered.filter(p => p.type1 === selectedType || p.type2 === selectedType);
  }

  // 3. Sort Order
  if (sortBy === 'id-asc') {
    filtered.sort((a, b) => a.id - b.id);
  } else if (sortBy === 'id-desc') {
    filtered.sort((a, b) => b.id - a.id);
  } else if (sortBy === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'name-desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortBy === 'bst-desc') {
    filtered.sort((a, b) => calculateBST(b) - calculateBST(a));
  } else if (sortBy === 'bst-asc') {
    filtered.sort((a, b) => calculateBST(a) - calculateBST(b));
  }

  // Update DOM visible states
  const filteredIds = new Set(filtered.map(p => p.id));

  cardElements.forEach(card => {
    const id = parseInt(card.getAttribute("data-id"));
    card.style.display = filteredIds.has(id) ? "flex" : "none";
  });

  // Table rows map sequentially in the same order as in rendering
  // To avoid DOM mismatch, we'll re-render the rows in sorted order if query/sort happens
  // Wait, let's keep it simple: filter the display of table rows.
  // Table rows might be in standard order but we can show/hide them.
  tableRows.forEach(row => {
    // extract ID from first column
    const idText = row.cells[0].textContent.replace('#', '');
    const id = parseInt(idText);
    row.style.display = filteredIds.has(id) ? "table-row" : "none";
  });
}

function calculateBST(poke) {
  return poke.hp + poke.atk + poke.def + poke.spa + poke.spd + poke.spe;
}

// Filter Moves Dex
function filterMoves() {
  const query = document.getElementById("move-search").value.toLowerCase();
  const typeFilter = document.getElementById("filter-move-type").value;
  const catFilter = document.getElementById("filter-move-cat").value;

  const rows = document.querySelectorAll("#moves-table-body tr");

  rows.forEach((row, idx) => {
    const moveData = db.moves[idx];
    if (!moveData) return;

    let matchesSearch = moveData.name.toLowerCase().includes(query) || moveData.description.toLowerCase().includes(query);
    let matchesType = !typeFilter || moveData.type === typeFilter;
    let matchesCat = !catFilter || moveData.category === catFilter;

    if (matchesSearch && matchesType && matchesCat) {
      row.style.display = "table-row";
    } else {
      row.style.display = "none";
    }
  });
}

// Filter Abilities Dex
function filterAbilities() {
  const query = document.getElementById("ability-search").value.toLowerCase();
  const rows = document.querySelectorAll("#abilities-table-body tr");

  rows.forEach((row, idx) => {
    const abilData = db.abilities[idx];
    if (!abilData) return;

    let matches = abilData.name.toLowerCase().includes(query) || abilData.description.toLowerCase().includes(query);
    row.style.display = matches ? "table-row" : "none";
  });
}

// ================= POKEMON DETAIL MODAL LOGIC =================
function openPokeDetailModal(id) {
  const pokemon = db.pokemon.find(p => p.id === id);
  if (!pokemon) return;

  currentDetailPokemon = pokemon;

  // Set texts
  document.getElementById("detail-number").textContent = `#${String(pokemon.id).padStart(3, '0')}`;
  document.getElementById("detail-name").textContent = pokemon.name;
  document.getElementById("detail-description").textContent = pokemon.description || "No registry entry.";
  document.getElementById("detail-height").textContent = `${pokemon.height || '--'} m`;
  document.getElementById("detail-weight").textContent = `${pokemon.weight || '--'} kg`;
  document.getElementById("detail-egg-groups").textContent = pokemon.compatibility ? pokemon.compatibility.join(', ') : "Undiscovered";
  document.getElementById("detail-encounters").textContent = pokemon.encounters ? pokemon.encounters.join(', ') : "Not in wild";

  // Image
  document.getElementById("detail-image").src = getPokemonImage(pokemon);

  // Render Types
  const typesContainer = document.getElementById("detail-types");
  typesContainer.innerHTML = `
    <img class="type-badge-img" src="assets/types/${pokemon.type1.toLowerCase()}.png" alt="${pokemon.type1}" title="${pokemon.type1}">
    ${pokemon.type2 ? `<img class="type-badge-img" src="assets/types/${pokemon.type2.toLowerCase()}.png" alt="${pokemon.type2}" title="${pokemon.type2}">` : ''}
  `;

  // Render Stats
  renderStatsPanel(pokemon);

  // Render Learnsets
  renderLearnsets(pokemon);

  // Render Evolution Chain
  renderEvolutionChain(pokemon);

  // Reset tab to base stats
  switchDetailTab('stats');

  // Open Modal
  document.getElementById("poke-detail-modal").classList.add("active");
}

function closePokeDetailModal(e) {
  document.getElementById("poke-detail-modal").classList.remove("active");
  currentDetailPokemon = null;
}

function renderStatsPanel(poke) {
  const container = document.getElementById("detail-stats-container");
  if (!container) return;

  const stats = [
    { label: "HP", key: "hp", fill: "#39ff14" },
    { label: "Attack", key: "atk", fill: "#ff5722" },
    { label: "Defense", key: "def", fill: "#fbc02d" },
    { label: "Sp. Atk", key: "spa", fill: "#00f0ff" },
    { label: "Sp. Def", key: "spd", fill: "#9c27b0" },
    { label: "Speed", key: "spe", fill: "#e91e63" }
  ];

  let bst = 0;
  let html = "";

  stats.forEach(st => {
    const val = poke[st.key] || 0;
    bst += val;
    // Base stats max usually 255
    const percent = Math.min((val / 255) * 100, 100);

    html += `
      <div class="stat-row">
        <span class="stat-name">${st.label}</span>
        <span class="stat-val">${val}</span>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width: ${percent}%; background-color: ${st.fill};"></div>
        </div>
      </div>
    `;
  });

  html += `
    <div class="bst-row">
      <span class="bst-title">Base Stat Total (BST)</span>
      <span class="bst-val">${bst}</span>
    </div>
  `;

  container.innerHTML = html;
}

function renderLearnsets(poke) {
  const levelupTbody = document.getElementById("detail-moves-levelup");
  const tmTbody = document.getElementById("detail-moves-tm");
  const eggTbody = document.getElementById("detail-moves-egg");

  levelupTbody.innerHTML = "";
  tmTbody.innerHTML = "";
  eggTbody.innerHTML = "";

  const moves = poke.moves || {};

  // Level Up Learnset
  if (moves.levelUp && moves.levelUp.length > 0) {
    moves.levelUp.forEach(entry => {
      const move = db.moves.find(m => m.name.toLowerCase() === entry.move.toLowerCase());
      if (move) {
        levelupTbody.appendChild(createMoveRow(move, entry.level));
      } else {
        levelupTbody.innerHTML += `<tr><td>${entry.level}</td><td><strong>${entry.move}</strong></td><td colspan="4" style="color: var(--text-muted);">Details unregistered</td></tr>`;
      }
    });
  } else {
    levelupTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted)">No level up moves registered.</td></tr>';
  }

  // TMs Learnset
  if (moves.tm && moves.tm.length > 0) {
    moves.tm.forEach(moveName => {
      const move = db.moves.find(m => m.name.toLowerCase() === moveName.toLowerCase());
      if (move) {
        tmTbody.appendChild(createMoveRow(move));
      } else {
        tmTbody.innerHTML += `<tr><td><strong>${moveName}</strong></td><td colspan="4" style="color: var(--text-muted);">Details unregistered</td></tr>`;
      }
    });
  } else {
    tmTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No machine moves registered.</td></tr>';
  }

  // Egg Learnset
  if (moves.egg && moves.egg.length > 0) {
    moves.egg.forEach(moveName => {
      const move = db.moves.find(m => m.name.toLowerCase() === moveName.toLowerCase());
      if (move) {
        eggTbody.appendChild(createMoveRow(move));
      } else {
        eggTbody.innerHTML += `<tr><td><strong>${moveName}</strong></td><td colspan="4" style="color: var(--text-muted);">Details unregistered</td></tr>`;
      }
    });
  } else {
    eggTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No egg moves registered.</td></tr>';
  }
}

function createMoveRow(move, level = null) {
  const row = document.createElement("tr");

  const catIcon = `<img class="move-cat-img" src="assets/move_category/move-${move.category.toLowerCase()}.png" alt="${move.category}" title="${move.category}">`;

  let html = "";
  if (level !== null) {
    html += `<td>${level}</td>`;
  }

  html += `
    <td><strong>${move.name}</strong></td>
    <td><img class="type-badge-img" src="assets/types/${move.type.toLowerCase()}.png" alt="${move.type}" title="${move.type}"></td>
    <td>${catIcon}</td>
    <td>${move.power > 0 ? move.power : '--'}</td>
    <td>${move.accuracy > 0 ? move.accuracy + '%' : '--'}</td>
  `;

  row.innerHTML = html;
  return row;
}

// Render dynamic evolution path visualizer
function renderEvolutionChain(poke) {
  const container = document.getElementById("detail-evo-chain");
  if (!container) return;

  container.innerHTML = "";

  // Draw simple visual evolution path
  // Find standard evolution roots
  // Since our local JSON database evolution is formatted as: evolutions: [{level: 16, to: "Ivysaur"}]
  // We can trace a single step easily. Let's trace forward or check if this Pokémon has a root.
  // Simple tracing:
  let chain = [];

  // Try to find if this Pokémon evolves FROM something (pre-evolution)
  const preEvo = db.pokemon.find(p => p.evolutions && p.evolutions.some(e => e.to.toLowerCase() === poke.name.toLowerCase()));

  let firstNode = null;
  let secondNode = null;
  let thirdNode = null;

  if (preEvo) {
    // Is there a pre-pre evolution? (e.g. Charmander for Charmeleon)
    const prePreEvo = db.pokemon.find(p => p.evolutions && p.evolutions.some(e => e.to.toLowerCase() === preEvo.name.toLowerCase()));
    if (prePreEvo) {
      firstNode = prePreEvo;
      secondNode = preEvo;
      thirdNode = poke;
    } else {
      firstNode = preEvo;
      secondNode = poke;
      // Does poke evolve further?
      if (poke.evolutions && poke.evolutions.length > 0) {
        const nextName = poke.evolutions[0].to;
        const nextMon = db.pokemon.find(p => p.name.toLowerCase() === nextName.toLowerCase());
        thirdNode = nextMon || { name: nextName, dummy: true };
      }
    }
  } else {
    // Current is root
    firstNode = poke;
    if (poke.evolutions && poke.evolutions.length > 0) {
      const nextName = poke.evolutions[0].to;
      const nextMon = db.pokemon.find(p => p.name.toLowerCase() === nextName.toLowerCase());
      secondNode = nextMon || { name: nextName, dummy: true };

      if (secondNode && !secondNode.dummy && secondNode.evolutions && secondNode.evolutions.length > 0) {
        const finalName = secondNode.evolutions[0].to;
        const finalMon = db.pokemon.find(p => p.name.toLowerCase() === finalName.toLowerCase());
        thirdNode = finalMon || { name: finalName, dummy: true };
      }
    }
  }

  // Draw nodes
  if (firstNode) {
    addEvoNode(container, firstNode);
  }

  if (secondNode) {
    // Draw arrow
    let lvl = "";
    if (firstNode && firstNode.evolutions && firstNode.evolutions.length > 0) {
      lvl = `Lvl ${firstNode.evolutions[0].level}`;
    }
    addEvoArrow(container, lvl);
    addEvoNode(container, secondNode);
  }

  if (thirdNode) {
    // Draw arrow
    let lvl = "";
    if (secondNode && !secondNode.dummy && secondNode.evolutions && secondNode.evolutions.length > 0) {
      lvl = `Lvl ${secondNode.evolutions[0].level}`;
    }
    addEvoArrow(container, lvl);
    addEvoNode(container, thirdNode);
  }

  if (!secondNode && !thirdNode) {
    container.innerHTML = `<span style="color: var(--text-muted)">This Pokémon does not evolve.</span>`;
  }
}

function addEvoNode(container, poke) {
  const node = document.createElement("div");
  node.className = "evo-mon";

  if (poke.dummy) {
    node.innerHTML = `
      <img src="assets/pokemon_images/000.png" class="evo-mon-img" style="opacity: 0.5;">
      <span class="evo-mon-name" style="color: var(--text-muted)">${poke.name}</span>
    `;
  } else {
    node.style.cursor = "pointer";
    node.onclick = () => openPokeDetailModal(poke.id);
    node.innerHTML = `
      <img src="${getPokemonImage(poke)}" class="evo-mon-img" alt="${poke.name}">
      <span class="evo-mon-name">${poke.name}</span>
    `;
  }
  container.appendChild(node);
}

function addEvoArrow(container, labelText) {
  const arrow = document.createElement("div");
  arrow.className = "evo-arrow";
  arrow.innerHTML = `
    <span>${labelText || 'Evolve'}</span>
    <i class="fa-solid fa-arrow-right-long"></i>
  `;
  container.appendChild(arrow);
}

function switchDetailTab(tabKey) {
  currentDetailTab = tabKey;

  const tabs = document.querySelectorAll(".poke-info-tabs .info-tab");
  tabs.forEach(tab => {
    if (tab.getAttribute("data-tab-content") === tabKey) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  const contentPanels = document.querySelectorAll(".modal-content .info-content");
  contentPanels.forEach(panel => {
    if (panel.id === `detail-content-${tabKey}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });
}

// ================= USER AUTHENTICATION & DATABASE EDITOR SYSTEM =================
let selectedEditPokeId = null;

function initUsersDb() {
  // Check if users exist in localStorage, if not populate default administrators
  if (!localStorage.getItem("varadus_pokedex_users")) {
    const defaultUsers = [
      { username: 'WardenZero', password: '$1lv4lly', role: 'admin' },
      { username: 'Samudra', password: '$phe4l', role: 'admin' }
    ];
    localStorage.setItem("varadus_pokedex_users", JSON.stringify(defaultUsers));
  }

  // Load session from sessionStorage
  const storedUser = sessionStorage.getItem("varadus_logged_in_user");
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
    } catch(e) {
      currentUser = null;
    }
  }
}

function checkAuthAndToggleView() {
  const authContainer = document.getElementById("editor-auth-container");
  const mainContainer = document.getElementById("editor-main-container");
  const deniedContainer = document.getElementById("editor-denied-container");

  if (!authContainer || !mainContainer || !deniedContainer) return;

  if (!currentUser) {
    authContainer.style.display = "block";
    mainContainer.style.display = "none";
    deniedContainer.style.display = "none";
    renderAuthUI();
  } else if (currentUser.role === 'admin') {
    authContainer.style.display = "none";
    mainContainer.style.display = "block";
    deniedContainer.style.display = "none";
    renderEditorMain();
  } else {
    authContainer.style.display = "none";
    mainContainer.style.display = "none";
    deniedContainer.style.display = "block";
    renderDeniedUI();
  }
}

function renderAuthUI() {
  const container = document.getElementById("editor-auth-container");
  if (!container) return;

  container.innerHTML = `
    <h2 style="font-family: 'Press Start 2P', monospace; font-size: 14px; margin-bottom: 24px; color: var(--accent-orange); text-align: center;">Admin Login</h2>
    <form id="auth-login-form" onsubmit="event.preventDefault(); handleLoginSubmit();">
      <div class="form-group">
        <label for="login-username">Username</label>
        <input type="text" id="login-username" placeholder="Enter username..." required autocomplete="username">
      </div>
      <div class="form-group" style="margin-top: 16px;">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" placeholder="Enter password..." required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 24px; font-family: 'Press Start 2P', monospace; font-size: 10px; height: 48px;">
        <i class="fa-solid fa-right-to-bracket"></i> Login
      </button>
    </form>
  `;
}

function handleLoginSubmit() {
  const userEl = document.getElementById("login-username");
  const passEl = document.getElementById("login-password");
  if (!userEl || !passEl) return;

  const username = userEl.value.trim();
  const password = passEl.value;

  let users = JSON.parse(localStorage.getItem("varadus_pokedex_users") || "[]");
  const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (matchedUser && matchedUser.password === password) {
    currentUser = matchedUser;
    sessionStorage.setItem("varadus_logged_in_user", JSON.stringify(currentUser));
    showToast(`Welcome back, ${matchedUser.username}!`, "success");
    checkAuthAndToggleView();
  } else {
    showToast("Invalid username or password.", "error");
  }
}

function renderDeniedUI() {
  const container = document.getElementById("editor-denied-container");
  if (!container) return;

  container.innerHTML = `
    <i class="fa-solid fa-circle-exclamation" style="font-size: 54px; color: var(--accent-orange); margin-bottom: 20px;"></i>
    <h2 style="font-family: 'Press Start 2P', monospace; font-size: 14px; margin-bottom: 16px;">Access Denied</h2>
    <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
      Hello, <strong>${currentUser.username}</strong>. You are currently logged in with standard read-only access.
      Only administrators can modify the PokéDex databases.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <button class="btn btn-cyan" onclick="upgradeToAdmin()">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Upgrade to Admin
      </button>
      <button class="btn btn-secondary" onclick="handleLogout()">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>
  `;
}

function upgradeToAdmin() {
  if (currentUser) {
    currentUser.role = 'admin';
    sessionStorage.setItem("varadus_logged_in_user", JSON.stringify(currentUser));
    
    let users = JSON.parse(localStorage.getItem("varadus_pokedex_users") || "[]");
    const matchedIdx = users.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
    if (matchedIdx !== -1) {
      users[matchedIdx].role = 'admin';
      localStorage.setItem("varadus_pokedex_users", JSON.stringify(users));
    }
    
    showToast("You are now registered as an Administrator!", "success");
    checkAuthAndToggleView();
  }
}

function renderEditorMain() {
  const container = document.getElementById("editor-main-container");
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div>
        <span style="color: var(--text-secondary); font-size: 13px;">Logged in as:</span>
        <strong style="color: var(--accent-cyan); font-size: 14px;">${currentUser.username} (Admin)</strong>
      </div>
      <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="handleLogout()">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>

    <div class="form-group" style="max-width: 400px; margin-bottom: 28px;">
      <label for="edit-poke-select" style="font-weight: 700;">Select Pokémon to Edit</label>
      <select id="edit-poke-select" class="select-filter" onchange="loadPokemonToEdit(parseInt(this.value))">
        <option value="">-- Choose a Pokémon --</option>
        ${db.pokemon.map(p => `<option value="${p.id}">#${String(p.id).padStart(3, '0')} - ${p.name}</option>`).join('')}
      </select>
    </div>

    <!-- Edit Form (hidden until pokemon is selected) -->
    <div id="poke-edit-form-wrapper" style="display: none;">
      <form id="poke-edit-form" onsubmit="event.preventDefault(); handleSaveEditsSubmit();">
        <div class="form-row-2">
          <div class="form-group">
            <label for="edit-name">Pokémon Name</label>
            <input type="text" id="edit-name" required>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="edit-type1">Primary Type</label>
              <select id="edit-type1" required></select>
            </div>
            <div class="form-group">
              <label for="edit-type2">Secondary Type</label>
              <select id="edit-type2"></select>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top: 16px;">
          <label for="edit-desc">PokéDex Description</label>
          <textarea id="edit-desc" rows="3" required style="resize: vertical;"></textarea>
        </div>

        <div class="form-row-2" style="margin-top: 16px;">
          <div class="form-group">
            <label for="edit-height">Height (meters)</label>
            <input type="number" step="0.1" min="0" id="edit-height" required>
          </div>
          <div class="form-group">
            <label for="edit-weight">Weight (kilograms)</label>
            <input type="number" step="0.1" min="0" id="edit-weight" required>
          </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 700; margin: 24px 0 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; color: var(--accent-orange);">Base Statistics</h3>
        <div class="form-row-6">
          <div class="form-group">
            <label for="edit-hp">HP</label>
            <input type="number" min="1" max="255" id="edit-hp" required>
          </div>
          <div class="form-group">
            <label for="edit-atk">Atk</label>
            <input type="number" min="1" max="255" id="edit-atk" required>
          </div>
          <div class="form-group">
            <label for="edit-def">Def</label>
            <input type="number" min="1" max="255" id="edit-def" required>
          </div>
          <div class="form-group">
            <label for="edit-spa">SpA</label>
            <input type="number" min="1" max="255" id="edit-spa" required>
          </div>
          <div class="form-group">
            <label for="edit-spd">SpD</label>
            <input type="number" min="1" max="255" id="edit-spd" required>
          </div>
          <div class="form-group">
            <label for="edit-spe">Spe</label>
            <input type="number" min="1" max="255" id="edit-spe" required>
          </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 700; margin: 28px 0 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; color: var(--accent-orange);">Encounters & Movesets</h3>
        <div class="form-row-2">
          <div class="form-group">
            <label for="edit-encounters">Wild Encounters (one location per line)</label>
            <textarea id="edit-encounters" rows="6" style="resize: vertical; font-family: monospace; font-size: 13px;" placeholder="Route 1&#10;Route 2 (Day)"></textarea>
          </div>
          <div class="form-group">
            <label for="edit-moves-levelup">Level Up Moves (format: Level, Move Name)</label>
            <textarea id="edit-moves-levelup" rows="6" style="resize: vertical; font-family: monospace; font-size: 13px;" placeholder="1, Scratch&#10;6, Taunt"></textarea>
          </div>
        </div>
        <div class="form-row-2" style="margin-top: 16px;">
          <div class="form-group">
            <label for="edit-moves-tm">TM / HM Learnset (one move per line)</label>
            <textarea id="edit-moves-tm" rows="6" style="resize: vertical; font-family: monospace; font-size: 13px;" placeholder="Thunderbolt&#10;Ice Beam"></textarea>
          </div>
          <div class="form-group">
            <label for="edit-moves-egg">Egg Moves (one move per line)</label>
            <textarea id="edit-moves-egg" rows="6" style="resize: vertical; font-family: monospace; font-size: 13px;" placeholder="Counter&#10;Double-Edge"></textarea>
          </div>
        </div>

        <div class="form-actions" style="margin-top: 24px;">
          <button type="submit" class="btn btn-cyan">
            <i class="fa-solid fa-floppy-disk"></i> Save Changes
          </button>
        </div>
      </form>
    </div>

    <!-- Database Controls -->
    <div style="border-top: 1px solid var(--border-color); margin-top: 40px; padding-top: 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
      <button class="btn btn-secondary" onclick="resetDbToDefault()">
        <i class="fa-solid fa-rotate-left"></i> Reset Database to Default
      </button>
      <button class="btn btn-primary" onclick="exportCustomDb()">
        <i class="fa-solid fa-file-arrow-down"></i> Export Custom pokemon.json
      </button>
    </div>
  `;

  const type1Sel = document.getElementById("edit-type1");
  const type2Sel = document.getElementById("edit-type2");
  if (type1Sel && type2Sel) {
    type1Sel.innerHTML = TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    type2Sel.innerHTML = `<option value="">None (Single Type)</option>` + TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  if (selectedEditPokeId !== null) {
    const selector = document.getElementById("edit-poke-select");
    if (selector) {
      selector.value = selectedEditPokeId;
      loadPokemonToEdit(selectedEditPokeId);
    }
  }
}

function loadPokemonToEdit(id) {
  selectedEditPokeId = id;
  const formWrapper = document.getElementById("poke-edit-form-wrapper");
  if (!formWrapper) return;

  if (!id) {
    formWrapper.style.display = "none";
    return;
  }

  const p = db.pokemon.find(poke => poke.id === id);
  if (!p) return;

  formWrapper.style.display = "block";
  document.getElementById("edit-name").value = p.name;
  document.getElementById("edit-type1").value = p.type1;
  document.getElementById("edit-type2").value = p.type2 || "";
  document.getElementById("edit-desc").value = p.description || "";
  document.getElementById("edit-height").value = p.height || 0;
  document.getElementById("edit-weight").value = p.weight || 0;
  document.getElementById("edit-hp").value = p.hp || 0;
  document.getElementById("edit-atk").value = p.atk || 0;
  document.getElementById("edit-def").value = p.def || 0;
  document.getElementById("edit-spa").value = p.spa || 0;
  document.getElementById("edit-spd").value = p.spd || 0;
  document.getElementById("edit-spe").value = p.spe || 0;

  document.getElementById("edit-encounters").value = p.encounters ? p.encounters.join('\n') : "";
  const moves = p.moves || {};
  document.getElementById("edit-moves-levelup").value = moves.levelUp ? moves.levelUp.map(m => `${m.level}, ${m.move}`).join('\n') : "";
  document.getElementById("edit-moves-tm").value = moves.tm ? moves.tm.join('\n') : "";
  document.getElementById("edit-moves-egg").value = moves.egg ? moves.egg.join('\n') : "";
}

function handleSaveEditsSubmit() {
  if (selectedEditPokeId === null) return;
  const id = selectedEditPokeId;

  const idx = db.pokemon.findIndex(p => p.id === id);
  if (idx === -1) return;

  const p = db.pokemon[idx];

  p.name = document.getElementById("edit-name").value.trim();
  p.type1 = document.getElementById("edit-type1").value;
  p.type2 = document.getElementById("edit-type2").value || null;
  p.description = document.getElementById("edit-desc").value.trim();
  p.height = parseFloat(document.getElementById("edit-height").value) || 0;
  p.weight = parseFloat(document.getElementById("edit-weight").value) || 0;
  p.hp = parseInt(document.getElementById("edit-hp").value) || 0;
  p.atk = parseInt(document.getElementById("edit-atk").value) || 0;
  p.def = parseInt(document.getElementById("edit-def").value) || 0;
  p.spa = parseInt(document.getElementById("edit-spa").value) || 0;
  p.spd = parseInt(document.getElementById("edit-spd").value) || 0;
  p.spe = parseInt(document.getElementById("edit-spe").value) || 0;

  // Parse encounters
  const encountersVal = document.getElementById("edit-encounters").value;
  p.encounters = encountersVal.split('\n').map(x => x.trim()).filter(Boolean);

  // Parse moves
  const levelUpVal = document.getElementById("edit-moves-levelup").value;
  const levelUp = [];
  levelUpVal.split('\n').forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 2) {
      const lvl = parseInt(parts[0].trim());
      const moveName = parts.slice(1).join(',').trim();
      if (!isNaN(lvl) && moveName) {
        levelUp.push({ level: lvl, move: moveName });
      }
    }
  });
  levelUp.sort((a, b) => a.level - b.level);

  const tmVal = document.getElementById("edit-moves-tm").value;
  const tm = tmVal.split('\n').map(x => x.trim()).filter(Boolean);

  const eggVal = document.getElementById("edit-moves-egg").value;
  const egg = eggVal.split('\n').map(x => x.trim()).filter(Boolean);

  p.moves = {
    levelUp,
    tm,
    egg
  };

  localStorage.setItem("varadus_custom_pokemon_db", JSON.stringify(db.pokemon));

  showToast(`Saved changes for ${p.name}!`, "success");

  renderPokedex();
  filterPokemon();
  renderEditorMain();
}

function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem("varadus_logged_in_user");
  showToast("Logged out successfully.", "info");
  checkAuthAndToggleView();
}

function resetDbToDefault() {
  if (confirm("Are you sure you want to discard all customized database changes and restore default PokéDex?")) {
    localStorage.removeItem("varadus_custom_pokemon_db");
    
    initApp().then(() => {
      selectedEditPokeId = null;
      showToast("PokéDex database reset to default successfully!", "success");
      checkAuthAndToggleView();
    });
  }
}

function exportCustomDb() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db.pokemon, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "pokemon.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Downloaded customized pokemon.json!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to export database.", "error");
  }
}

// Theme Manager
const THEME_STORAGE_KEY = "varadus_pokedex_theme";

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'default';
  applyTheme(savedTheme);
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    themeSelect.value = savedTheme;
  }
}

function changeTheme(themeName) {
  applyTheme(themeName);
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
}

function applyTheme(themeName) {
  document.body.classList.remove('theme-ninthecho', 'theme-bluestatic', 'theme-thestate');
  
  if (themeName !== 'default') {
    document.body.classList.add(`theme-${themeName}`);
  }
}

// ================= MOVE DETAIL MODAL & LEARNERS =================
function openMoveDetailModal(moveName) {
  const move = db.moves.find(m => m.name.toLowerCase() === moveName.toLowerCase());
  if (!move) return;

  // Set Move Texts
  document.getElementById("move-detail-name").textContent = move.name;
  document.getElementById("move-detail-type").innerHTML = `<img class="type-badge-img" src="assets/types/${move.type.toLowerCase()}.png" alt="${move.type}" title="${move.type}">`;
  document.getElementById("move-detail-category").innerHTML = `<img class="move-cat-img" src="assets/move_category/move-${move.category.toLowerCase()}.png" alt="${move.category}" title="${move.category}">`;
  
  document.getElementById("move-detail-power").textContent = move.power > 0 ? move.power : '--';
  document.getElementById("move-detail-accuracy").textContent = move.accuracy > 0 ? `${move.accuracy}%` : '--';
  document.getElementById("move-detail-pp").textContent = move.pp;
  document.getElementById("move-detail-description").textContent = move.description || "--";

  // Scan learners
  const levelUpLearners = [];
  const tmLearners = [];
  const eggLearners = [];

  db.pokemon.forEach(p => {
    // 1. Level Up
    if (p.moves && p.moves.levelUp) {
      const match = p.moves.levelUp.find(m => m.move.toLowerCase() === moveName.toLowerCase());
      if (match) {
        levelUpLearners.push({ pokemon: p, level: match.level });
      }
    }
    // 2. TM
    if (p.moves && p.moves.tm) {
      const match = p.moves.tm.some(m => m.toLowerCase() === moveName.toLowerCase());
      if (match) {
        tmLearners.push(p);
      }
    }
    // 3. Egg
    if (p.moves && p.moves.egg) {
      const match = p.moves.egg.some(m => m.toLowerCase() === moveName.toLowerCase());
      if (match) {
        eggLearners.push(p);
      }
    }
  });

  // Sort Level Up by level ascending, then name
  levelUpLearners.sort((a, b) => a.level - b.level || a.pokemon.name.localeCompare(b.pokemon.name));
  tmLearners.sort((a, b) => a.name.localeCompare(b.name));
  eggLearners.sort((a, b) => a.name.localeCompare(b.name));

  // Set Counts
  document.getElementById("count-levelup").textContent = levelUpLearners.length;
  document.getElementById("count-tm").textContent = tmLearners.length;
  document.getElementById("count-egg").textContent = eggLearners.length;

  // Populate Lists
  populateLearnersGrid("learner-list-levelup", levelUpLearners, true);
  populateLearnersGrid("learner-list-tm", tmLearners, false);
  populateLearnersGrid("learner-list-egg", eggLearners, false);

  // Switch to Level Up tab as default
  switchMoveLearnerTab('levelup');

  // Open Modal
  document.getElementById("move-detail-modal").classList.add("active");
}

function populateLearnersGrid(containerId, list, isLevelUp) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">No Pokémon can learn this move this way.</div>`;
    return;
  }

  list.forEach(item => {
    const p = isLevelUp ? item.pokemon : item;
    const levelLabel = isLevelUp ? `<div class="learner-level">Lvl ${item.level}</div>` : "";
    const imgUrl = getPokemonImage(p);

    const card = document.createElement("div");
    card.className = "learner-card";
    card.style.setProperty('--type-color', `var(--type-${p.type1.toLowerCase()})`);
    card.onclick = () => {
      closeMoveDetailModal();
      // Wait for move modal transition to fade out, then open pokemon modal
      setTimeout(() => {
        openPokeDetailModal(p.id);
      }, 200);
    };

    card.innerHTML = `
      <img src="${imgUrl}" alt="${p.name}" class="learner-img">
      <div class="learner-info">
        <span class="learner-name">${p.name}</span>
        <div style="display: flex; gap: 4px; margin-top: 2px;">
          <img class="type-badge-img" style="height: 14px;" src="assets/types/${p.type1.toLowerCase()}.png" alt="${p.type1}">
          ${p.type2 ? `<img class="type-badge-img" style="height: 14px;" src="assets/types/${p.type2.toLowerCase()}.png" alt="${p.type2}">` : ''}
        </div>
      </div>
      ${levelLabel}
    `;
    container.appendChild(card);
  });
}

function closeMoveDetailModal(e) {
  document.getElementById("move-detail-modal").classList.remove("active");
}

function switchMoveLearnerTab(tabKey) {
  const tabs = document.querySelectorAll("#move-learner-tabs .info-tab");
  tabs.forEach(tab => {
    if (tab.getAttribute("data-tab-content") === tabKey) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  const contentPanels = document.querySelectorAll("#move-detail-modal .info-content");
  contentPanels.forEach(panel => {
    if (panel.id === `move-learner-${tabKey}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });
}
