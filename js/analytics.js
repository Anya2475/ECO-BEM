async function initAnalytics() {
    const container = document.getElementById('analytics-container');
    if (!container) return;

    // Fetch stats
    let totalXp = 0;
    let currentStreak = 0;
    let totalStudyTime = 0;
    
    let mathPerf = 0, arabicPerf = 0, sciencePerf = 0, globalAccuracy = 0;
    
    if (typeof EcoDB !== 'undefined') {
        const d = await EcoDB.getDashboard();
        totalXp = d.xp || 0;
        currentStreak = d.streak?.current || 0;
        totalStudyTime = d.totalStudyTime || 0; // seconds
        
        mathPerf = d.mathPerf || 0;
        arabicPerf = d.arabicPerf || 0;
        sciencePerf = d.sciencePerf || 0;
        globalAccuracy = d.globalAccuracy || 0;
    } else {
        totalXp = window.userXP || 0;
    }

    // Format study time (totalStudyTime is in seconds)
    let studyHours = Math.floor(totalStudyTime / 3600);
    let studyMinutes = Math.floor((totalStudyTime % 3600) / 60);
    let timeString = `${studyHours} ساعة و ${studyMinutes} دقيقة`;
    if (totalStudyTime === 0) timeString = "0 دقيقة";

    let html = `
    <div style="padding: 20px;">
        <!-- Overview Cards -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:25px;">
            <div style="background:#1e293b; border-radius:16px; padding:20px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                <i class="fa-solid fa-clock" style="font-size:2rem; color:#38bdf8; margin-bottom:10px;"></i>
                <div style="font-size:1.5rem; font-weight:900; color:#f8fafc;">${studyHours}h ${studyMinutes}m</div>
                <div style="font-size:0.8rem; color:#94a3b8;">وقت الدراسة الإجمالي</div>
            </div>
            
            <div style="background:#1e293b; border-radius:16px; padding:20px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                <i class="fa-solid fa-bullseye" style="font-size:2rem; color:#a4d466; margin-bottom:10px;"></i>
                <div style="font-size:1.5rem; font-weight:900; color:#f8fafc;">${globalAccuracy}%</div>
                <div style="font-size:0.8rem; color:#94a3b8;">دقة الإجابات (متوسط)</div>
            </div>
        </div>

        <!-- Subject Performance Bars -->
        <h3 style="margin: 0 0 15px; font-size:1.2rem; color:#f8fafc;"><i class="fa-solid fa-chart-bar" style="color:#fbbf24; margin-left:8px;"></i> تفوقك في المواد</h3>
        
        <div style="background:#1e293b; border-radius:16px; padding:20px; border:1px solid rgba(255,255,255,0.05); margin-bottom:25px;">
            
            <!-- Subject 1 -->
            <div style="margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-weight:700; color:#e2e8f0;"><i class="fa-solid fa-calculator" style="color:#38bdf8; width:20px;"></i> الرياضيات</span>
                    <span style="font-weight:700; color:#38bdf8;">${mathPerf}%</span>
                </div>
                <div style="height:10px; background:#334155; border-radius:10px; overflow:hidden;">
                    <div style="height:100%; width:${mathPerf}%; background:linear-gradient(90deg, #0ea5e9, #38bdf8); border-radius:10px; transition:width 1s ease-out;"></div>
                </div>
            </div>
            
            <!-- Subject 2 -->
            <div style="margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-weight:700; color:#e2e8f0;"><i class="fa-solid fa-feather" style="color:#a4d466; width:20px;"></i> اللغة العربية</span>
                    <span style="font-weight:700; color:#a4d466;">${arabicPerf}%</span>
                </div>
                <div style="height:10px; background:#334155; border-radius:10px; overflow:hidden;">
                    <div style="height:100%; width:${arabicPerf}%; background:linear-gradient(90deg, #65a30d, #a4d466); border-radius:10px; transition:width 1s ease-out; transition-delay:0.2s;"></div>
                </div>
            </div>
            
            <!-- Subject 3 -->
            <div style="margin-bottom:5px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-weight:700; color:#e2e8f0;"><i class="fa-solid fa-flask" style="color:#fbbf24; width:20px;"></i> العلوم الطبيعية</span>
                    <span style="font-weight:700; color:#fbbf24;">${sciencePerf}%</span>
                </div>
                <div style="height:10px; background:#334155; border-radius:10px; overflow:hidden;">
                    <div style="height:100%; width:${sciencePerf}%; background:linear-gradient(90deg, #d97706, #fbbf24); border-radius:10px; transition:width 1s ease-out; transition-delay:0.4s;"></div>
                </div>
            </div>
        </div>

        <!-- Heatmap / Consistency (Simulated Visual) -->
        <h3 style="margin: 0 0 15px; font-size:1.2rem; color:#f8fafc;"><i class="fa-solid fa-calendar-days" style="color:#f97316; margin-left:8px;"></i> استمرارية التعلم</h3>
        <div style="background:#1e293b; border-radius:16px; padding:20px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
            <p style="color:#94a3b8; font-size:0.9rem; margin-top:0;">شعلتك الحالية: <strong style="color:#f97316;">${currentStreak} أيام 🔥</strong></p>
            <div style="display:flex; justify-content:center; gap:6px; margin-top:15px; flex-wrap:wrap;">
    `;

    // Render 14 days of history blocks
    const pastDays = 14;
    for(let i = pastDays; i >= 1; i--) {
        const isActiveDay = i <= currentStreak || (Math.random() > 0.4 && i < 10);
        let blockColor = '#334155'; // empty
        if (isActiveDay) {
            const intensity = Math.random();
            if (intensity > 0.7) blockColor = '#a4d466'; // high activity
            else if (intensity > 0.3) blockColor = '#8dc63f'; // med activity
            else blockColor = '#65a30d'; // low activity
        }
        html += `<div style="width:20px; height:20px; border-radius:4px; background:${blockColor};" title="يوم ${i}"></div>`;
    }

    html += `
            </div>
            <div style="font-size:0.75rem; color:#64748b; margin-top:10px;">أخر أسبوعين من النشاط (تقديري)</div>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

// Hook into overlay opening
const analyticsOriginalOpenOverlay = window.openOverlay;
window.openOverlay = function(id) {
    if (id === 'analytics') initAnalytics();
    if (analyticsOriginalOpenOverlay) analyticsOriginalOpenOverlay(id);
};
