/* ═══════════════════════════════════════════════
   ui.js – DOM rendering, screen management, events
   ═══════════════════════════════════════════════ */

const UI = (() => {

  /* ── DOM refs ── */
  const screens = {
    start:    document.getElementById('screen-start'),
    loading:  document.getElementById('screen-loading'),
    error:    document.getElementById('screen-error'),
    question: document.getElementById('screen-question'),
    end:      document.getElementById('screen-end'),
  };

  const els = {
    playerName:       document.getElementById('player-name'),
    btnStart:         document.getElementById('btn-start'),
    btnShowLB:        document.getElementById('btn-show-leaderboard'),
    btnRegen:         document.getElementById('btn-regen'),
    btnRetry:         document.getElementById('btn-retry'),
    loadingText:      document.getElementById('loading-text'),
    loadingSub:       document.getElementById('loading-sub'),
    errorMessage:     document.getElementById('error-message'),
    animalCounter:    document.getElementById('animal-counter'),
    currentScore:     document.getElementById('current-score'),
    progressBar:      document.getElementById('progress-bar'),
    animalImage:      document.getElementById('animal-image'),
    imageLoader:      document.getElementById('image-loader'),
    questionText:     document.getElementById('question-text'),
    timerBar:         document.getElementById('timer-bar'),
    answersGrid:      document.getElementById('answers-grid'),
    endTitle:         document.getElementById('end-title'),
    endScore:         document.getElementById('end-score'),
    endGrade:         document.getElementById('end-grade'),
    animalSummary:    document.getElementById('animal-summary'),
    btnSaveLB:        document.getElementById('btn-save-leaderboard'),
    btnPlayAgain:     document.getElementById('btn-play-again'),
    overlayLB:        document.getElementById('overlay-leaderboard'),
    leaderboardBody:  document.getElementById('leaderboard-body'),
    leaderboardEmpty: document.getElementById('leaderboard-empty'),
    btnCloseLB:       document.getElementById('btn-close-leaderboard'),
    confettiContainer:document.getElementById('confetti-container'),
    overlayRegen:     document.getElementById('overlay-regen'),
    regenStatus:      document.getElementById('regen-status'),
    regenProgressBar: document.getElementById('regen-progress-bar'),
    regenCounter:     document.getElementById('regen-counter'),
    btnCloseRegen:    document.getElementById('btn-close-regen'),
  };

  /* ── Screen switcher ── */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    const target = screens[name];
    if (target) target.classList.add('active');
  }

  /* ── Leaderboard overlay ── */
  function showLeaderboard(highlightName) {
    const entries = Leaderboard.getAll();
    els.leaderboardBody.innerHTML = '';

    if (entries.length === 0) {
      els.leaderboardEmpty.classList.remove('hidden');
    } else {
      els.leaderboardEmpty.classList.add('hidden');
      const medals = ['🥇', '🥈', '🥉'];
      entries.forEach((e, i) => {
        const tr = document.createElement('tr');
        if (highlightName && e.name.toLowerCase() === highlightName.toLowerCase()) {
          tr.classList.add('highlight');
        }
        if (i < 3) tr.classList.add(`rank-${i + 1}`);
        tr.innerHTML = `
          <td>${medals[i] || (i + 1) + '.'}</td>
          <td>${escHtml(e.name)}</td>
          <td><strong>${e.score}</strong></td>
          <td>${escHtml(e.grade)}</td>
          <td>${escHtml(e.date)}</td>
        `;
        els.leaderboardBody.appendChild(tr);
      });
    }

    els.overlayLB.classList.remove('hidden');
  }

  function hideLeaderboard() {
    els.overlayLB.classList.add('hidden');
  }

  /* ── Confetti ── */
  const CONFETTI_COLORS = ['#F9A825','#2E7D32','#43A047','#E53935','#1565C0','#FF6F00','#6A1B9A'];

  function launchConfetti() {
    els.confettiContainer.innerHTML = '';
    for (let i = 0; i < 60; i++) {
      const span = document.createElement('span');
      span.className = 'confetti-piece';
      span.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
        width: ${6 + Math.random() * 8}px;
        height: ${10 + Math.random() * 10}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${2 + Math.random() * 3}s;
        animation-delay: ${Math.random() * 1.5}s;
      `;
      els.confettiContainer.appendChild(span);
    }
    // Clear after animations
    setTimeout(() => { els.confettiContainer.innerHTML = ''; }, 6000);
  }

  /* ── Image loading ── */
  function setAnimalImage(url) {
    els.animalImage.classList.add('loading');
    els.imageLoader.classList.remove('hidden');

    const tmp = new Image();
    tmp.onload = () => {
      els.animalImage.src = url;
      els.animalImage.classList.remove('loading');
      els.imageLoader.classList.add('hidden');
    };
    tmp.onerror = () => {
      els.animalImage.src = 'assets/fallback.svg';
      els.animalImage.classList.remove('loading');
      els.imageLoader.classList.add('hidden');
    };
    tmp.src = url;
  }

  /* ── Timer bar ── */
  function updateTimerBar(left, total) {
    const pct = (left / total) * 100;
    els.timerBar.style.width = pct + '%';
    if (left <= 8) {
      els.timerBar.classList.add('urgent');
    } else {
      els.timerBar.classList.remove('urgent');
    }
  }

  function resetTimerBar() {
    els.timerBar.style.width = '100%';
    els.timerBar.classList.remove('urgent');
  }

  /* ── Answer buttons ── */
  function renderAnswers(options) {
    els.answersGrid.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => onAnswerClick(opt));
      els.answersGrid.appendChild(btn);
    });
  }

  function onAnswerClick(chosen) {
    const result = Quiz.submitAnswer(chosen);
    if (!result) return;

    Quiz.stopTimer();
    disableAnswers();
    markAnswers(result.correct, result.chosen);

    // Update score display
    els.currentScore.textContent = `Skóre: ${result.totalScore}`;

    // After reveal delay, advance
    setTimeout(() => {
      const next = Quiz.advance();
      if (next === 'end') {
        showEndScreen();
      } else {
        renderQuestion();
      }
    }, REVEAL_DELAY_MS);
  }

  const REVEAL_DELAY_MS = 1600;

  function disableAnswers() {
    els.answersGrid.querySelectorAll('.answer-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  function markAnswers(correct, chosen) {
    els.answersGrid.querySelectorAll('.answer-btn').forEach(btn => {
      if (btn.textContent === correct) {
        btn.classList.add('correct');
      } else if (btn.textContent === chosen && chosen !== correct) {
        btn.classList.add('wrong');
      }
    });
  }

  /* ── Render question screen ── */
  function renderQuestion() {
    const animal   = Quiz.getCurrentAnimal();
    const question = Quiz.getCurrentQuestion();
    const progress = Quiz.getProgress();

    if (!question) {
      // Edge case: no fact data, skip to next
      const next = Quiz.advance();
      if (next === 'end') showEndScreen();
      else renderQuestion();
      return;
    }

    // Header
    els.animalCounter.textContent = `Zviera ${progress.current} z ${progress.total}`;
    els.currentScore.textContent  = `Skóre: ${progress.score}`;
    els.progressBar.style.width   = progress.percent + '%';

    // Image (only update on name question = new animal)
    if (Quiz.getQuestionType() === 'name') {
      const imgUrl = Quiz.getImageUrl(animal);
      setAnimalImage(imgUrl);
    }

    // Question & answers
    els.questionText.textContent = question.questionText;
    resetTimerBar();
    renderAnswers(question.options);

    // Timer
    Quiz.startTimer(
      (left, total) => updateTimerBar(left, total),
      () => {
        // Time expired — count as wrong, mark correct
        disableAnswers();
        markAnswers(question.correct, null);
        els.currentScore.textContent = `Skóre: ${Quiz.getProgress().score}`;
        setTimeout(() => {
          const next = Quiz.advance();
          if (next === 'end') showEndScreen();
          else renderQuestion();
        }, REVEAL_DELAY_MS);
      }
    );

    showScreen('question');
  }

  /* ── End screen ── */
  function showEndScreen() {
    const summary = Quiz.getEndSummary();

    els.endTitle.textContent = `Výborne, ${summary.playerName}!`;
    els.endScore.textContent  = summary.score;
    els.endGrade.textContent  = summary.grade;

    // Mini animal summary dots
    els.animalSummary.innerHTML = '';
    summary.animalScores.forEach((rec, i) => {
      const correct = (rec.nameOk ? 1 : 0) + (rec.habitatOk ? 1 : 0) + (rec.factOk ? 1 : 0);
      const cls = correct === 3 ? 'full' : correct > 0 ? 'partial' : 'none';
      const dot = document.createElement('div');
      dot.className = `summary-dot ${cls}`;
      dot.textContent = i + 1;
      dot.title = `${rec.name}: ${correct}/3`;
      els.animalSummary.appendChild(dot);
    });

    if (summary.score >= 500) launchConfetti();

    showScreen('end');
  }

  /* ── Regen overlay ── */
  function showRegenOverlay() {
    const total = Regen.getSeedCount();
    els.regenStatus.textContent = 'Sťahujem dáta z Wikipédie…';
    els.regenStatus.className = 'regen-status';
    els.regenProgressBar.style.width = '0%';
    els.regenCounter.textContent = `0 / ${total}`;
    els.btnCloseRegen.disabled = true;
    els.overlayRegen.classList.remove('hidden');
  }

  function hideRegenOverlay() {
    els.overlayRegen.classList.add('hidden');
  }

  /* ── Escape HTML ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Event wiring ── */
  function init() {

    // Enable start button only when name has 2+ chars
    els.playerName.addEventListener('input', () => {
      els.btnStart.disabled = els.playerName.value.trim().length < 2;
    });
    els.playerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !els.btnStart.disabled) els.btnStart.click();
    });

    // Start game
    els.btnStart.addEventListener('click', () => {
      const name = els.playerName.value.trim();
      Quiz.setPlayerName(name);
      showScreen('loading');

      Quiz.loadGame(
        (text, sub) => {
          els.loadingText.textContent = text;
          els.loadingSub.textContent  = sub;
        },
        () => { renderQuestion(); },
        (msg) => {
          els.errorMessage.textContent = msg;
          showScreen('error');
        }
      );
    });

    // Retry after error
    els.btnRetry.addEventListener('click', () => {
      showScreen('start');
    });

    // Show leaderboard from start
    els.btnShowLB.addEventListener('click', () => {
      showLeaderboard(null);
    });

    // Regenerate animal data to localStorage
    els.btnRegen.addEventListener('click', () => {
      showRegenOverlay();
      const total = Regen.getSeedCount();

      Regen.run(
        (done, total, ok) => {
          const pct = Math.round((done / total) * 100);
          els.regenProgressBar.style.width = pct + '%';
          els.regenCounter.textContent = `${done} / ${total}  (uložených: ${ok})`;
        },
        (count) => {
          els.regenStatus.textContent = `Hotovo! Uložených ${count} zvierat.`;
          els.regenStatus.className = 'regen-status done';
          els.regenProgressBar.style.width = '100%';
          els.regenCounter.textContent = `${total} / ${total}`;
          els.btnCloseRegen.disabled = false;
        },
        (msg) => {
          els.regenStatus.textContent = `Chyba: ${msg}`;
          els.regenStatus.className = 'regen-status error';
          els.btnCloseRegen.disabled = false;
        }
      );
    });

    // Close regen overlay
    els.btnCloseRegen.addEventListener('click', hideRegenOverlay);
    els.overlayRegen.querySelector('.overlay-backdrop').addEventListener('click', () => {
      if (!els.btnCloseRegen.disabled) hideRegenOverlay();
    });

    // Close leaderboard
    els.btnCloseLB.addEventListener('click', hideLeaderboard);
    els.overlayLB.querySelector('.overlay-backdrop').addEventListener('click', hideLeaderboard);

    // Save to leaderboard
    els.btnSaveLB.addEventListener('click', () => {
      const summary = Quiz.getEndSummary();
      if (!Leaderboard.isAvailable()) {
        alert('Rebríček nie je dostupný v súkromnom móde prehliadača.');
        return;
      }
      const result = Leaderboard.addScore(summary.playerName, summary.score, summary.grade);
      els.btnSaveLB.disabled = true;
      els.btnSaveLB.textContent = result.saved
        ? `Uložené! Tvoje miesto: #${result.rank} 🎉`
        : (result.message || 'Uložené!');
      showLeaderboard(summary.playerName);
    });

    // Play again
    els.btnPlayAgain.addEventListener('click', () => {
      els.btnSaveLB.disabled = false;
      els.btnSaveLB.textContent = 'Uložiť do rebríčka 🏆';
      showScreen('start');
    });
  }

  init();

  return { showLeaderboard };
})();
