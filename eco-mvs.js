/* ==========================================================================
   ECO-BEM ENGINE - FREEMIUM ARCHITECTURE (V17.6 - ULTIMATE DATABASE SYNC)
   - كبسولة مغلقة (IIFE) + ربط مباشر مع قاعدة بيانات database.js
   - واجهة تطبيق هاتف (Bottom Navigation) + المساعد الذكي + الفخاخ الوزارية.
   ========================================================================== */

(function() {
    "use strict";

    console.log("ECO-BEM Engine V17.6: تم تفعيل الربط الشامل مع database.js والمساعد الذكي.");

    var ECO_STORAGE_KEY = "ecoBem_v17_6_db_sync";

    var ECO_SUBJECTS = {
        math: { name: "الرياضيات", icon: "📐", themeColor: "#2563eb", isLocked: false },
        arabic: { name: "اللغة العربية", icon: "📖", themeColor: "#7c3aed", isLocked: false },
        physics: { name: "الفيزياء", icon: "⚡", themeColor: "#0284c7", isLocked: true },
        science: { name: "العلوم", icon: "🔬", themeColor: "#059669", isLocked: true },
        french: { name: "الفرنسية", icon: "🇫🇷", themeColor: "#db2777", isLocked: true },
        english: { name: "الإنجليزية", icon: "🇬🇧", themeColor: "#ea580c", isLocked: true },
        history_geo: { name: "التاريخ والجغرافيا", icon: "🌍", themeColor: "#d97706", isLocked: true },
        civics: { name: "تربية مدنية", icon: "⚖️", themeColor: "#4f46e5", isLocked: true },
        islamic: { name: "تربية إسلامية", icon: "🕌", themeColor: "#16a34a", isLocked: true }
    };

    var RAFIKI_CONFIG = {
        calm: { label: "مرتاح 😊", title: "طاقتك ممتازة! 🌱", msg: "هذا هو الوقت المثالي لامتصاص المعلومات.", theme: "#10b981" },
        neutral: { label: "عادي 😐", title: "خطوة خطوة نحو التفوق 🎯", msg: "الاستمرارية المنضبطة هي سر التميز.", theme: "#3b82f6" },
        anxious: { label: "قلق 😟", title: "لست وحدك 💚", msg: "الأخطاء هي فرص للتعلم، لا تقلق.", theme: "#8b5cf6" },
        stressed: { label: "متوتر 😣", title: "اهدأ قليلاً 🌿", msg: "استعمل تمرين التنفس أسفله وسنراجع ببطء.", theme: "#f59e0b" },
        frustrated: { label: "محبط 😔", title: "كل الأبطال تعثروا 🌟", msg: "لن نتجاوز أي نقطة حتى تفهمها.", theme: "#ef4444" }
    };

    var ecoCurrent = { 
        subjectKey: null, lessonIndex: 0, 
        mood: null, xp: 0, badges: [], 
        activeTab: 'home', soundEnabled: true, userName: "بطل البيام" 
    };

    function saveEcoEngineState() { 
        try { 
            localStorage.setItem(ECO_STORAGE_KEY, JSON.stringify(ecoCurrent)); 
            if (typeof window.saveToDB === 'function') {
                window.saveToDB({ xp: ecoCurrent.xp });
            }
        } catch (e) {} 
    }
    function loadEcoEngineState() {
        try { 
            var saved = localStorage.getItem(ECO_STORAGE_KEY); 
            if (saved) {
                var parsed = JSON.parse(saved);
                ecoCurrent.subjectKey = parsed.subjectKey; 
                ecoCurrent.lessonIndex = parsed.lessonIndex; 
                ecoCurrent.mood = parsed.mood;
                ecoCurrent.xp = parsed.xp || 0; 
                ecoCurrent.badges = parsed.badges || [];
                ecoCurrent.soundEnabled = parsed.soundEnabled !== undefined ? parsed.soundEnabled : true;
            }
        } catch (e) {}
    }

    function injectNativeStyles() {
        var existing = document.getElementById("eco-native-styles");
        if (existing) existing.remove();
        var style = document.createElement("style");
        style.id = "eco-native-styles";
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
            
            #eco-app-root { position: relative; width: 100%; max-width: 600px; margin: 20px auto 40px; background: #0f172a; border-radius: 30px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); overflow: hidden; font-family: 'Cairo', sans-serif; direction: rtl; color: #f8fafc; display: flex; flex-direction: column; min-height: 85vh; border: 1px solid rgba(255,255,255,0.05); }
            #eco-main-content { flex: 1; overflow-y: auto; padding: 24px 20px 100px; scroll-behavior: smooth; }
            #eco-main-content::-webkit-scrollbar { width: 6px; } #eco-main-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            
            .eco-bottom-nav { position: absolute; bottom: 0; left: 0; right: 0; height: 75px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(15px); border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-around; align-items: center; padding: 0 10px; z-index: 100; border-bottom-left-radius: 30px; border-bottom-right-radius: 30px; }
            .eco-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 16px; cursor: pointer; transition: 0.3s; color: #64748b; font-size: 12px; font-weight: 700; gap: 4px; }
            .eco-nav-item i { font-size: 22px; font-style: normal; }
            .eco-nav-item.active { color: #38bdf8; background: rgba(56, 189, 248, 0.1); transform: translateY(-3px); }
            
            .eco-top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .eco-user-info { display: flex; align-items: center; gap: 12px; }
            .eco-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #38bdf8, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 24px; border: 2px solid #1e293b; box-shadow: 0 4px 10px rgba(37,99,235,0.3); }
            .eco-greeting { font-size: 14px; color: #94a3b8; margin: 0; }
            .eco-username { font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0; }
            .eco-sound-toggle { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; color: #cbd5e1; transition: 0.2s; }
            .eco-sound-toggle.off { color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }

            .eco-daily-quest { background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.05)); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 20px; padding: 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .eco-daily-quest h4 { margin: 0 0 4px; color: #fbbf24; font-size: 16px; }
            .eco-daily-quest p { margin: 0; font-size: 13px; color: #cbd5e1; }
            .eco-quest-reward { background: #fbbf24; color: #0f172a; padding: 6px 12px; border-radius: 12px; font-weight: 900; font-size: 14px; }

            .eco-section-title { font-size: 18px; font-weight: 800; margin: 0 0 16px; display: flex; align-items: center; gap: 8px; }
            .eco-subjects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
            .eco-subject-card { background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 22px; padding: 18px 16px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
            .eco-subject-card:active { transform: scale(0.96); }
            .eco-subj-icon { font-size: 32px; background: rgba(255, 255, 255, 0.03); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 14px; }
            .eco-subj-name { font-size: 15px; font-weight: 800; color: #f1f5f9; }
            .eco-badge-free { font-size: 11px; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 4px 8px; border-radius: 8px; align-self: flex-start; }
            .eco-badge-pro { font-size: 11px; font-weight: 800; color: #fbbf24; background: rgba(245, 158, 11, 0.15); padding: 4px 8px; border-radius: 8px; align-self: flex-start; }
            .eco-subject-card.locked { opacity: 0.8; }

            .eco-leaderboard-item { display: flex; align-items: center; justify-content: space-between; background: #1e293b; padding: 16px; border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.03); }
            .eco-rank-1 { border-color: #fbbf24; background: linear-gradient(90deg, rgba(251,191,36,0.1), #1e293b); }
            .eco-rank-2 { border-color: #94a3b8; background: linear-gradient(90deg, rgba(148,163,184,0.1), #1e293b); }
            .eco-rank-3 { border-color: #d97706; background: linear-gradient(90deg, rgba(217,119,6,0.1), #1e293b); }
            
            .eco-profile-header { text-align: center; margin-bottom: 30px; }
            .eco-profile-avatar { width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #3b82f6); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 50px; border: 4px solid #1e293b; box-shadow: 0 10px 25px rgba(59,130,246,0.4); }
            .eco-level-badge { background: #38bdf8; color: #0f172a; font-weight: 900; font-size: 14px; padding: 4px 16px; border-radius: 20px; display: inline-block; margin-bottom: 10px; }
            .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
            .eco-stat-card { background: #1e293b; border-radius: 20px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
            .eco-stat-val { font-size: 28px; font-weight: 900; color: #f8fafc; margin-bottom: 4px; }
            .eco-stat-lbl { font-size: 13px; color: #94a3b8; }
            .eco-badges-container { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
            .eco-badge-big { width: 60px; height: 60px; border-radius: 50%; background: rgba(251,191,36,0.1); border: 2px solid #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 28px; }

            #eco-modal-overlay { position: fixed; inset: 0; z-index: 999999; background: #0f172a; display: flex; justify-content: center; font-family: 'Cairo', sans-serif; overflow-y: auto; }
            .eco-modal-container { width: 100%; max-width: 600px; background: #0f172a; padding: 24px 20px 100px; direction: rtl; color: #e2e8f0; min-height: 100vh; }
            .eco-modal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; padding-bottom: 14px; }
            .eco-close-btn { background: rgba(255, 255, 255, 0.08); color: #f8fafc; width: 42px; height: 42px; border-radius: 50%; cursor: pointer; border: none; font-size: 18px; }
            
            .eco-universal-header { background: rgba(255, 255, 255, 0.03); border-right: 5px solid #3b82f6; border-radius: 16px; padding: 18px; margin-bottom: 22px; }
            .eco-card { background: #1e293b; border-radius: 18px; padding: 20px; margin: 16px 0; border: 1px solid rgba(255, 255, 255, 0.04); line-height: 1.8; font-size:15px; }
            .eco-option-btn { width: 100%; text-align: right; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 12px; cursor: pointer; font-family: 'Cairo'; font-size: 15px; font-weight:600; transition: 0.2s; }
            .eco-option-btn.correct { background: rgba(34, 197, 94, 0.18); border-color: #22c55e; color: #86efac; }
            .eco-option-btn.wrong { background: rgba(239, 68, 68, 0.18); border-color: #ef4444; color: #fca5a5; }
            .eco-btn-primary { width: 100%; border: none; border-radius: 16px; padding: 16px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; cursor: pointer; font-family: 'Cairo'; font-weight: 800; font-size: 16px; margin-bottom:10px; }
            .eco-btn-secondary { width: 100%; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 16px; color: #94a3b8; cursor: pointer; font-family: 'Cairo'; font-weight: 700; font-size: 16px; }
            .eco-btn-whatsapp { background: linear-gradient(135deg, #25D366, #128C7E); color: white; border: none; border-radius: 16px; padding: 16px; cursor: pointer; font-size: 17px; font-weight: 800; font-family: 'Cairo'; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top:20px; }

            .rafiki-box { background: linear-gradient(180deg, #1e293b, rgba(30,41,59,0.5)); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 24px; margin-bottom: 24px; text-align:center; }
            .mood-pills { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px; }
            .mood-pill { border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.04); border-radius: 16px; padding: 12px 20px; cursor: pointer; color: #cbd5e1; font-weight: 700; transition: 0.2s; }
            .mood-pill.active { border-color: #34d399; background: rgba(52, 211, 153, 0.15); color: #34d399; transform:scale(1.05); }
            .breathing-circle-wrapper { position: relative; width: 180px; height: 180px; margin: 30px auto; display: flex; align-items: center; justify-content: center; }
            .breathing-circle { width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 0 40px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size:18px; transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1); }
            .breathing-circle.inhale { transform: scale(1.6); box-shadow: 0 0 60px rgba(16, 185, 129, 0.8); }
            .breathing-circle.exhale { transform: scale(0.9); }

            @keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
            @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    var audioCtx = null;
    function playSound(type) {
        if (!ecoCurrent.soundEnabled) return;
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            var osc = audioCtx.createOscillator(); var gain = audioCtx.createGain();
            
            if (type === 'xp') {
                osc.type = "sine"; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
                gain.gain.setValueAtTime(0, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1); gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
                osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.3);
            } else if (type === 'badge') {
                osc.type = "square"; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
                gain.gain.setValueAtTime(0, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1); gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
                osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.6);
            } else if (type === 'inhale') {
                osc.type = "sine"; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 2);
                gain.gain.setValueAtTime(0, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.5); gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
                osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 3);
            } else if (type === 'exhale') {
                osc.type = "sine"; osc.frequency.setValueAtTime(500, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 2);
                gain.gain.setValueAtTime(0, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.5); gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
                osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 3);
            }
        } catch (e) {}
    }

    function initEcoLauncher() {
        var root = document.querySelector(".app-container") || document.getElementById("tab-home") || document.body;
        var old = document.getElementById("eco-app-root"); if (old) old.remove();

        var appRoot = document.createElement("div");
        appRoot.id = "eco-app-root";
        
        appRoot.innerHTML = `
            <div id="eco-main-content"></div>
            <nav class="eco-bottom-nav">
                <div class="eco-nav-item ${ecoCurrent.activeTab==='home'?'active':''}" data-tab="home"><i>🏠</i>الرئيسية</div>
                <div class="eco-nav-item ${ecoCurrent.activeTab==='leader'?'active':''}" data-tab="leader"><i>🏆</i>الترتيب</div>
                <div class="eco-nav-item ${ecoCurrent.activeTab==='rafiki'?'active':''}" data-tab="rafiki"><i>🌿</i>رفيقي</div>
                <div class="eco-nav-item ${ecoCurrent.activeTab==='assistant'?'active':''}" data-tab="assistant" id="nav-assistant-btn"><i>🤖</i>المساعد</div>
                <div class="eco-nav-item ${ecoCurrent.activeTab==='profile'?'active':''}" data-tab="profile"><i>👤</i>حسابي</div>
            </nav>
        `;
        
        root.appendChild(appRoot);

        var navs = appRoot.querySelectorAll(".eco-nav-item");
        for (var i = 0; i < navs.length; i++) {
            navs[i].addEventListener("click", function() {
                var tab = this.dataset.tab;
                if (tab === 'assistant') {
                    openSmartAssistantModal();
                    return;
                }
                ecoCurrent.activeTab = tab; saveEcoEngineState();
                var allNavs = appRoot.querySelectorAll(".eco-nav-item");
                for (var k=0; k<allNavs.length; k++) allNavs[k].classList.remove("active");
                this.classList.add("active");
                renderActiveTab();
            });
        }
        renderActiveTab();
    }

    function renderActiveTab() {
        var content = document.getElementById("eco-main-content");
        content.innerHTML = "";
        content.style.animation = "none";
        content.offsetHeight; 
        content.style.animation = "popIn 0.3s ease-out forwards";

        if (ecoCurrent.activeTab === 'home') renderHomeTab(content);
        else if (ecoCurrent.activeTab === 'leader') renderLeaderboardTab(content);
        else if (ecoCurrent.activeTab === 'rafiki') renderRafikiTab(content);
        else if (ecoCurrent.activeTab === 'profile') renderProfileTab(content);
    }

    function openSmartAssistantModal() {
        var old = document.getElementById("eco-modal-overlay");
        if (old) old.remove();

        var overlay = document.createElement("div");
        overlay.id = "eco-modal-overlay";
        overlay.innerHTML = `
            <div class="eco-modal-container" style="max-width: 550px; display: flex; flex-direction: column; height: 85vh;">
                <div class="eco-modal-top">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🤖</span>
                        <h3 style="margin:0; font-size:18px; color: #38bdf8;">المساعد الذكي لـ ECO-BEM</h3>
                    </div>
                    <button type="button" class="eco-close-btn" id="eco-assistant-close">✕</button>
                </div>
                
                <div id="assistant-chat-box" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <div style="background: #1e293b; padding: 12px 16px; border-radius: 16px; max-width: 85%; align-self: flex-start; border-right: 3px solid #38bdf8; font-size:14px; line-height:1.6;">
                        مرحباً بك يا بطل! أنا مساعدك الذكي. اختر سؤالاً من الأسفل أو استفسر عما تريده لمراجعة شهادة التعليم المتوسط:
                    </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                    <button type="button" class="quick-question-btn" data-q="pgcd" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; font-weight:700;">كيف أحسب PGCD؟ 📐</button>
                    <button type="button" class="quick-question-btn" data-q="badل" style="background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.3); color: #c084fc; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; font-weight:700;">الفرق بين البدل وعطف البيان؟ 📖</button>
                    <button type="button" class="quick-question-btn" data-q="stress" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #34d399; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; font-weight:700;">كيف أتغلب على التوتر؟ 🌿</button>
                </div>
            </div>
        `;
        document.getElementById("eco-app-root").appendChild(overlay);

        document.getElementById("eco-assistant-close").addEventListener("click", function() {
            overlay.remove();
        });

        var qBtns = overlay.querySelectorAll(".quick-question-btn");
        for (var i = 0; i < qBtns.length; i++) {
            qBtns[i].addEventListener("click", function() {
                var qType = this.dataset.q;
                var chatBox = document.getElementById("assistant-chat-box");
                
                var userMsg = document.createElement("div");
                userMsg.style.cssText = "background: #2563eb; color: white; padding: 10px 14px; border-radius: 14px; max-width: 80%; align-self: flex-end; font-size: 14px;";
                userMsg.textContent = this.textContent;
                chatBox.appendChild(userMsg);

                setTimeout(function() {
                    var botMsg = document.createElement("div");
                    botMsg.style.cssText = "background: #1e293b; color: #f8fafc; padding: 12px 16px; border-radius: 16px; max-width: 85%; align-self: flex-start; border-right: 3px solid #38bdf8; font-size: 14px; line-height: 1.7;";
                    
                    if (qType === "pgcd") {
                        botMsg.innerHTML = "<b>حساب PGCD بخوارزمية إقليدس:</b><br>نقسم العدد الأكبر على الأصغر. الباقي نقسم عليه القاسم السابق، ونستمر هكذا حتى يصبح الباقي <b>صفرًا (0)</b>. آخر باقي غير معدوم هو الـ PGCD! 🎯";
                    } else if (qType === "badل") {
                        botMsg.innerHTML = "<b>الفرق باختصار:</b><br>• <b>عطف البيان:</b> تابع جامد يوضح متبوعه ويأتي بعد الألقاب وأسماء الإشارة (مثل: هذا الرجلُ).<br>• <b>البدل:</b> مقصود بالحكم بلا واسطة (مثل: قرأت الكتاب نصفه - بدل جزء من كل). 💡";
                    } else if (qType === "stress") {
                        botMsg.innerHTML = "<b>نصيحة المساعد الذكي:</b><br>التوتر شعور طبيعي! خذ نفساً عميقاً، ونظم وقتك، وتأكد أن مراجعتك المستمرة في منصة ECO-BEM ستضمن لك التفوق في البيام. أنت لها! 💚";
                    }
                    
                    chatBox.appendChild(botMsg);
                    chatBox.scrollTop = chatBox.scrollHeight;
                }, 400);

                chatBox.scrollTop = chatBox.scrollHeight;
            });
        }
    }

    function renderHomeTab(container) {
        var subjectsHtml = "";
        var subjectKeys = Object.keys(ECO_SUBJECTS);
        for (var i = 0; i < subjectKeys.length; i++) {
            var key = subjectKeys[i]; var item = ECO_SUBJECTS[key];
            var badge = item.isLocked ? '<span class="eco-badge-pro">🔒 PRO</span>' : '<span class="eco-badge-free">✨ مجاني</span>';
            subjectsHtml += `<div class="eco-subject-card ${item.isLocked ? 'locked' : ''}" data-skey="${key}"><span class="eco-subj-icon">${item.icon}</span><span class="eco-subj-name">${item.name}</span>${badge}</div>`;
        }

        container.innerHTML = `
            <div class="eco-top-header">
                <div class="eco-user-info">
                    <div class="eco-avatar">👨‍🎓</div>
                    <div>
                        <p class="eco-greeting">مرحباً بك،</p>
                        <h3 class="eco-username">${ecoCurrent.userName}</h3>
                    </div>
                </div>
                <div class="eco-sound-toggle ${ecoCurrent.soundEnabled?'':'off'}" id="toggle-sound">${ecoCurrent.soundEnabled?'🔔':'🔕'}</div>
            </div>

            <div class="eco-daily-quest">
                <div>
                    <h4>🎯 تحدي اليوم</h4>
                    <p>أتمم درساً واجمع النقاط!</p>
                </div>
                <div class="eco-quest-reward">+50 XP</div>
            </div>

            <h3 class="eco-section-title">📚 المواد الدراسية</h3>
            <div class="eco-subjects-grid">${subjectsHtml}</div>
        `;

        document.getElementById("toggle-sound").addEventListener("click", function() {
            ecoCurrent.soundEnabled = !ecoCurrent.soundEnabled; saveEcoEngineState();
            this.textContent = ecoCurrent.soundEnabled ? '🔔' : '🔕';
            this.className = "eco-sound-toggle " + (ecoCurrent.soundEnabled ? "" : "off");
        });

        var cards = container.querySelectorAll("[data-skey]");
        for (var j = 0; j < cards.length; j++) {
            cards[j].addEventListener("click", function() {
                var sKey = this.dataset.skey;
                if (ECO_SUBJECTS[sKey].isLocked) showPaywallModal(ECO_SUBJECTS[sKey]);
                else openEcoSubjectFlow(sKey);
            });
        }
    }

    async function renderLeaderboardTab(container) {
        container.innerHTML = `
            <h3 class="eco-section-title" style="justify-content:center; font-size:24px; margin-bottom:30px;">🏆 أبطال الأسبوع</h3>
            <div style="text-align:center;color:#64748b;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> جاري إحضار ترتيب الأبطال الحقيقي...</div>
        `;

        try {
            const API_BASE = window.API_URL || '';
            const res = await fetch(API_BASE + '/leaderboard');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            
            let html = `<h3 class="eco-section-title" style="justify-content:center; font-size:24px; margin-bottom:30px;">🏆 أبطال BEM</h3>`;
            
            if (data.length === 0) {
                html += `<div style="text-align:center;color:#94a3b8;">لا يوجد أبطال بعد. كن أنت الأول!</div>`;
            }

            // Top 5 real users
            const topUsers = data.slice(0, 5);
            let myRank = '--';
            
            topUsers.forEach((user, index) => {
                const rank = index + 1;
                let rankStyle = "color:#94a3b8;";
                let avatar = "👨‍🎓";
                let rowClass = "eco-leaderboard-item";
                
                if (rank === 1) { rankStyle = "color:#fbbf24;"; avatar = "🥇"; rowClass += " eco-rank-1"; }
                if (rank === 2) { rankStyle = "color:#94a3b8;"; avatar = "🥈"; rowClass += " eco-rank-2"; }
                if (rank === 3) { rankStyle = "color:#b45309;"; avatar = "🥉"; }

                if (user.name === ecoCurrent.userName) myRank = rank;

                let avatarHtml = `<div class="eco-avatar" style="width:40px; height:40px; font-size:20px;">${avatar}</div>`;
                if (user.avatar_url && user.avatar_url.startsWith('data:image')) {
                    avatarHtml = `<div class="eco-avatar" style="width:40px; height:40px; background-image:url(${user.avatar_url}); background-size:cover; border-radius:50%;"></div>`;
                }

                html += `
                <div class="${rowClass}">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="font-size:24px; font-weight:900; ${rankStyle} width:30px;">${rank}</div>
                        ${avatarHtml}
                        <strong style="color:#f8fafc;">${user.name || 'مجهول'}</strong>
                    </div>
                    <div style="${rankStyle} font-weight:800;">${user.xp || 0} XP</div>
                </div>
                `;
            });
            
            html += `<div style="text-align:center; color:#64748b; margin:20px 0;">• • •</div>`;
            
            // Highlight current user
            html += `
            <div class="eco-leaderboard-item" style="border: 2px solid #38bdf8; background: rgba(56,189,248,0.1);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:18px; font-weight:900; color:#38bdf8; width:30px;">${myRank}</div>
                    <div class="eco-avatar" style="width:40px; height:40px; font-size:20px;">أنت</div>
                    <strong style="color:#f8fafc;">${ecoCurrent.userName}</strong>
                </div>
                <div style="color:#38bdf8; font-weight:800;">${ecoCurrent.xp} XP</div>
            </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Leaderboard error:', error);
            container.innerHTML = `
                <h3 class="eco-section-title" style="justify-content:center; font-size:24px; margin-bottom:30px;">🏆 أبطال الأسبوع</h3>
                <div style="text-align:center;color:#ef4444;padding:20px;">حدث خطأ أثناء جلب القائمة.</div>
            `;
        }
    }

    function renderProfileTab(container) {
        var level = Math.floor(ecoCurrent.xp / 100) + 1;
        var title = level < 3 ? "تلميذ مبتدئ 🌱" : level < 6 ? "تلميذ مجتهد 🔥" : "بطل البيام 👑";
        var progressPercent = Math.min((ecoCurrent.xp / 1000) * 100, 100).toFixed(0);

        container.innerHTML = `
            <div class="eco-profile-header">
                <div class="eco-profile-avatar">👨‍🎓</div>
                <h2 style="margin:0 0 8px; font-size:26px;">${ecoCurrent.userName}</h2>
                <div class="eco-level-badge">المستوى ${level} : ${title}</div>
            </div>

            <div class="eco-stats-grid">
                <div class="eco-stat-card">
                    <div class="eco-stat-val" style="color:#fbbf24;">${ecoCurrent.xp}</div>
                    <div class="eco-stat-lbl">إجمالي الـ XP</div>
                </div>
                <div class="eco-stat-card">
                    <div class="eco-stat-val" style="color:#34d399;">${ecoCurrent.badges.length}</div>
                    <div class="eco-stat-lbl">أوسمة مكتسبة</div>
                </div>
            </div>

            <h4 style="margin:0 0 12px; color:#f8fafc;">التقدم نحو الهدف (1000 XP)</h4>
            <div class="eco-progress-bar" style="height:14px;"><span style="width: ${progressPercent}%;"></span></div>
        `;
    }

    var breathingTimerRafiki = null;
    function renderRafikiTab(container) {
        var activeMood = ecoCurrent.mood ? RAFIKI_CONFIG[ecoCurrent.mood] : null;
        var needsBreathing = (ecoCurrent.mood === "anxious" || ecoCurrent.mood === "stressed");
        if (breathingTimerRafiki) { clearInterval(breathingTimerRafiki); breathingTimerRafiki = null; }

        var moodHtml = ""; var moodKeys = Object.keys(RAFIKI_CONFIG);
        for (var i = 0; i < moodKeys.length; i++) {
            var k = moodKeys[i];
            moodHtml += `<button type="button" class="mood-pill ${(ecoCurrent.mood === k) ? 'active' : ''}" data-mood="${k}">${RAFIKI_CONFIG[k].label}</button>`;
        }

        var breathingHtml = needsBreathing ? `
            <div style="margin-top:40px;">
                <h4 style="text-align:center; color:#34d399;">🌿 جلسة استعادة الهدوء</h4>
                <div class="breathing-circle-wrapper"><div class="breathing-circle" id="raf-breath-circle">استعد..</div></div>
                <div id="raf-breath-status" style="text-align:center; font-size:18px; font-weight:800; min-height:30px; color:#34d399;"></div>
            </div>
        ` : '';

        container.innerHTML = `
            <div style="text-align:center; margin-bottom:30px;">
                <div style="font-size:60px; margin-bottom:10px;">🌱</div>
                <h2 style="margin:0; font-size:24px;">مساحة رفيقي</h2>
                <p style="color:#94a3b8; font-size:14px; margin-top:8px;">أنا هنا لأدعمك نفسياً خلال فترة المراجعة.</p>
            </div>
            
            <div class="rafiki-box" style="border-color:${activeMood ? activeMood.theme : '#3b82f6'};">
                <h3 style="margin:0 0 16px; font-size:18px; color:#f8fafc; text-align:center;">كيف تشعر الآن؟</h3>
                <div class="mood-pills">${moodHtml}</div>
                ${activeMood ? `<div style="margin-top:20px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.05); text-align:center;"><strong style="color:${activeMood.theme}; font-size:18px;">${activeMood.title}</strong><p style="color:#cbd5e1; margin:8px 0 0;">${activeMood.msg}</p></div>` : ''}
            </div>
            ${breathingHtml}
        `;

        var pills = container.querySelectorAll("[data-mood]");
        for (var j = 0; j < pills.length; j++) {
            pills[j].addEventListener("click", function() {
                ecoCurrent.mood = this.dataset.mood; saveEcoEngineState();
                try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch(e) {}
                renderRafikiTab(container);
            });
        }

        if (needsBreathing) {
            var circle = document.getElementById("raf-breath-circle"), status = document.getElementById("raf-breath-status");
            var step = 0;
            function runStep() {
                if (!document.getElementById("raf-breath-circle")) { clearInterval(breathingTimerRafiki); return; }
                if (step === 0) { circle.className = "breathing-circle inhale"; circle.textContent = "شهيق"; status.textContent = "خُذ نفساً عميقاً.."; playSound("inhale"); step = 1; }
                else if (step === 1) { circle.className = "breathing-circle hold"; circle.textContent = "احبس"; status.textContent = "اثبت لثوانٍ.."; step = 2; }
                else if (step === 2) { circle.className = "breathing-circle exhale"; circle.textContent = "زفير"; status.textContent = "أخرج التوتر.."; playSound("exhale"); step = 3; }
                else { step = 0; runStep(); }
            }
            runStep(); breathingTimerRafiki = setInterval(runStep, 4000);
        }
    }

    function showPaywallModal(subject) {
        var old = document.getElementById("eco-modal-overlay"); if (old) old.remove();
        var overlay = document.createElement("div"); overlay.id = "eco-modal-overlay";
        overlay.innerHTML = `
            <div class="eco-modal-container">
                <div class="eco-modal-top"><span></span><button type="button" class="eco-close-btn" id="eco-pro-close">✕</button></div>
                <div style="text-align:center;">
                    <div style="font-size:70px; margin-bottom:10px;">${subject.icon}</div>
                    <span style="background:rgba(245, 158, 11, 0.2); color:#fbbf24; padding:6px 16px; border-radius:20px; font-weight:800; font-size:12px;">باقة ECO-BEM PRO</span>
                    <h2 style="margin:16px 0; font-size:24px;">مادة ${subject.name} متوفرة في النسخة الشاملة</h2>
                    <div class="eco-card" style="text-align:right; border-color:#fbbf24;">
                        <ul style="margin:0; padding-right:20px; color:#cbd5e1;">
                            <li style="margin-bottom:8px;">فتح جميع مواد البيام الـ 9 الرسمية.</li>
                            <li>بنك أسئلة وتصحيح منهجي عميق.</li>
                        </ul>
                    </div>
                    <button type="button" class="eco-btn-whatsapp" id="eco-upg-btn">تواصل لتفعيل حسابك (واتساب)</button>
                </div>
            </div>
        `;
        document.getElementById("eco-app-root").appendChild(overlay);
        document.getElementById("eco-pro-close").addEventListener("click", function() { overlay.remove(); });
        document.getElementById("eco-upg-btn").addEventListener("click", function() {
            var ph = "213000000000"; var msg = "مرحباً منصة ECO-BEM 👋\nأريد تفعيل باقة PRO، خاصة لمادة (" + subject.name + ").";
            window.open("https://wa.me/" + ph + "?text=" + encodeURIComponent(msg), '_blank');
        });
    }

    // ربط تدفق المواد بقاعدة البيانات الخارحية database.js مباشرة
    function openEcoSubjectFlow(subjectKey) {
        ecoCurrent.subjectKey = subjectKey; saveEcoEngineState();
        var overlay = document.createElement("div"); overlay.id = "eco-modal-overlay";
        overlay.innerHTML = `
            <div class="eco-modal-container">
                <div class="eco-modal-top">
                    <h3 style="margin:0; color:#38bdf8;">${ECO_SUBJECTS[subjectKey].icon} ${ECO_SUBJECTS[subjectKey].name}</h3>
                    <button class="eco-close-btn" id="eco-flow-close">✕</button>
                </div>
                <div id="eco-stage-view"></div>
            </div>
        `;
        document.getElementById("eco-app-root").appendChild(overlay);
        document.getElementById("eco-flow-close").addEventListener("click", function() { overlay.remove(); renderActiveTab(); });
        renderDatabaseLessons(subjectKey);
    }

    function renderDatabaseLessons(subjectKey) {
        var view = document.getElementById("eco-stage-view");
        if (typeof ECO_BEM_DB === 'undefined' || !ECO_BEM_DB[subjectKey]) {
            view.innerHTML = `<p style="text-align:center; color:#ef4444; padding:20px;">عذراً، قاعدة البيانات غير متصلة أو مادة فارغة.</p>`;
            return;
        }

        var lessons = ECO_BEM_DB[subjectKey];
        var html = "";
        for (var i = 0; i < lessons.length; i++) {
            html += `
                <div class="eco-card" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;" data-lesson-idx="${i}">
                    <div>
                        <strong style="color:#38bdf8; font-size:16px;">${lessons[i].title}</strong>
                        <p style="color:#94a3b8; font-size:13px; margin-top:4px;">${lessons[i].desc}</p>
                    </div>
                    <button class="eco-btn-primary" style="width:auto; margin:0; padding:10px 20px;">عرض الدرس</button>
                </div>
            `;
        }
        view.innerHTML = `<h4 style="margin:0 0 16px; color:#f8fafc;">📚 دروس المقطع الأول (منهاج رسمي 4AM):</h4>${html}`;

        var cards = view.querySelectorAll("[data-lesson-idx]");
        for (var k = 0; k < cards.length; k++) {
            cards[k].addEventListener("click", function() {
                var idx = Number(this.dataset.lessonIdx);
                renderRichLessonView(subjectKey, idx);
            });
        }
    }

    function renderRichLessonView(subjectKey, idx) {
        var view = document.getElementById("eco-stage-view");
        var lesson = ECO_BEM_DB[subjectKey][idx];

        view.innerHTML = `
            <div class="eco-universal-header">
                <h3 style="margin:0 0 5px; font-size:18px; color:#38bdf8;">${lesson.title}</h3>
                <p style="color:#94a3b8; font-size:13px; margin:0;">${lesson.desc}</p>
            </div>
            
            <div class="eco-card" style="line-height:1.9; font-size:15px;">
                ${lesson.steps.lesson}
            </div>

            <button class="eco-btn-primary" id="btn-quiz-start" style="margin-top:20px;">✍️ ابدأ اختبار الفهم الذاتي (+50 XP)</button>
            <button class="eco-btn-secondary" id="btn-back-lessons" style="margin-top:10px;">عودة لقائمة الدروس</button>
        `;

        document.getElementById("btn-quiz-start").addEventListener("click", function() {
            renderInteractiveQuiz(subjectKey, idx);
        });

        document.getElementById("btn-back-lessons").addEventListener("click", function() {
            renderDatabaseLessons(subjectKey);
        });
    }

    function renderInteractiveQuiz(subjectKey, idx) {
        var view = document.getElementById("eco-stage-view");
        var lesson = ECO_BEM_DB[subjectKey][idx];
        var steps = lesson.steps;
        var quizKeys = ['ex1', 'ex2', 'ex3', 'quiz'];
        var currentStepIdx = 0;

        function showStep() {
            if (currentStepIdx >= quizKeys.length) {
                // انتهاء الاختبار بنجاح
                ecoCurrent.xp += 50;
                saveEcoEngineState();
                playSound('badge');
                view.innerHTML = `
                    <div style="text-align:center; padding:40px 20px;">
                        <div style="font-size:60px; margin-bottom:15px;">🎉</div>
                        <h2 style="color:#34d399; margin-bottom:10px;">أحسنت يا بطل!</h2>
                        <p style="color:#cbd5e1; margin-bottom:20px;">أتممت هذا الدرس والفخاخ الوزارية بنجاح (+50 XP).</p>
                        <button class="eco-btn-primary" id="finish-lesson-btn">العودة لقائمة الدروس</button>
                    </div>
                `;
                document.getElementById("finish-lesson-btn").addEventListener("click", function() {
                    renderDatabaseLessons(subjectKey);
                });
                return;
            }

            var qKey = quizKeys[currentStepIdx];
            var qData = steps[qKey];
            var optionsHtml = "";

            for (var i = 0; i < qData.opts.length; i++) {
                optionsHtml += `<button class="eco-option-btn" data-correct="${qData.opts[i].c}" data-ex="${qData.opts[i].ex || ''}">${qData.opts[i].t}</button>`;
            }

            view.innerHTML = `
                <div class="eco-universal-header">
                    <span style="color:#38bdf8; font-weight:800; font-size:14px;">اختبار الفهم (السؤال ${currentStepIdx + 1} من ${quizKeys.length})</span>
                </div>
                <div class="eco-card">
                    <h3 style="font-size:17px; margin-bottom:20px; line-height:1.6;">${qData.q}</h3>
                    <div id="quiz-options-container">${optionsHtml}</div>
                    <div id="quiz-feedback-box" style="margin-top:15px; display:none;"></div>
                </div>
            `;

            var optBtns = view.querySelectorAll(".eco-option-btn");
            for (var b = 0; b < optBtns.length; b++) {
                optBtns[b].addEventListener("click", function() {
                    var isCorrect = this.dataset.correct === "true";
                    var explanation = this.dataset.ex;

                    for (var x = 0; x < optBtns.length; x++) {
                        optBtns[x].style.pointerEvents = 'none';
                        if (optBtns[x].dataset.correct === "true") {
                            optBtns[x].classList.add("correct");
                        }
                    }

                    if (!isCorrect) {
                        this.classList.add("wrong");
                        playSound('xp'); // صوت خطأ مصغر أو تنبيه
                    } else {
                        playSound('xp');
                    }

                    var fbBox = document.getElementById("quiz-feedback-box");
                    fbBox.style.display = "block";
                    fbBox.innerHTML = `
                        <div class="eco-card" style="border-right: 4px solid ${isCorrect ? '#10b981' : '#ef4444'}; margin:0;">
                            <strong>${isCorrect ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة!'}</strong>
                            <p style="margin-top:5px; font-size:14px; color:#e2e8f0;">${explanation}</p>
                        </div>
                        <button class="eco-btn-primary" id="next-quiz-step" style="margin-top:15px;">السؤال الموالي ➔</button>
                    `;

                    document.getElementById("next-quiz-step").addEventListener("click", function() {
                        currentStepIdx++;
                        showStep();
                    });
                });
            }
        }

        showStep();
    }

    function bootstrapEcoEngine() { 
        loadEcoEngineState(); 
        injectNativeStyles(); 
        initEcoLauncher(); 
    }

    if (document.readyState === "loading") { 
        document.addEventListener("DOMContentLoaded", bootstrapEcoEngine); 
    } else { 
        bootstrapEcoEngine(); 
    }

})();