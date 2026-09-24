/* ═══ Archive ═══ */
const archiveYears = [];
for (let y = 2026; y >= 2020; y--) archiveYears.push(y);
let archSubj = 'ar', archYear = 2026;

const archive = {
  "ar": {},
  "math": {},
  "fr": {},
  "en": {},
  "physics": {},
  "science": {},
  "islamic": {},
  "civics": {},
  "history": {}
};

function renderYears() {
  const grid = document.getElementById('years');
  if (!grid) return;
  grid.innerHTML = '';
  const store = archive[archSubj] || {};
  archiveYears.forEach(y => {
    const has = !!store[y];
    const el = document.createElement('div');
    el.className = 'year' + (y === archYear ? ' on' : '');
    el.innerHTML = `<strong>${y}</strong><small>${has ? 'متاح' : 'قريباً'}</small>`;
    el.onclick = () => { Sound.tap(); archYear = y; renderYears(); loadExam(); };
    grid.appendChild(el);
  });
}
function setArchSubj(s, btn) {
  Sound.tap();
  archSubj = s;
  document.querySelectorAll('.chips .chip').forEach(c => c.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderYears();
  loadExam();
}
function loadExam() {
  const data = (archive[archSubj] || {})[archYear];
  const titleEl = document.getElementById('paper-title');
  const bodyEl = document.getElementById('paper-body');
  if (data) {
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.innerHTML = data.paper;
    renderMathIn(bodyEl);
    const savedAttempt = localStorage.getItem(`bem-attempt-${archYear}-${archSubj}`);
    if (savedAttempt) {
      const ta = document.getElementById(`attempt-${archYear}-${archSubj}`);
      const sol = document.getElementById(`solution-${archYear}-${archSubj}`);
      if (ta && sol) {
        ta.value = savedAttempt;
        ta.readOnly = true;
        ta.style.border = '2px solid #10b981';
        ta.style.backgroundColor = '#fdfaf3';
        ta.style.color = '#064e3b';
        sol.style.display = 'block';
      }
    }
  } else {
    if (titleEl) titleEl.textContent = `دورة ${archYear}`;
    if (bodyEl) bodyEl.innerHTML = '<p style="text-align:center;padding:40px;color:#6b5d52">الموضوع قيد التحضير.</p>';
  }
}
