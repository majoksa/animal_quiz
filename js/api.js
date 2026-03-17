/* ═══════════════════════════════════════════════
   api.js – Wikidata SPARQL integration
   ═══════════════════════════════════════════════ */

const API = (() => {

  const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

  /*
   * Root cause of the old "6 animals" bug:
   *   OPTIONAL {P2067 mass} × OPTIONAL {P141 conserv} × OPTIONAL {P225 sciName}
   *   created a Cartesian product of rows per animal
   *   (e.g. 3 images × 2 continents × 5 mass values × 3 conserv = 90 rows/animal).
   *   With LIMIT 60, only 1-2 unique animals survived deduplication.
   *
   * Fix: remove P2067 and P141 from the query entirely.
   *   Only OPTIONAL {P225 sciName} remains — typically 1 value per species.
   *   Remaining duplicates: P18 images (~3x) × P30 continents (~1.5x) × P225 (~1x) ≈ 4-5 rows/animal.
   *   LIMIT 300 → ~60-70 unique animals after JS dedup. ✓
   */
  const SPARQL_QUERY = `
SELECT DISTINCT ?animal ?label ?image ?continentLabel ?sciName WHERE {
  ?animal wdt:P31 wd:Q16521 ;
          wdt:P105 wd:Q7432 ;
          wdt:P18  ?image ;
          wdt:P30  ?continent ;
          rdfs:label ?label .
  FILTER(LANG(?label) = "sk")

  OPTIONAL { ?animal wdt:P225 ?sciName . }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "sk,en" .
  }
}
LIMIT 300
`.trim();

  // Build image URL from Wikidata P18 Commons URL
  function buildImageUrl(rawUrl) {
    if (!rawUrl) return null;
    return rawUrl.replace('http://', 'https://') + '?width=500';
  }

  /**
   * Parse Wikidata SPARQL JSON response into a flat array of animal objects.
   * Deduplicates by label (first occurrence wins).
   */
  function parseResults(data) {
    const bindings = data.results.bindings;
    const seen = new Set();
    const animals = [];

    for (const b of bindings) {
      const label     = b.label?.value;
      const image     = b.image?.value;
      const continent = b.continentLabel?.value;

      if (!label || !image || !continent) continue;
      if (/^Q\d+$/.test(continent)) continue;
      if (seen.has(label)) continue;
      seen.add(label);

      animals.push({
        id:        b.animal.value,
        label,
        imageUrl:  buildImageUrl(image),
        continent,
        sciName:   b.sciName?.value || null,
      });
    }

    return animals;
  }

  /**
   * Fetch animal batch from Wikidata SPARQL.
   * Returns array of parsed animal objects (≥ 15).
   * Throws on network/API error or insufficient data.
   */
  async function fetchAnimalBatch() {
    const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(SPARQL_QUERY)}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/sparql-results+json' },
    });

    if (!response.ok) {
      throw new Error(`Wikidata API chyba: ${response.status} ${response.statusText}`);
    }

    const data    = await response.json();
    const animals = parseResults(data);

    if (animals.length < 15) {
      throw new Error(`Nedostatok zvierat zo servera (${animals.length}). Skús znova.`);
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
