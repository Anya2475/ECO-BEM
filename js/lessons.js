/* ═══ LMS — Learning Path ═══ */
let lp = { subj: 'ar', idx: 0, step: 0, score: 0, mistakes: 0 };
const lpSteps = ['diag', 'concept', 'examples', 'progression', 'exercises', 'solutions', 'result'];

function openLessons(subj) {
  Sound.tap();
  switchLesson(subj);
  go('tab-lessons', 'nav-subs');
}
function switchLesson(subj) {
  Sound.tap();
  const ar = document.getElementById('sw-ar');
  const math = document.getElementById('sw-math');
  const lar = document.getElementById('lessons-ar');
  const lmath = document.getElementById('lessons-math');
  if (subj === 'ar') {
    if (ar) { ar.style.background = '#8dc63f'; ar.style.color = '#08080c'; }
    if (math) { math.style.background = 'transparent'; math.style.color = 'var(--text-muted)'; }
    if (lar) lar.style.display = 'block';
    if (lmath) lmath.style.display = 'none';
  } else {
    if (math) { math.style.background = '#8dc63f'; math.style.color = '#08080c'; }
    if (ar) { ar.style.background = 'transparent'; ar.style.color = 'var(--text-muted)'; }
    if (lmath) lmath.style.display = 'block';
    if (lar) lar.style.display = 'none';
  }
}
function renderLessons() {
  ['ar', 'math'].forEach(subj => {
    const box = document.getElementById('lessons-' + subj);
    if (!box) return;
    box.innerHTML = '';
    learningDB[subj].forEach((l, i) => {
      const el = document.createElement('div');
      el.className = 'lesson';
      el.onclick = () => openLp(subj, i);
      el.innerHTML = '<div class="lesson-num">0' + (i + 1) + '</div>' + 
                     '<div class="lesson-body"><h4>' + l.title + '</h4>' + 
                     '<p>' + l.subtitle + '</p></div>' + 
                     '<div class="lesson-go"><i class="fa-solid fa-arrow-left"></i></div>';
      box.appendChild(el);
    });
  });
}

function openLp(subj, idx) {
  Sound.tap();
  lp = { subj, idx, step: 0, score: 0, mistakes: 0 };
  const header = document.getElementById('lp-header');
  if (header) header.textContent = learningDB[subj][idx].title;
  openOverlay('lp');
  renderLp();
}

function askTeacherAboutLesson() {
  const currentTitle = learningDB[lp.subj][lp.idx].title;
  closeOverlay('lp');
  openOverlay('teacher');
  const input = document.getElementById('chat-in');
  if (input) {
    input.value = 'أنا أدرس الآن موضوع "' + currentTitle + '". اشرح لي هذا الدرس من فضلك، وأعطني مثالاً ثم تمريناً للتدرب عليه.';
    setTimeout(sendAIMessage, 500);
  }
}

function renderLp() {
  const key = lpSteps[lp.step];
  const data = learningDB[lp.subj][lp.idx][key];
  if (!data) return;
  const accent = lp.subj === 'ar' ? '#8dc63f' : '#10b981';

  const fill = document.getElementById('lp-fill');
  if (fill) {
    fill.style.width = ((lp.step / 6) * 100) + '%';
    fill.style.background = 'linear-gradient(90deg, ' + accent + ', ' + accent + 'dd)';
  }

  document.querySelectorAll('.lp-step').forEach(s => s.classList.remove('on'));
  const box = document.getElementById('lp-step-' + key);
  if (!box) return;
  box.classList.add('on'); box.innerHTML = '';

  const nextBtn = document.getElementById('lp-next');
  if (nextBtn) nextBtn.classList.remove('on');

  if (key === 'concept' || key === 'examples' || key === 'progression' || key === 'solutions') {
    box.innerHTML = `<div class="lp-question"><div class="lp-content">${data}</div></div>`;
    if (nextBtn) {
      nextBtn.classList.add('on');
      nextBtn.innerHTML = 'متابعة <i class="fa-solid fa-arrow-left"></i>';
    }
    renderMathIn(box);
  } else if (key === 'result') {
    const pct = Math.round((lp.score / 3) * 100);
    let badge, verdict, btn;
    if (pct >= 80) { badge = 'great'; verdict = 'مستوى إتقان ممتاز!'; btn = 'إنهاء'; Sound.ok(); }
    else if (pct >= 50) { badge = 'ok'; verdict = 'إتقان متوسط — راجع الدرس'; btn = 'إنهاء'; }
    else { badge = 'poor'; verdict = 'لم تصل بعد — أعد الدرس'; btn = 'إعادة'; Sound.err(); }
    box.innerHTML = `
      <div class="result-hero">
        <div class="result-badge ${badge}">${pct}%</div>
        <div class="result-title">نتيجة الدرس</div>
        <div class="result-sub">${verdict}</div>
        <div class="result-stats">
          <div class="result-stat ok"><h5>${lp.score}</h5><p>صحيحة</p></div>
          <div class="result-stat ko"><h5>${lp.mistakes}</h5><p>خاطئة</p></div>
        </div>
      </div>
    `;
    if (nextBtn) { nextBtn.classList.add('on'); nextBtn.textContent = btn; }
  } else if (key === 'diag' || key === 'exercises') {
    const isDiag = key === 'diag';
    const questions = isDiag ? [data] : data;
    const q = questions[0];
    let html = `<div class="lp-question">
      <div class="lp-kicker" style="color:${accent}">${isDiag ? 'التشخيص' : 'تمارين تطبيقية'}</div>
      <div class="lp-title">${q.q}</div>`;
    q.opts.forEach((o, i) => {
      const ex = (o.ex || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      html += `<button class="opt" onclick="answerLp(this, ${o.c}, '${ex}')">${o.t}</button>`;
    });
    html += `<div class="feedback" id="lp-fb"></div></div>`;
    box.innerHTML = html;
    renderMathIn(box);
  }
}
async function answerLp(btn, correct, ex) {
  const box = btn.parentElement;
  box.querySelectorAll('.opt').forEach(o => {
    o.onclick = null;
    if (o !== btn) o.style.opacity = '.5';
  });
  const fb = box.querySelector('#lp-fb');
  if (fb) fb.classList.add('on');
  if (correct) {
    Sound.ok(); btn.classList.add('correct'); lp.score++;
    if (fb) { fb.classList.add('ok'); fb.innerHTML = `✅ ${ex || 'أحسنت!'}`; }
  } else {
    Sound.err(); btn.classList.add('wrong'); lp.mistakes++;
    if (fb) { fb.classList.add('ko'); fb.innerHTML = `❌ ${ex || 'راجع القاعدة.'}`; }
    if (typeof window.useHeart === 'function') {
        window.useHeart();
    }
  }
  const nextBtn = document.getElementById('lp-next');
  if (nextBtn) nextBtn.classList.add('on');
  try {
    const r = await EcoDB.addXP(correct ? 15 : 3);
    if (r.leveledUp) toast(`🎖️ مستوى جديد: ${r.level}`, 'ok');
  } catch(e) {}
}
function nextLp() {
  Sound.tap();
  if (lp.step === 6) {
    try {
      EcoDB.saveAttempt({
        subject: lp.subj,
        year: new Date().getFullYear(),
        score: lp.score,
        total: 3,
        type: 'lesson',
        meta: { lessonIdx: lp.idx, lessonTitle: learningDB[lp.subj][lp.idx].title }
      });
    } catch(e) {}
    closeOverlay('lp');
    if (lp.score < 2) setTimeout(() => openLp(lp.subj, lp.idx), 400);
    return;
  }
  lp.step++;
  renderLp();
}
