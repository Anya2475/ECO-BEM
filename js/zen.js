/* ═══ Zen ═══ */
const moods = {
  fear: ["🛡️ **الخطوة 1:** الخوف شعور طبيعي. المعلومات في ذاكرتك.", "🧠 **الخطوة 2:** تنفّس بعمق واقرأ السند بتؤدة.", "⭐ **الخطوة 3:** ثق بما راجعته."],
  scattered: ["🎯 **الخطوة 1:** طبّق قاعدة الـ 5 دقائق.", "☕ **الخطوة 2:** خذ استراحة 5 دقائق.", "🏆 **الخطوة 3:** تذكّر هدفك."],
  time: ["⏳ **الخطوة 1:** ساعتان تكفيان لمراجعة درس.", "🧭 **الخطوة 2:** تجاوز السؤال الصعب.", "✨ **الخطوة 3:** الهدوء هو السر."],
  ready: ["🚀 **الخطوة 1:** استثمر حماسك.", "💎 **الخطوة 2:** ركّز على الأفخاخ.", "👑 **الخطوة 3:** واصل."],
  tired: ["🛌 **الخطوة 1:** خذ قسطاً من الراحة، عقلك يحتاج للهدوء.", "💧 **الخطوة 2:** اشرب بعض الماء واستمع للموسيقى الهادئة.", "💤 **الخطوة 3:** النوم الجيد هو مفتاح التركيز."],
  bored: ["🎨 **الخطوة 1:** غير مكان دراستك أو طريقة مراجعتك.", "🧩 **الخطوة 2:** جرب حل تحدي جديد بدلاً من القراءة.", "🎁 **الخطوة 3:** خذ استراحة قصيرة وكافئ نفسك."],
  lost: ["🗺️ **الخطوة 1:** لا بأس، ابدأ من نقطة صغيرة ومألوفة.", "🤖 **الخطوة 2:** اطلب المساعدة من المرشد الجزاء صغيرة جداً."],
  confident: ["🌟 **الخطوة 1:** ممتاز! شارك معرفتك مع زملائك.", "🔥 **الخطوة 2:** اختبر نفسك بأسئلة أصعب.", "🏅 **الخطوة 3:** أنت على الطريق الصحيح، استمر!"]
};

const moodLabels = {
  fear: '😟 خائف من النسيان',
  scattered: '🌀 مشتت ذهنياً',
  time: '⏳ ضغط الوقت يربكني',
  ready: '🚀 متحمس وطاقتي عالية',
  tired: '😴 أشعر بالإرهاق',
  bored: '🥱 أشعر بالملل',
  lost: '❓ تائه ولا أعرف من أين أبدأ',
  confident: '😎 واثق من نفسي'
};

function generateMoodButtons() {
    const grid = document.getElementById('dynamic-mood-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Pick 4 random moods
    const keys = Object.keys(moodLabels);
    const shuffled = keys.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    
    selected.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'mood';
        btn.onclick = function() { pickMood(this, key); };
        btn.innerText = moodLabels[key];
        grid.appendChild(btn);
    });
}

let moodKey = null, moodIdx = 0;
function pickMood(btn, key) {
  Sound.tap();
  document.querySelectorAll('.mood').forEach(m => m.classList.remove('on'));
  btn.classList.add('on');
  moodKey = key; moodIdx = 0;
  const resp = document.getElementById('mood-resp');
  if (resp) resp.classList.add('on');
  renderMood();
  try { EcoDB.logMood(key); } catch(e) {}
}
function renderMood() {
  const el = document.getElementById('mood-text');
  if (el && moodKey) el.innerHTML = AITeacher.renderMarkdown(moods[moodKey][moodIdx]);
}
function nextMood() {
  Sound.ok();
  moodIdx++;
  if (moodIdx >= moods[moodKey].length) moodIdx = 0;
  renderMood();
}

let breathing = false, breathTimer = null;
function toggleBreath() { breathing ? stopBreath() : startBreath(); }
function startBreath() {
  breathing = true; Sound.ok();
  const btn = document.getElementById('breath-btn');
  if (btn) btn.textContent = 'إيقاف';
  const ball = document.getElementById('ball');
  const label = document.getElementById('breath-label');
  function cycle() {
    if (!breathing) return;
    if (label) label.textContent = 'شهيق...';
    if (ball) ball.className = 'breath-ball grow';
    setTimeout(() => {
      if (!breathing) return;
      if (label) label.textContent = 'احبس...';
      if (ball) ball.className = 'breath-ball grow hold';
      setTimeout(() => {
        if (!breathing) return;
        if (label) label.textContent = 'زفير...';
        if (ball) ball.className = 'breath-ball';
      }, 4000);
    }, 4000);
  }
  cycle();
  breathTimer = setInterval(cycle, 12000);
}
function stopBreath() {
  breathing = false;
  clearInterval(breathTimer);
  const ball = document.getElementById('ball');
  if (ball) ball.className = 'breath-ball';
  const label = document.getElementById('breath-label');
  if (label) label.textContent = 'جاهز؟';
  const btn = document.getElementById('breath-btn');
  if (btn) btn.textContent = 'ابدأ الجلسة';
}

let pomoSec = 25 * 60, pomoTimer = null, pomoRun = false;
function renderPomo() {
  const m = Math.floor(pomoSec / 60), s = pomoSec % 60;
  const el = document.getElementById('pomo');
  if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function togglePomo() {
  Sound.tap();
  const btn = document.getElementById('pomo-btn');
  if (pomoRun) {
    clearInterval(pomoTimer); pomoRun = false;
    if (btn) btn.textContent = 'استئناف';
  } else {
    pomoRun = true;
    if (btn) btn.textContent = 'إيقاف';
    pomoTimer = setInterval(() => {
      if (pomoSec > 0) { pomoSec--; renderPomo(); }
      else {
        clearInterval(pomoTimer); pomoRun = false;
        Sound.ok(); toast('🎉 انتهت الجلسة!', 'ok');
        EcoDB.logSession('pomodoro', 25 * 60, { complete: true }).catch(() => {});
        EcoDB.addXP(25).catch(() => {});
        resetPomo();
      }
    }, 1000);
  }
}
function resetPomo() {
  clearInterval(pomoTimer); pomoRun = false;
  pomoSec = 25 * 60;
  renderPomo();
  const btn = document.getElementById('pomo-btn');
  if (btn) btn.textContent = 'بدء';
}
