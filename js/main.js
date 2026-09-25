/* ═══ Global Error Handler ═══ */
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
});



/* ═══ Auto-Init ═══ */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof window.updateGlobalUI === 'function') await window.updateGlobalUI();
  loadTheme();
  renderUserName();
  try { renderCard(); } catch(e) {}
  renderLessons();
  renderYears();
  loadExam();
  if (typeof window.loadAvatar === 'function') window.loadAvatar();
  if (typeof window.loadDream === 'function') window.loadDream();
  if (typeof window.initPathTab === 'function') window.initPathTab();
  
  // Active Study Time Tracker (Global)
  let lastActivity = Date.now();
  document.addEventListener('mousemove', () => lastActivity = Date.now());
  document.addEventListener('keydown', () => lastActivity = Date.now());
  document.addEventListener('click', () => lastActivity = Date.now());
  
  setInterval(() => {
      // If active in the last minute, log 60 seconds of study time
      if (Date.now() - lastActivity < 60000) {
          if (typeof EcoDB !== 'undefined' && EcoDB.logSession) {
              EcoDB.logSession('active_study', 60).catch(() => {});
          }
      }
  }, 60000);
});
function saveAttempt(year, subj) {
  const ta = document.getElementById(`attempt-${year}-${subj}`);
  const sol = document.getElementById(`solution-${year}-${subj}`);
  
  if (ta.value.trim() === '') {
    alert('الرجاء كتابة محاولتك أولاً قبل الحفظ والمقارنة.');
    return;
  }
  
  localStorage.setItem(`bem-attempt-${year}-${subj}`, ta.value);
  
  sol.style.display = 'block';
  
  ta.readOnly = true;
  ta.style.border = '2px solid #10b981';
  ta.style.backgroundColor = '#fdfaf3';
  ta.style.color = '#064e3b';
  
  Sound.ok();
  
  // Scroll to solution
  sol.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
