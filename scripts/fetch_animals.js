#!/usr/bin/env node
/**
 * fetch_animals.js – one-time build script
 * Downloads 300–500 animals from Wikidata (en.wikipedia sitelinks) per continent
 * and saves them to data/animals.json.
 *
 * Usage:
 *   node scripts/fetch_animals.js
 *
 * Output: data/animals.json
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ---------------------------------------------------------------------------
// Continents: Wikidata QID → English name stored in JSON
// ---------------------------------------------------------------------------
const CONTINENTS = [
  { qid: 'Q15',  name: 'Africa'        },
  { qid: 'Q48',  name: 'Asia'          },
  { qid: 'Q46',  name: 'Europe'        },
  { qid: 'Q49',  name: 'North America' },
  { qid: 'Q18',  name: 'South America' },
  { qid: 'Q538', name: 'Australia'     },
  { qid: 'Q51',  name: 'Antarctica'    },
];

const LIMIT_PER_CONTINENT = 100;
const SPARQL_ENDPOINT     = 'https://query.wikidata.org/sparql';
const OUT_FILE            = path.join(__dirname, '..', 'data', 'animals.json');

// ---------------------------------------------------------------------------
// HTTP helper – GET with retry
// ---------------------------------------------------------------------------
function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'AnimalQuizBuildScript/1.0', ...headers },
    };
    https.get(url, options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function httpsGetWithRetry(url, headers, retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await httpsGet(url, headers);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠ Attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs / 1000}s…`);
      await new Promise(r => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }
}

// ---------------------------------------------------------------------------
// Build SPARQL query for one continent
// ---------------------------------------------------------------------------
function buildQuery(continentQid, limit) {
  return `
SELECT DISTINCT ?animal ?label ?image ?sciName WHERE {
  ?animal wdt:P31  wd:Q16521 ;
          wdt:P105 wd:Q7432  ;
          wdt:P18  ?image    ;
          wdt:P30  wd:${continentQid} .

  ?enArticle schema:about    ?animal ;
             schema:isPartOf <https://en.wikipedia.org/> ;
             schema:name     ?label .

  OPTIONAL { ?animal wdt:P225 ?sciName . }
}
LIMIT ${limit}
`.trim();
}

// ---------------------------------------------------------------------------
// Convert Wikimedia Commons HTTP URL → HTTPS with width parameter
// ---------------------------------------------------------------------------
function buildImageUrl(raw) {
  return raw.replace(/^http:\/\//, 'https://') + '?width=500';
}

// ---------------------------------------------------------------------------
// Fetch animals for one continent
// ---------------------------------------------------------------------------
async function fetchContinent(continent) {
  const query = buildQuery(continent.qid, LIMIT_PER_CONTINENT);
  const url   = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;

  console.log(`  Querying ${continent.name} (${continent.qid})…`);
  const body = await httpsGetWithRetry(url, { Accept: 'application/sparql-results+json' });
  const data = JSON.parse(body);

  const animals = [];
  for (const b of data.results.bindings) {
    const label   = b.label?.value;
    const image   = b.image?.value;
    const sciName = b.sciName?.value || null;
    const id      = b.animal?.value;

    if (!label || !image || !id) continue;

    animals.push({
      id,
      label,
      imageUrl:  buildImageUrl(image),
      continent: continent.name,
      sciName,
    });
  }

  return animals;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Animal Quiz – build script ===\n');

  const allAnimals = [];
  const seenIds    = new Set();

  for (const continent of CONTINENTS) {
    let animals;
    try {
      animals = await fetchContinent(continent);
    } catch (err) {
      console.error(`  ✗ Failed for ${continent.name}: ${err.message}`);
      animals = [];
    }

    // Deduplicate globally by Wikidata entity ID
    let added = 0;
    for (const a of animals) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAnimals.push(a);
        added++;
      }
    }
    console.log(`  ✓ ${continent.name}: ${added} unique animals (${animals.length} raw)`);

    // Small pause to be polite to Wikidata
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nTotal unique animals: ${allAnimals.length}`);

  if (allAnimals.length < 15) {
    console.error('✗ Too few animals. Check Wikidata connectivity.');
    process.exit(1);
  }

  const outDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUT_FILE, JSON.stringify(allAnimals, null, 2), 'utf8');
  console.log(`\n✓ Saved to ${OUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
