/** First submissions are immutable; daily totals use this browser's local date. */
class QuizDailyStats {
  static STORAGE_KEY = 'genetics-family-tree.quiz-stats.v1';
  static TRAITS = { double_eyelid: '쌍꺼풀', blood_type: 'ABO 혈액형', color_blindness: '색맹' };

  constructor({ storage, now = () => new Date() } = {}) {
    this.now = now;
    this.quizzes = [];
    try {
      this.storage = storage === undefined ? window.localStorage : storage;
    } catch {
      this.storage = null;
    }
    this.refresh();
  }

  static dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  refresh() {
    if (!this.storage) return;
    let raw;
    try {
      raw = this.storage.getItem(QuizDailyStats.STORAGE_KEY);
    } catch {
      this.storage = null;
      return;
    }
    try {
      const data = raw ? JSON.parse(raw) : { version: 1, quizzes: [] };
      const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
      const validQuiz = q => q && typeof q.id === 'string' && q.id.length > 0 &&
        Object.hasOwn(QuizDailyStats.TRAITS, q.traitType) && Number.isInteger(q.totalPeople) &&
        q.totalPeople > 0 && q.totalPeople <= 9 && Array.isArray(q.answers) &&
        q.answers.length <= q.totalPeople && q.answers.every(a => a && typeof a.nodeId === 'string' &&
          typeof a.isCorrect === 'boolean' && isDate(a.at)) &&
        new Set(q.answers.map(a => a.nodeId)).size === q.answers.length &&
        (q.completedAt === null || (isDate(q.completedAt) && q.answers.length === q.totalPeople));
      this.quizzes = data.version === 1 && Array.isArray(data.quizzes) && data.quizzes.every(validQuiz) &&
        new Set(data.quizzes.map(q => q.id)).size === data.quizzes.length ? data.quizzes : [];
    } catch {
      this.quizzes = [];
    }
  }

  recordAnswer({ quizId, nodeId, traitType, totalPeople, isCorrect }) {
    if (!quizId || !nodeId || !Object.hasOwn(QuizDailyStats.TRAITS, traitType) ||
        !Number.isInteger(totalPeople) || totalPeople < 1 || totalPeople > 9 || typeof isCorrect !== 'boolean') return false;
    this.refresh();
    let quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) {
      quiz = { id: quizId, traitType, totalPeople, answers: [], completedAt: null };
      this.quizzes.push(quiz);
    }
    if (quiz.traitType !== traitType || quiz.totalPeople !== totalPeople ||
        quiz.answers.length >= totalPeople || quiz.answers.some(a => a.nodeId === nodeId)) return false;
    const at = this.now().toISOString();
    quiz.answers.push({ nodeId, isCorrect, at });
    if (quiz.answers.length === totalPeople) quiz.completedAt = at;
    if (this.storage) {
      try {
        this.storage.setItem(QuizDailyStats.STORAGE_KEY, JSON.stringify({ version: 1, quizzes: this.quizzes }));
      } catch {
        // Keep this session's statistics even when saving is blocked or storage is full.
        this.storage = null;
      }
    }
    return true;
  }

  getTodaySummary() {
    this.refresh();
    const date = QuizDailyStats.dateKey(this.now());
    const empty = () => ({ answered: 0, correct: 0, incorrect: 0, accuracy: null, completed: 0 });
    const overall = empty();
    const byTrait = Object.fromEntries(Object.keys(QuizDailyStats.TRAITS).map(trait => [trait, empty()]));
    for (const quiz of this.quizzes) {
      const tally = byTrait[quiz.traitType];
      for (const answer of quiz.answers) {
        if (QuizDailyStats.dateKey(new Date(answer.at)) !== date) continue;
        tally.answered++;
        tally[answer.isCorrect ? 'correct' : 'incorrect']++;
      }
      if (quiz.completedAt && QuizDailyStats.dateKey(new Date(quiz.completedAt)) === date) tally.completed++;
    }
    for (const tally of Object.values(byTrait)) {
      for (const key of ['answered', 'correct', 'incorrect', 'completed']) overall[key] += tally[key];
      tally.accuracy = tally.answered ? Math.round(tally.correct / tally.answered * 1000) / 10 : null;
    }
    overall.accuracy = overall.answered ? Math.round(overall.correct / overall.answered * 1000) / 10 : null;
    return { date, overall, byTrait, persistent: !!this.storage };
  }
}

class QuizStatsModal {
  constructor(stats) {
    this.stats = stats;
    this.dialog = document.getElementById('quiz-stats-modal');
    if (!this.dialog) return;
    for (const id of ['btn-quiz-stats', 'btn-modal-stats']) {
      document.getElementById(id)?.addEventListener('click', event => {
        this.opener = event.currentTarget;
        this.render();
        this.dialog.showModal();
        this.scheduleMidnight();
      });
    }
    this.dialog.querySelectorAll('[data-close-stats]').forEach(button => {
      button.addEventListener('click', () => this.dialog.close());
    });
    this.dialog.addEventListener('click', event => {
      if (event.target !== this.dialog) return;
      const rect = this.dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialog.close();
    });
    this.dialog.addEventListener('close', () => {
      clearTimeout(this.midnightTimer);
      this.opener?.focus();
    });
    window.addEventListener('storage', event => {
      if (this.dialog.open && (event.key === QuizDailyStats.STORAGE_KEY || event.key === null)) this.render();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.dialog.open) {
        this.render();
        this.scheduleMidnight();
      }
    });
  }

  scheduleMidnight() {
    clearTimeout(this.midnightTimer);
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    this.midnightTimer = setTimeout(() => {
      if (!this.dialog.open) return;
      this.render();
      this.scheduleMidnight();
    }, midnight.getTime() - Date.now() + 50);
  }

  render() {
    const { date, overall, byTrait, persistent } = this.stats.getTodaySummary();
    const percentage = value => value === null ? '—' : `${value}%`;
    document.getElementById('quiz-stats-date').textContent = `${date.replaceAll('-', '. ')} · 오늘 자정부터 지금까지`;
    document.getElementById('quiz-stats-content').innerHTML = `
      <div class="stats-metrics">
        <div class="stats-metric"><span>풀이 문항</span><strong>${overall.answered}<small>문항</small></strong></div>
        <div class="stats-metric stats-metric-accent"><span>정답률</span><strong>${percentage(overall.accuracy)}</strong></div>
        <div class="stats-metric"><span>정답</span><strong class="stats-correct">${overall.correct}<small>문항</small></strong></div>
        <div class="stats-metric"><span>오답</span><strong class="stats-incorrect">${overall.incorrect}<small>문항</small></strong></div>
      </div>
      <div class="stats-completed"><span><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i> 완료한 퀴즈</span><strong>${overall.completed}회</strong></div>
      ${overall.answered === 0 ? '<p class="stats-empty">아직 오늘의 풀이 기록이 없어요.<br>인물의 유전자형을 제출하면 여기에 기록됩니다.</p>' : ''}
      <h3 class="stats-section-title">유형별 성적</h3>
      <div class="stats-table-wrap"><table class="stats-table">
        <caption class="stats-sr-only">오늘의 쌍꺼풀, ABO 혈액형, 색맹 퀴즈 성적</caption>
        <thead><tr><th scope="col">유형</th><th scope="col">풀이</th><th scope="col">정답</th><th scope="col">오답</th><th scope="col">정답률</th></tr></thead>
        <tbody>${Object.entries(QuizDailyStats.TRAITS).map(([trait, label]) => {
          const tally = byTrait[trait];
          return `<tr><th scope="row">${label}</th><td>${tally.answered}</td><td>${tally.correct}</td><td>${tally.incorrect}</td><td><span class="stats-rate">${percentage(tally.accuracy)}</span></td></tr>`;
        }).join('')}</tbody>
      </table></div>
      <p class="stats-note">인물 1명 = 1문항 · 가계도 전체 = 퀴즈 1회<br>미완료 퀴즈도 포함하며, 각 인물의 첫 답변만 집계합니다.</p>
      <p class="stats-storage ${persistent ? '' : 'stats-storage-warning'}">${persistent
        ? '기기의 날짜를 기준으로 집계하며, 기록은 이 브라우저에 저장됩니다.'
        : '브라우저 저장소를 사용할 수 없어 현재 페이지의 기록만 표시합니다. 새로고침하면 저장되지 않은 기록은 사라집니다.'}</p>`;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = QuizDailyStats;
