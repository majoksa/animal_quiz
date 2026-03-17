/* ═══════════════════════════════════════════════
   quiz.js – State machine, scoring, game logic
   ═══════════════════════════════════════════════ */

const Quiz = (() => {

  /* ── Constants ── */
  const TOTAL_ANIMALS   = 15;
  const TIMER_SECONDS   = 30;
  const REVEAL_DELAY_MS = 1600;

  const POINTS = { name: 30, habitat: 20, fact: 20 };

  const GRADES = [
    { min: 1000, label: 'Zvierací Šampión! 🏆' },
    { min: 750,  label: 'Výborný znalec 🦁' },
    { min: 500,  label: 'Dobrý pozorovateľ 🔭' },
    { min: 250,  label: 'Začiatočník 🌱' },
    { min: 0,    label: 'Skús znova! 💪' },
  ];

  /* ── State ── */
  let state = {
    phase: 'START',   // START | LOADING | QUESTION | REVEAL | END
    playerName: '',
    batch: [],         // all fetched animals (60)
    quizAnimals: [],   // 15 selected for this session
    imageCache: new Map(),
    currentIdx: 0,     // 0-14
    questionType: 'name',  // name | habitat | fact
    totalScore: 0,
    animalScores: [],  // [{name, nameOk, habitatOk, factOk}]
    timer: null,
    timerLeft: TIMER_SECONDS,
    answered: false,
    currentQuestion: null, // {correct, options, field, questionText}
  };

  /* ── Helpers ── */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr, count) {
    return shuffle(arr).slice(0, count);
  }

  function getGrade(score) {
    return GRADES.find(g => score >= g.min)?.label || GRADES[GRADES.length - 1].label;
  }

  /**
   * Build 5 options (1 correct + 4 distractors) for a given field.
   * Distractors are pulled from other animals in the batch.
   */
  function buildOptions(currentAnimal, field, correctValue) {
    const others = state.batch.filter(a => a.id !== currentAnimal.id && a[field]);
    const distractorValues = pickRandom(others, 8)
      .map(a => a[field])
      .filter((v, i, arr) => v !== correctValue && arr.indexOf(v) === i)
      .slice(0, 4);

    // Pad if not enough unique distractors (edge case)
    while (distractorValues.length < 4) {
      distractorValues.push(`Neznáme ${distractorValues.length + 1}`);
    }

    return shuffle([correctValue, ...distractorValues]);
  }

  /**
   * Build a fill-in-the-blank question from a Wikipedia fun-fact sentence.
   * The animal's name is replaced with ___ and options are animal labels.
   * Returns { questionText, field, correct } or null.
   */
  function buildFactQuestion(animal) {
    if (!animal.fact) return null;
    return {
      questionText: `Čo je pravda o ${animal.label}?`,
      field:        'fact',
      correct:      animal.fact,
    };
  }

  /* ── Timer ── */
  function startTimer(onTick, onExpire) {
    clearTimer();
    state.timerLeft = TIMER_SECONDS;
    state.timer = setInterval(() => {
      state.timerLeft--;
      onTick(state.timerLeft, TIMER_SECONDS);
      if (state.timerLeft <= 0) {
        clearTimer();
        onExpire();
      }
    }, 1000);
  }

  function clearTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function getTimeBonus() {
    return Math.min(10, state.timerLeft);
  }

  /* ── Public API ── */

  function setPlayerName(name) {
    state.playerName = name.trim();
  }

  /**
   * Load game data: fetch from Wikidata, select 15, preload images.
   * Calls callbacks: onProgress(text), onReady(), onError(msg)
   */
  async function loadGame(onProgress, onReady, onError) {
    state.phase = 'LOADING';
    try {
      onProgress('Načítavam zvieratá z Wikidata…', 'Kontaktujem server…');
      const batch = await API.fetchAnimalBatch();
      state.batch = batch;

      onProgress('Vyberám zvieratá pre kvíz…', `Nájdených ${batch.length} zvierat`);
      state.quizAnimals = pickRandom(batch, TOTAL_ANIMALS);

      onProgress('Načítavam fotografie…', 'Prosím čakaj…');
      state.imageCache = await API.preloadImages(state.quizAnimals);

      // Reset session state
      state.currentIdx    = 0;
      state.totalScore    = 0;
      state.animalScores  = [];
      state.answered      = false;
      state.phase         = 'QUESTION';

      onReady();
    } catch (err) {
      state.phase = 'ERROR';
      onError(err.message || 'Neznáma chyba. Skontroluj internetové pripojenie.');
    }
  }

  /**
   * Build the current question object based on currentIdx and questionType.
   * Returns a question descriptor for the UI.
   */
  function getCurrentQuestion() {
    const animal = state.quizAnimals[state.currentIdx];
    const type   = state.questionType;

    let questionText, field, correct;

    if (type === 'name') {
      questionText = 'Aké zviera je na fotografii?';
      field        = 'label';
      correct      = animal.label;
    } else if (type === 'habitat') {
      if (animal.ocean) {
        questionText = `V ktorom oceáne alebo mori žije ${animal.label}?`;
        field        = 'ocean';
        correct      = animal.ocean;
      } else {
        questionText = `Na ktorom kontinente žije ${animal.label}?`;
        field        = 'continent';
        correct      = animal.continent;
      }
    } else {
      const factQ = buildFactQuestion(animal);
      if (!factQ) return null;
      questionText = factQ.questionText;
      field        = factQ.field;
      correct      = factQ.correct;
    }

    const options = buildOptions(animal, field, correct);
    state.currentQuestion = { questionText, field, correct, options };
    return state.currentQuestion;
  }

  /**
   * Submit an answer. Returns result object.
   */
  function submitAnswer(chosen) {
    if (state.answered) return null;
    state.answered = true;
    clearTimer();

    const { correct } = state.currentQuestion;
    const isCorrect = chosen === correct;
    const timeBonus = isCorrect ? getTimeBonus() : 0;
    const basePoints = isCorrect ? POINTS[state.questionType] : 0;
    const earned = basePoints + timeBonus;

    state.totalScore += earned;

    // Track per-animal scores
    const animal = state.quizAnimals[state.currentIdx];
    let record = state.animalScores[state.currentIdx];
    if (!record) {
      record = { name: animal.label, nameOk: false, habitatOk: false, factOk: false };
      state.animalScores[state.currentIdx] = record;
    }
    if (state.questionType === 'name')    record.nameOk    = isCorrect;
    if (state.questionType === 'habitat') record.habitatOk = isCorrect;
    if (state.questionType === 'fact')    record.factOk    = isCorrect;

    return {
      isCorrect,
      correct,
      chosen,
      earned,
      totalScore: state.totalScore,
    };
  }

  /**
   * Advance to the next question or end of game.
   * Returns 'question' | 'end'.
   */
  function advance() {
    state.answered = false;

    if (state.questionType === 'name') {
      state.questionType = 'habitat';
      return 'question';
    }
    if (state.questionType === 'habitat') {
      state.questionType = 'fact';
      return 'question';
    }

    // After fact question
    state.currentIdx++;
    state.questionType = 'name';

    if (state.currentIdx >= TOTAL_ANIMALS) {
      state.phase = 'END';
      return 'end';
    }
    return 'question';
  }

  function getImageUrl(animal) {
    return state.imageCache.get(animal.id) || 'assets/fallback.svg';
  }

  function getCurrentAnimal() {
    return state.quizAnimals[state.currentIdx] || null;
  }

  function getProgress() {
    return {
      current: state.currentIdx + 1,
      total: TOTAL_ANIMALS,
      percent: ((state.currentIdx) / TOTAL_ANIMALS) * 100,
      score: state.totalScore,
    };
  }

  function getEndSummary() {
    return {
      playerName: state.playerName,
      score: state.totalScore,
      grade: getGrade(state.totalScore),
      animalScores: state.animalScores,
    };
  }

  function getQuestionType() { return state.questionType; }

  function startTimerPublic(onTick, onExpire) {
    startTimer(onTick, onExpire);
  }

  function stopTimer() { clearTimer(); }

  return {
    setPlayerName,
    loadGame,
    getCurrentQuestion,
    getCurrentAnimal,
    getImageUrl,
    submitAnswer,
    advance,
    getProgress,
    getEndSummary,
    getQuestionType,
    startTimer: startTimerPublic,
    stopTimer,
    getGrade,
  };
})();
