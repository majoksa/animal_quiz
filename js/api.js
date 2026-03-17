/* ═══════════════════════════════════════════════
   api.js – Local animal archive loader
   ═══════════════════════════════════════════════

   Animals are stored in data/animals.json (pre-built archive).
   To regenerate the archive, open scripts/generate.html in a browser
   while the app is served via HTTP, click "Start", then save the
   downloaded file as data/animals.json.

   Image URLs still point to Wikimedia Commons (loaded online).
*/

const API = (() => {

  /**
   * Load animal batch from local data/animals.json.
   * Shuffles on every call so each game session gets a different pool.
   * Returns array of animal objects (≥ 15).
   * Throws on missing file, parse error, or insufficient data.
   */
  async function fetchAnimalBatch() {
    let animals;

    try {
      const response = await fetch('data/animals.json');
      if (!response.ok) {
        throw new Error(`Chyba pri načítaní archívu: ${response.status} ${response.statusText}`);
      }
      animals = await response.json();
    } catch (err) {
      if (err.message.startsWith('Chyba')) throw err;
      throw new Error('Archív zvierat sa nenašiel. Spusti scripts/generate.html a ulož animals.json do data/.');
    }

    if (!Array.isArray(animals) || animals.length < 15) {
      throw new Error(`Nedostatok zvierat v archíve (${Array.isArray(animals) ? animals.length : 0}). Regeneruj data/animals.json.`);
    }

    // Fisher-Yates shuffle – different animals each game
    for (let i = animals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [animals[i], animals[j]] = [animals[j], animals[i]];
    }

    return animals;
  }

  /**
   * Preload images for the 15 selected quiz animals.
   * Returns a Map of animalId → resolved image URL (or fallback path).
   */
  async function preloadImages(animals) {
    const FALLBACK = 'assets/fallback.svg';
    const cache = new Map();

    const promises = animals.map(animal => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => { cache.set(animal.id, animal.imageUrl); resolve(); };
        img.onerror = () => { cache.set(animal.id, FALLBACK);        resolve(); };
        img.src = animal.imageUrl;
      });
    });

    await Promise.allSettled(promises);
    return cache;
  }

  return { fetchAnimalBatch, preloadImages };
})();
