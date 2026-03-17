/* ═══════════════════════════════════════════════
   leaderboard.js – localStorage top-10 management
   ═══════════════════════════════════════════════ */

const LEADERBOARD_KEY = 'animal_quiz_leaderboard';
const MAX_ENTRIES = 10;

const Leaderboard = (() => {

  function load() {
    try {
      return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(entries) {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add or update a player's score.
   * If the same name already exists with a higher score, the old entry is kept.
   * If the same name exists with a lower score, it's replaced.
   * Returns {saved: bool, rank: number|null}
   */
  function addScore(name, score, grade) {
    const entries = load();
    const date = new Date().toLocaleDateString('sk-SK');

    // Remove existing entry for this name if the new score is higher
    const existingIdx = entries.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
    if (existingIdx !== -1) {
      if (entries[existingIdx].score >= score) {
        // Old score is better — don't overwrite
        const rank = entries.findIndex(e => e.name.toLowerCase() === name.toLowerCase()) + 1;
        return { saved: false, rank, message: 'Tvoj predchádzajúci výsledok bol lepší!' };
      }
      entries.splice(existingIdx, 1);
    }

    entries.push({ name, score, grade, date });
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, MAX_ENTRIES);

    const rank = trimmed.findIndex(e => e.name.toLowerCase() === name.toLowerCase() && e.score === score) + 1;
    const saved = save(trimmed);

    return { saved, rank: rank > 0 ? rank : null };
  }

  function getAll() {
    return load();
  }

  function isAvailable() {
    try {
      localStorage.setItem('__test', '1');
      localStorage.removeItem('__test');
      return true;
    } catch {
      return false;
    }
  }

  return { addScore, getAll, isAvailable };
})();
