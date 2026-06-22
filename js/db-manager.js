// Database Manager logic - loads JSON files directly
async function loadDatabases() {
  try {
    const pRes = await fetch('data/pokemon.json');
    const pokemon = await pRes.json();

    const mRes = await fetch('data/moves.json');
    const moves = await mRes.json();

    const aRes = await fetch('data/abilities.json');
    const abilities = await aRes.json();

    // Sort pokemon by ID and moves by name alphabetically to ensure clean display
    pokemon.sort((a, b) => a.id - b.id);
    moves.sort((a, b) => a.name.localeCompare(b.name));
    abilities.sort((a, b) => a.name.localeCompare(b.name));

    return { pokemon, moves, abilities };
  } catch (err) {
    console.error("Failed to load local JSON databases:", err);
    throw err;
  }
}
