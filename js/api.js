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

    const promises = animals.map(async animal => {
      // Derive Wikipedia page title from id (e.g. "https://en.wikipedia.org/wiki/Lion" → "Lion")
      const title = animal.id.replace('https://en.wikipedia.org/wiki/', '');
      let imageUrl = FALLBACK;

      try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
        if (res.ok) {
          const data = await res.json();
          if (data.thumbnail && data.thumbnail.source) {
            imageUrl = data.thumbnail.source;
          }
        }
      } catch {}

      await new Promise(resolve => {
        const img = new Image();
        img.onload  = () => { cache.set(animal.id, imageUrl); resolve(); };
        img.onerror = () => { cache.set(animal.id, FALLBACK);  resolve(); };
        img.src = imageUrl;
      });
    });

    await Promise.allSettled(promises);
    return cache;
  }

  return { fetchAnimalBatch, preloadImages };
})();
