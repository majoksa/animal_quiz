/* ═══════════════════════════════════════════════
   api.js – Wikidata SPARQL integration
   ═══════════════════════════════════════════════ */

const API = (() => {

  const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

  // Mass formatting: Wikidata stores mass in kg
  function formatMass(kgValue) {
    const kg = parseFloat(kgValue);
    if (isNaN(kg)) return null;
    if (kg >= 1000) return `${Math.round(kg / 100) / 10} t`;
    if (kg >= 1)    return `${Math.round(kg)} kg`;
    return `${Math.round(kg * 1000)} g`;
  }

  // Build image URL from Wikidata P18 Commons URL
  function buildImageUrl(rawUrl) {
    if (!rawUrl) return null;
    // Upgrade to HTTPS and request a 500px-wide thumbnail
    return rawUrl.replace('http://', 'https://') + '?width=500';
  }

  // SPARQL query: fetch 60 random animal species with Slovak labels
  const SPARQL_QUERY = `
SELECT DISTINCT ?animal ?label ?image ?continentLabel ?mass ?conservLabel ?sciName WHERE {
  ?animal wdt:P31 wd:Q16521 ;
          wdt:P105 wd:Q7432 ;
          wdt:P18 ?image ;
          wdt:P30 ?continent .

  ?animal rdfs:label ?label .
  FILTER(LANG(?label) = "sk")

  OPTIONAL { ?animal wdt:P2067 ?mass . }
  OPTIONAL { ?animal wdt:P141 ?conserv . }
  OPTIONAL { ?animal wdt:P225 ?sciName . }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "sk,en" .
  }

  BIND(MD5(CONCAT(STR(RAND()), STR(?animal))) AS ?rand)
}
ORDER BY ?rand
LIMIT 60
`.trim();

  /**
   * Parse Wikidata SPARQL JSON response into a flat array of animal objects.
   */
  function parseResults(data) {
    const bindings = data.results.bindings;
    const seen = new Set();
    const animals = [];

    for (const b of bindings) {
      const label = b.label?.value;
      const image = b.image?.value;
      const continent = b.continentLabel?.value;

      if (!label || !image || !continent) continue;

      // Skip if continent is a Wikidata QID (label service fallback)
      if (/^Q\d+$/.test(continent)) continue;

      // Deduplicate by label (same species may appear multiple times due to OPTIONAL joins)
      if (seen.has(label)) continue;
      seen.add(label);

      const mass = b.mass ? formatMass(b.mass.value) : null;
      const conserv = b.conservLabel?.value || null;
      const sciName = b.sciName?.value || null;

      // Skip conserv if it's a QID
      const conservClean = conserv && /^Q\d+$/.test(conserv) ? null : conserv;

      // Must have at least one fact field
      if (!mass && !conservClean && !sciName) continue;

      animals.push({
        id: b.animal.value,          // Wikidata entity URI (unique)
        label,                        // Slovak name
        imageUrl: buildImageUrl(image),
        continent,
        mass,
        conserv: conservClean,
        sciName,
      });
    }

    return animals;
  }

  /**
   * Fetch animal batch from Wikidata SPARQL.
   * Returns array of parsed animal objects.
   * Throws on network/API error.
   */
  async function fetchAnimalBatch() {
    const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(SPARQL_QUERY)}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'ZvieracieKvizy/1.0 (educational children quiz app)',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikidata API chyba: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
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
        img.onerror = () => { cache.set(animal.id, FALLBACK); resolve(); };
        img.src = animal.imageUrl;
      });
    });

    await Promise.allSettled(promises);
    return cache;
  }

  return { fetchAnimalBatch, preloadImages };
})();
