/* ═══════════════════════════════════════════════
   api.js – Local animal archive loader
   ═══════════════════════════════════════════════ */

const API = (() => {

  async function fetchAnimalBatch() {
    const response = await fetch('data/animals.json');
    if (!response.ok) {
      throw new Error(`Chyba pri načítaní archívu: ${response.status} ${response.statusText}`);
    }
    const animals = await response.json();

    if (!Array.isArray(animals) || animals.length < 15) {
      throw new Error(`Nedostatok zvierat v archíve (${Array.isArray(animals) ? animals.length : 0}).`);
    }

    // Fisher-Yates shuffle
    for (let i = animals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [animals[i], animals[j]] = [animals[j], animals[i]];
    }

    return animals;
  }

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
