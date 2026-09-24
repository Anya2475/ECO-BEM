/* ═══ Dashboard ═══ */
async function renderDashboard() {
  try {
    const d = await EcoDB.getDashboard();
    const box = document.getElementById('dashboard-content');
    if (!box) return;
    box.innerHTML = `
      <div class="grid-3" style="margin-bottom:24px">
        <div class="stat-tile">
          <div class="icon" style="background:rgba(141,198,63,.15);color:#a4d466">
            <i class="fa-solid fa-fire"></i>
          </div>
          <div><h4>${d.streak.current}</h4><p>يوم متتالٍ</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(14,165,233,.15);color:#38bdf8">
            <i class="fa-solid fa-clock"></i>
          </div>
          <div><h4>${d.totalStudyHours}h</h4><p>وقت الدراسة</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(16,185,129,.15);color:#34d399">
            <i class="fa-solid fa-bolt"></i>
          </div>
          <div><h4>${d.xp}</h4><p>XP · مستوى ${d.level}</p></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:22px">
        <div class="section-label">التقدّم للمستوى ${d.level + 1}</div>
        <div class="mastery">
          <div class="mastery-head">
            <strong>${d.xp} / ${d.nextLevelXP} XP</strong>
            <span style="color:#a4d466">${d.levelProgress}%</span>
          </div>
          <div class="mastery-track">
            <div class="mastery-fill" style="width:${d.levelProgress}%"></div>
          </div>
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:22px">
        <div class="stat-tile">
          <div class="icon" style="background:rgba(141,198,63,.15);color:#a4d466">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div><h4>${d.totalAttempts}</h4><p>محاولة</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(251,191,36,.15);color:#fbbf24">
            <i class="fa-solid fa-trophy"></i>
          </div>
          <div><h4>${d.achievements}</h4><p>إنجاز</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(16,185,129,.15);color:#34d399">
            <i class="fa-solid fa-medal"></i>
          </div>
          <div><h4>${d.streak.best}</h4><p>أفضل سلسلة</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(14,165,233,.15);color:#38bdf8">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div><h4>${d.recentAchievements.length}</h4><p>حديث</p></div>
        </div>
      </div>
    `;
    const myXp = document.getElementById('my-xp');
    if (myXp) myXp.textContent = `${d.xp} XP`;
    const accXp = document.getElementById('acc-xp');
    if (accXp) accXp.textContent = d.xp;
  } catch(e) {
    console.error('Dashboard error:', e);
    const box = document.getElementById('dashboard-content');
    if (box) box.innerHTML = '<div class="card" style="text-align:center;color:#ef4444">⚠️ فشل تحميل الإحصائيات</div>';
  }
}



/* ═══ Analytics ═══ */
async function renderAnalytics() {
  const box = document.getElementById('analytics-content');
  if (!box) return;
  
  box.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#8dc63f;"></i></div>';

  let stats = [];
  try {
      stats = JSON.parse(localStorage.getItem('eco_bem_stats_v2')) || [];
  } catch(e) {}
  
  const coins = parseInt(localStorage.getItem('eco_user_coins_v2')) || 0;
  const dbData = await EcoDB.getDashboard();
  
  if (stats.length === 0 && coins === 0 && dbData.xp === 0) {
      box.innerHTML = `
        <div class="card" style="text-align:center; padding:40px;">
          <div class="section-label" style="text-align:center;">📊 التحليلات البيانية</div>
          <p style="color:var(--text-muted); margin-top:20px;">
            ابدأ بحل الحوليات والاختبارات لتسجيل نشاطك وعرض التحليلات هنا.
          </p>
        </div>
      `;
      return;
  }
  
  let historyHtml = stats.slice(0, 5).map(s => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:10px;">
        <div>
            <div style="font-weight:bold; color:white;">${s.reason || 'نشاط'}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${s.date}</div>
        </div>
        <div style="color:#10b981; font-weight:bold;">+${s.amount} 🪙</div>
    </div>
  `).join('');
  
  box.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:15px;">
        <div class="card" style="background:linear-gradient(135deg, #2b5876, #4e4376); text-align:center; padding:15px; border:none;">
          <h3 style="color:white; margin-bottom:10px; font-size:0.9rem;">إجمالي العملات</h3>
          <div style="font-size:2rem; font-weight:900; color:#fbbf24;">${coins} <i class="fa-solid fa-coins"></i></div>
        </div>
        
        <div class="card" style="background:linear-gradient(135deg, #11998e, #38ef7d); text-align:center; padding:15px; border:none;">
          <h3 style="color:white; margin-bottom:10px; font-size:0.9rem;">شعلة الاستمرارية</h3>
          <div style="font-size:2rem; font-weight:900; color:#fff;">${dbData.streak?.current || 0} <i class="fa-solid fa-fire" style="color:#f97316;"></i></div>
          <div style="font-size:0.75rem; color:rgba(255,255,255,0.8);">أفضل شعلة: ${dbData.streak?.best || 0}</div>
        </div>
    </div>
    
    <div class="card" style="margin-bottom:15px; border-left:4px solid #8b5cf6;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <strong style="color:var(--text-primary);">المستوى ${dbData.level}</strong>
            <span style="color:var(--text-muted); font-size:0.8rem;">${dbData.xp} XP</span>
        </div>
        <div style="width:100%; height:8px; background:var(--bg); border-radius:4px; overflow:hidden;">
            <div style="height:100%; width:${dbData.levelProgress}%; background:#8b5cf6; border-radius:4px;"></div>
        </div>
        <div style="text-align:left; font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
            متبقي ${dbData.nextLevelXP - dbData.xp} XP للمستوى التالي
        </div>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:15px;">
        <div class="card" style="text-align:center; padding:15px;">
            <i class="fa-solid fa-list-check" style="font-size:1.5rem; color:#3b82f6; margin-bottom:8px;"></i>
            <div style="font-size:1.2rem; font-weight:bold; color:var(--text-primary);">${dbData.totalAttempts}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">اختبارات منجزة</div>
        </div>
        <div class="card" style="text-align:center; padding:15px;">
            <i class="fa-solid fa-clock" style="font-size:1.5rem; color:#ec4899; margin-bottom:8px;"></i>
            <div style="font-size:1.2rem; font-weight:bold; color:var(--text-primary);">${dbData.totalStudyHours}h</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">وقت الدراسة</div>
        </div>
    </div>
    
    <div class="card">
      <div class="section-label" style="margin-bottom:15px;">⏱️ أحدث سجلات العملات</div>
      ${historyHtml || '<p style="color:var(--text-muted); font-size:0.9rem;">لا توجد نشاطات مسجلة بعد.</p>'}
    </div>
  `;
}
