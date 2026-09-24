/* ═══ Notifications Panel ═══ */
function renderNotifSettings() {
  const box = document.getElementById('notif-content');
  if (!box) return;
  
  // Load settings
  const sDaily = localStorage.getItem('eco_notif_daily') !== 'false';
  const sQuests = localStorage.getItem('eco_notif_quests') !== 'false';
  const sAI = localStorage.getItem('eco_notif_ai') !== 'false';
  const sSound = localStorage.getItem('eco_notif_sound') !== 'false';

  box.innerHTML = `
    <div class="card">
      <div class="section-label">إعدادات الإشعارات</div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:10px;">
        
        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-calendar-check" style="color:#10b981;margin-left:8px;width:18px"></i> تذكير يومي بالدراسة</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">يصلك إشعار لتذكيرك بإنهاء وردك اليومي والمراجعة</div>
          </div>
          <input type="checkbox" id="notif-daily" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sDaily ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-map-location-dot" style="color:#f59e0b;margin-left:8px;width:18px"></i> تنبيهات واحة التدريب</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">إعلامك عند توفر مهام جديدة لجمع نقاط XP والعملات</div>
          </div>
          <input type="checkbox" id="notif-quests" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sQuests ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-robot" style="color:#3b82f6;margin-left:8px;width:18px"></i> رسائل المعلم الذكي (AI)</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">رسائل تحفيزية ونصائح مخصصة من معلمك الذكي</div>
          </div>
          <input type="checkbox" id="notif-ai" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sAI ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-volume-high" style="color:#a855f7;margin-left:8px;width:18px"></i> أصوات التنبيهات</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">تشغيل المؤثرات الصوتية عند وصول إشعار جديد</div>
          </div>
          <input type="checkbox" id="notif-sound" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sSound ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

      </div>
    </div>
  `;
}

window.saveNotifSettings = function() {
  localStorage.setItem('eco_notif_daily', document.getElementById('notif-daily').checked);
  localStorage.setItem('eco_notif_quests', document.getElementById('notif-quests').checked);
  localStorage.setItem('eco_notif_ai', document.getElementById('notif-ai').checked);
  localStorage.setItem('eco_notif_sound', document.getElementById('notif-sound').checked);
  
  if (typeof Sound !== 'undefined' && typeof Sound.tap === 'function') {
      if (document.getElementById('notif-sound').checked) Sound.tap();
  }
};



/* ═══ Core Functions ═══ */
let appEntered = false;
function enterApp() {
  renderAnnalsSubjects();
  initCustomSelects();
    if (appEntered) return;
    appEntered = true;
    Sound.ok();
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('gone');
    
    // AUTHENTICATION CHECK
    if (!localStorage.getItem('eco_token')) {
      const authOv = document.getElementById('ov-auth');
      if(authOv) {
        const savedEmail = localStorage.getItem('eco_saved_email');
        if (savedEmail) {
          const emailInput = document.getElementById('login-email');
          if (emailInput) emailInput.value = savedEmail;
        }
        authOv.style.display = 'flex';
        authOv.style.opacity = '1';
        authOv.classList.add('on');
        const authBack = authOv.querySelector('.back');
        if (authBack) authBack.style.display = 'none';
      }
      return; // Stop loading app until logged in
    }

    setTimeout(() => {
      try {
        loadTheme();
        renderUserName();
        renderLessons();
        renderYears();
        loadExam();
        renderCard();
      } catch(e) { console.error('[Init]', e); }
    }, 300);
  }

function toggleTheme() {
  Sound.tap();
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${isLight ? 'moon' : 'sun'}"></i>`;
  try { localStorage.setItem('eco-theme', isLight ? 'light' : 'dark'); } catch(e) {}
}
function loadTheme() {
  try {
    let theme = localStorage.getItem('eco-theme');
    if (!theme) {
      const h = new Date().getHours();
      theme = (h >= 18 || h < 6) ? 'dark' : 'light';
    }
    const btn = document.getElementById('themeBtn');
    if (theme === 'light') {
      document.body.classList.add('light');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  } catch(e) {}
}
function toggleDrawer(open) {
  Sound.tap();
  const d = document.getElementById('drawer');
  const b = document.getElementById('backdrop');
  if (d) d.classList.toggle('on', open);
  if (b) b.classList.toggle('on', open);
}
function openOverlay(id) {
  Sound.tap();
  const el = document.getElementById('ov-' + id);
  if (!el) return;
  el.classList.add('on');
  if (id === 'stats2') renderAnalytics();
  else if (id === 'zen') generateMoodButtons();
  else if (id === 'notif') renderNotifSettings();
  else if (id === 'sync') renderSyncPanel(); 
  else if (id === 'teacher') loadAIChatHistory();
  else if (id === 'rank' && typeof window.loadLeaderboard === 'function') window.loadLeaderboard();
}

// --- AI FLASHCARDS ---
let aiFlashData = [];
let aiFlashIdx = 0;
let flashCardFlipped = false;

window.startAIFlashcards = async function() {
    const selectElement = document.getElementById('flash-subject');
    const subject = selectElement.options[selectElement.selectedIndex].text;
    document.getElementById('flash-setup').style.display = 'none';
    document.getElementById('flash-loading').style.display = 'block';
    
    
    const prompt = `قم بتوليد 5 بطاقات استذكار (Flashcards) عشوائية وجديدة تماماً لمراجعة مفاهيم مختلفة في مادة ${subject} في مستوى شهادة التعليم المتوسط (BEM) في الجزائر. لا تكرر الأسئلة المعتادة، ابحث عن مفاهيم جديدة.
الرد يجب أن يكون حصراً بصيغة JSON array فقط، كل عنصر يحتوي على:
{
  "term": "المفهوم أو المصطلح",
  "definition": "الشرح المبسط"
}
لا تضف أي نص آخر قبل أو بعد الـ JSON.`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout
        
        const token = localStorage.getItem('eco_token');
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Backend API error or unauthorized');
        const data = await response.json();
        if (!data.choices || !data.choices[0].message.content) throw new Error('Invalid response from AI');
        
        let text = data.choices[0].message.content;
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('No JSON array found in response');
        aiFlashData = JSON.parse(match[0]);
        
        document.getElementById('flash-loading').style.display = 'none';
        document.getElementById('flash-play').style.display = 'block';
        aiFlashIdx = 0;
        flashCardFlipped = false;
        renderAIFlashcard();
    } catch (e) {
        console.warn('AI Flashcards failed:', e.message);
        document.getElementById('flash-loading').style.display = 'none';
        document.getElementById('flash-setup').style.display = 'block';
        alert("تأخر استجابة الذكاء الاصطناعي أو حدث خطأ. يرجى المحاولة مرة أخرى.");
        return;
    }

    document.getElementById('flash-loading').style.display = 'none';
    document.getElementById('flash-play').style.display = 'block';
        aiFlashIdx = 0;
        flashCardFlipped = false;
        renderAIFlashcard();
}

function renderAIFlashcard() {
    if (aiFlashIdx >= aiFlashData.length) {
        document.getElementById('flash-play').style.display = 'none';
        document.getElementById('flash-result').style.display = 'block';
        try { EcoDB.addXP(50); } catch(e) {}
        return;
    }
    const card = aiFlashData[aiFlashIdx];
    const fc = document.getElementById('fc');
    fc.style.transform = 'none';
    flashCardFlipped = false;
    
    document.getElementById('fc-text').textContent = card.term;
    document.getElementById('fc-hint').textContent = 'اضغط لمعرفة الشرح';
    const prog = document.getElementById('flash-progress');
    if(prog) prog.textContent = `بطاقة ${aiFlashIdx + 1} من ${aiFlashData.length}`;
}

window.flipCard = function() {
    const card = aiFlashData[aiFlashIdx];
    if (!card) return;
    flashCardFlipped = !flashCardFlipped;
    const fc = document.getElementById('fc');
    if (flashCardFlipped) {
        fc.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
            fc.style.transform = 'none';
            document.getElementById('fc-text').textContent = card.definition;
            document.getElementById('fc-hint').textContent = 'الشرح';
        }, 150);
    } else {
        fc.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
            fc.style.transform = 'none';
            document.getElementById('fc-text').textContent = card.term;
            document.getElementById('fc-hint').textContent = 'اضغط لمعرفة الشرح';
        }, 150);
    }
    Sound.tap();
}

window.nextCard = function() {
    Sound.tap();
    aiFlashIdx++;
    renderAIFlashcard();
}

window.prevCard = function() {
    Sound.tap();
    if (aiFlashIdx > 0) {
        aiFlashIdx--;
        renderAIFlashcard();
    }
}

window.resetFlashcards = function() {
    document.getElementById('flash-setup').style.display = 'block';
    document.getElementById('flash-loading').style.display = 'none';
    document.getElementById('flash-play').style.display = 'none';
    document.getElementById('flash-result').style.display = 'none';
}


// --- AI QUIZ ---
let aiQuizData = [];
let aiQuizIdx = 0;
let aiQuizScore = 0;

window.startAIQuiz = async function() {
    const selectElement = document.getElementById('quiz-subject');
    const subject = selectElement.options[selectElement.selectedIndex].text;
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-loading').style.display = 'block';
    
    
    const prompt = `قم بتوليد 5 أسئلة اختيار من متعدد (QCM) عشوائية وجديدة تماماً لمادة ${subject} في مستوى شهادة التعليم المتوسط (BEM) في الجزائر. لا تكرر الأسئلة المعتادة، بل ابحث عن دروس ومعلومات متنوعة.
الرد يجب أن يكون حصراً بصيغة JSON array فقط، كل عنصر يحتوي على:
{
  "q": "نص السؤال هنا",
  "opts": [
    {"t": "الخيار الأول", "c": false},
    {"t": "الخيار الصحيح", "c": true},
    {"t": "الخيار الثالث", "c": false},
    {"t": "الخيار الرابع", "c": false}
  ]
}
لا تضف أي نص آخر قبل أو بعد الـ JSON.`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout
        
        const token = localStorage.getItem('eco_token');
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Backend API error or unauthorized');
        const data = await response.json();
        if (!data.choices || !data.choices[0].message.content) throw new Error('Invalid response from AI');
        
        let text = data.choices[0].message.content;
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('No JSON array found in response');
        aiQuizData = JSON.parse(match[0]);
        
    } catch (e) {
        console.warn('AI Quiz failed:', e.message);
        document.getElementById('quiz-loading').style.display = 'none';
        document.getElementById('quiz-setup').style.display = 'block';
        alert("تأخر استجابة الذكاء الاصطناعي أو حدث خطأ. يرجى المحاولة مرة أخرى.");
        return;
    }

    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'block';
    aiQuizIdx = 0;
    aiQuizScore = 0;
    renderAIQuiz();
}

function renderAIQuiz() {
    if (aiQuizIdx >= aiQuizData.length) {
        finishAIQuiz();
        return;
    }
    const q = aiQuizData[aiQuizIdx];
    const p = document.getElementById('quiz-progress-text');
    if(p) p.textContent = `السؤال ${aiQuizIdx + 1} من ${aiQuizData.length}`;
    document.getElementById('quiz-title').textContent = q.q;
    const optsDiv = document.getElementById('quiz-opts');
    optsDiv.innerHTML = '';
    
    q.opts.sort(() => Math.random() - 0.5); // Shuffle
    
    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'opt';
        btn.innerHTML = `<span>${opt.t}</span> <i class="fa-solid fa-circle"></i>`;
        btn.onclick = () => {
            if (opt.c) {
                btn.classList.add('correct');
                Sound.ok();
                aiQuizScore++;
            } else {
                btn.classList.add('wrong');
                Sound.err();
                optsDiv.childNodes.forEach(child => {
                    if (child.innerText.includes(q.opts.find(o => o.c).t)) child.classList.add('correct');
                });
            }
            optsDiv.childNodes.forEach(c => c.style.pointerEvents = 'none');
            setTimeout(() => { aiQuizIdx++; renderAIQuiz(); }, 1500);
        };
        optsDiv.appendChild(btn);
    });
}

async function finishAIQuiz() {
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('quiz-result').style.display = 'block';
    document.getElementById('quiz-score').textContent = `النتيجة: ${aiQuizScore} / ${aiQuizData.length}`;
    const xpEarned = aiQuizScore * 10;
    document.getElementById('quiz-xp').textContent = `+${xpEarned} XP`;
    try {
        await EcoDB.addXP(xpEarned);
    } catch(e) {}
}

window.resetQuiz = function() {
    document.getElementById('quiz-setup').style.display = 'block';
    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('quiz-result').style.display = 'none';
}

  function closeOverlay(id) {
  Sound.tap();
  const el = document.getElementById('ov-' + id);
  if (el) el.classList.remove('on');
}
function togglePremium(open, name) {
  Sound.tap();
  if (name) {
    const el = document.getElementById('premium-title');
    if (el) el.textContent = `مادة ${name} متوفرة في النسخة الشاملة`;
  }
  const p = document.getElementById('premium');
  if (p) p.classList.toggle('on', open);
}
function openPayments() {
  togglePremium(false);
  Sound.tap();
  go('tab-pricing', null);
}
function contactForPayment(plan) {
  window.open(`https://wa.me/213697454244?text=${encodeURIComponent(`أريد تفعيل اشتراك ECO-BEM PRO (${plan})`)}`, '_blank');
}
function go(tabId, navId) {
  Sound.tap();
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('on');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('on'));
  if (navId) {
    const btn = document.getElementById(navId);
    if (btn) btn.classList.add('on');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tabId === 'tab-stats') renderDashboard();
  else if (tabId === 'tab-lessons') renderLessons();
  else if (tabId === 'tab-archive') { renderYears(); loadExam(); }
}



/* ═══ ESC Close ═══ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.on').forEach(o => {
        if (o.id !== 'ov-auth') o.classList.remove('on');
      });
    const p = document.getElementById('premium');
    if (p) p.classList.remove('on');
    toggleDrawer(false);
  }
});



/* ═══ Custom Select Dropdown UI ═══ */
function initCustomSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        if (select.dataset.customized) return;
        select.dataset.customized = true;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.style.width) wrapper.style.width = select.style.width;
        if (select.style.marginBottom) wrapper.style.marginBottom = select.style.marginBottom;
        
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';
        
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-options';
        
        let selectedOption = select.options[select.selectedIndex];
        customSelect.innerHTML = selectedOption ? selectedOption.text : 'اختر المادة';
        
        Array.from(select.options).forEach((option, index) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-option';
            if (index === select.selectedIndex) optDiv.classList.add('selected');
            optDiv.textContent = option.text;
            
            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                select.selectedIndex = index;
                customSelect.innerHTML = option.text;
                
                optionsList.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                optDiv.classList.add('selected');
                
                optionsList.classList.remove('open');
                customSelect.classList.remove('open');
            });
            optionsList.appendChild(optDiv);
        });
        
        customSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-options').forEach(el => {
                if(el !== optionsList) el.classList.remove('open');
            });
            document.querySelectorAll('.custom-select').forEach(el => {
                if(el !== customSelect) el.classList.remove('open');
            });
            optionsList.classList.toggle('open');
            customSelect.classList.toggle('open');
        });
        
        select.style.display = 'none';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(customSelect);
        wrapper.appendChild(optionsList);
        wrapper.appendChild(select);
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
    });
}



// -----------------------------------------
// Zen Space - Audio & Chat (Companion Space)
// -----------------------------------------

const zenAudio = document.getElementById('zen-audio');
const zenAudioSources = {
    rain: ['./assets/light_rain_0.mp3'],
    forest: ['./assets/birds_0.mp3', './assets/birds_1.mp3', './assets/birds_2.mp3']
};

let currentZenType = null;

function playZenSound(type) {
    let audioEl = document.getElementById('zen-audio');
    if(!audioEl) {
        alert("لم يتم العثور على مشغل الصوت.");
        return;
    }
    
    if (type === 'stop') {
        audioEl.pause();
        audioEl.currentTime = 0;
        currentZenType = null;
        audioEl.onended = null;
        return;
    }

    if (zenAudioSources[type]) {
        currentZenType = type;
        
        // Pick a random track from the array
        let tracks = zenAudioSources[type];
        let randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        
        audioEl.src = randomTrack;
        audioEl.volume = 1.0;
        audioEl.loop = false; // We handle looping manually to vary the tracks
        
        // When track ends, play another random track of the same type
        audioEl.onended = () => {
            if (currentZenType) {
                playZenSound(currentZenType);
            }
        };
        
        let playPromise = audioEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Audio play failed:', e);
                alert('تعذر تشغيل الصوت. متصفحك قد يحظر التشغيل التلقائي أو لا يدعم صيغة الملف.');
            });
        }
    }
}

// Zen AI Chat
const zenChatHistory = [
    { role: 'system', content: 'أنت مرشد نفسي ودراسي لطيف جداً لتلاميذ شهادة التعليم المتوسط (BEM) في الجزائر. اسمك "رفيقي". هدفك تشجيع التلميذ، تخفيف توتره، وإعطاؤه نصائح دراسية ونفسية قصيرة وعملية. استخدم إيموجيز لطيفة وتحدث بلغة مبسطة قريبة للقلب.' }
];

async function sendZenMessage() {
    const input = document.getElementById('zen-chat-input');
    const box = document.getElementById('zen-chat-box');
    const text = input.value.trim();
    if(!text) return;

    // Add user message to UI
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'background:var(--primary); color:white; padding:12px 18px; border-radius:12px; border-bottom-right-radius:2px; align-self:flex-start; max-width:85%; line-height:1.6; margin:5px 0; box-shadow:0 2px 5px rgba(0,0,0,0.1); font-weight:500;';
    userMsg.textContent = text;
    box.appendChild(userMsg);
    input.value = '';
    box.scrollTop = box.scrollHeight;

    zenChatHistory.push({ role: 'user', content: text });

    // Show loading bubble
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = 'background:rgba(139, 92, 246, 0.1); padding:12px 18px; border-radius:12px; border-bottom-left-radius:2px; align-self:flex-end; max-width:85%; color:var(--text-muted); font-style:italic; margin:5px 0;';
    loadingMsg.textContent = 'جاري التفكير...';
    box.appendChild(loadingMsg);
    box.scrollTop = box.scrollHeight;

    // Fetch from Backend
    
    try {
        const token = localStorage.getItem('eco_token');
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: zenChatHistory })
        });

        const data = await response.json();
        box.removeChild(loadingMsg);

        if (!response.ok) {
            throw new Error(data.error || 'Backend API error or unauthorized');
        }

        const reply = data.choices[0].message.content;
        zenChatHistory.push({ role: 'assistant', content: reply });

        const aiMsg = document.createElement('div');
        aiMsg.style.cssText = 'background:rgba(139, 92, 246, 0.1); padding:12px 18px; border-radius:12px; border-bottom-left-radius:2px; align-self:flex-end; max-width:85%; color:var(--text); line-height:1.6; margin:5px 0;';
        
        if(window.marked) {
            aiMsg.innerHTML = marked.parse(reply);
        } else {
            let htmlText = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            htmlText = htmlText.replace(/\n/g, '<br>');
            aiMsg.innerHTML = htmlText;
        }

        box.appendChild(aiMsg);
        box.scrollTop = box.scrollHeight;

    } catch (err) {
        box.removeChild(loadingMsg);
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'background:rgba(239, 68, 68, 0.1); color:#ef4444; padding:10px 15px; border-radius:12px; align-self:center; max-width:90%; text-align:center; font-size:0.9em;';
        errorMsg.textContent = 'حدث خطأ في الاتصال بالمرشد. تأكد من الإنترنت أو مفتاح API.';
        box.appendChild(errorMsg);
        box.scrollTop = box.scrollHeight;
    }
}

// Zen Tabs Logic
function openZenTab(tabId, btnElement) {
  document.querySelectorAll('.zen-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.zen-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btnElement.classList.add('active');
}

function enableCropMode(btn) {
  const container = btn.parentElement.parentElement;
  const imgs = container.querySelectorAll('img');
  if (imgs.length === 0) return;
  const lastImg = imgs[imgs.length - 1];
  
  btn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> انقر على الصورة لتحديد مكان القص...';
  btn.style.background = '#f59e0b';
  
  lastImg.style.cursor = 'crosshair';
  lastImg.style.border = '2px dashed #f59e0b';
  
  const clickHandler = function(e) {
    const rect = lastImg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = (y / rect.height) * 100;
    
    const overlayTitle = document.getElementById('ov-annals-title').innerText;
    const parts = overlayTitle.split(' - ');
    const subject = parts[0].replace('حولية ', '').trim();
    const year = parts[1].trim();
    
    let crops = JSON.parse(localStorage.getItem('imageCrops') || '{}');
    const key = `${subject}_${year}_img_${imgs.length - 1}`;
    crops[key] = percentage;
    localStorage.setItem('imageCrops', JSON.stringify(crops));
    
    lastImg.style.cursor = 'default';
    lastImg.style.border = 'none';
    lastImg.removeEventListener('click', clickHandler);
    
    openOverlay(subject, year);
  };
  
  lastImg.addEventListener('click', clickHandler);
}

// --- Bento UI Logic ---
function loadBentoExam() {
    const subject = document.getElementById('bentoSubjectSelect').value;
    const year = document.getElementById('bentoYearSelect').value;
    
    if (!subject || !year) {
        alert('يرجى اختيار المادة والسنة أولا.');
        return;
    }
    
    const contentArea = document.getElementById('bentoContentArea');
    const examTitle = document.getElementById('bentoExamTitle');
    const questionIframe = document.getElementById('bentoQuestionIframe');
    const answerIframe = document.getElementById('bentoAnswerIframe');
    const answerSection = document.getElementById('bentoAnswerSection');
    const attemptText = document.getElementById('bentoStudentAttempt');
    const showAnswerBtn = document.getElementById('bentoShowAnswerBtn');
    
    // reset state
    attemptText.value = '';
    showAnswerBtn.disabled = true;
    showAnswerBtn.innerHTML = "👁️ كشف الإجابة النموذجية";
    showAnswerBtn.style.backgroundColor = "#cccccc";
    answerSection.style.display = 'none';
    
    // Dynamically construct paths
    const questionPath = `بنك_منظم/${subject}/${subject}_${year}_Question.pdf`;
    const answerPath = `بنك_منظم/${subject}/${subject}_${year}_Answer.pdf`;
    
    examTitle.innerHTML = `نص الموضوع 📜 - ${subject} ${year}`;
    questionIframe.src = questionPath + "#toolbar=0";
    answerIframe.src = answerPath + "#toolbar=0";
    
    contentArea.style.display = 'flex';
    
    // Listeners for attempt
    attemptText.oninput = function() {
        if (attemptText.value.trim().length >= 5) {
            showAnswerBtn.disabled = false;
            showAnswerBtn.style.backgroundColor = "#4CAF50"; 
        } else {
            showAnswerBtn.disabled = true;
            showAnswerBtn.style.backgroundColor = "#cccccc"; 
        }
    };
    
    showAnswerBtn.onclick = function() {
        answerSection.style.display = 'block';
        setTimeout(() => { answerSection.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
        showAnswerBtn.innerHTML = "✅ تم كشف الإجابة";
        showAnswerBtn.disabled = true;
        showAnswerBtn.style.backgroundColor = "#2E7D32";
    };
}

async function evaluateBentoAttempt() {
    const attemptText = document.getElementById('bentoStudentAttempt').value;
    const subjectSelect = document.getElementById('bentoSubjectSelect');
    const yearSelect = document.getElementById('bentoYearSelect');
    
    if (subjectSelect.selectedIndex <= 0 || !yearSelect.value) {
        alert('الرجاء اختيار المادة والسنة أولا.');
        return;
    }

    const subject = subjectSelect.options[subjectSelect.selectedIndex].text;
    const year = yearSelect.value;

    if (!attemptText || attemptText.trim().length < 10) {
        alert('الرجاء كتابة محاولة جادة قبل طلب التقييم (10 حروف على الأقل).');
        return;
    }

    const btn = document.getElementById('bentoAiEvalBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ جاري التقييم بالذكاء الاصطناعي...';
    btn.disabled = true;
    btn.style.backgroundColor = '#cbd5e1';

    try {
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: `أنت معلم جزائري خبير في تقييم امتحانات شهادة التعليم المتوسط (BEM). المادة: ${subject}، السنة: ${year}. قم بتقييم محاولة التلميذ بناءً على الحل النموذجي المتعارف عليه. أعط ملاحظات مشجعة، وحدد الأخطاء بلطف مع تقديم تلميحات. تنسيق الرد: استخدم **للنصوص المهمة** ولا تستخدم markdown معقد آخر.` },
                    { role: 'user', content: `محاولتي لحل موضوع ${subject} لعام ${year} هي:\n\n${attemptText}\n\nما هو تقييمك؟` }
                ]
            })
        });

        const data = await response.json();
        
        let feedbackDiv = document.getElementById('bentoAiFeedback');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'bentoAiFeedback';
            feedbackDiv.style.marginTop = '20px';
            feedbackDiv.style.padding = '20px';
            feedbackDiv.style.backgroundColor = '#f0fdf4';
            feedbackDiv.style.borderRight = '4px solid #22c55e';
            feedbackDiv.style.borderRadius = '12px';
            feedbackDiv.style.lineHeight = '1.6';
            
            const btnGroup = btn.parentElement;
            btnGroup.parentElement.appendChild(feedbackDiv);
        }

        const replyText = data.choices && data.choices.length > 0 ? data.choices[0].message.content : null;

        if (replyText) {
            let htmlReply = replyText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlReply = htmlReply.replace(/\n/g, '<br>');
            feedbackDiv.innerHTML = `<div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; border-bottom:1px solid #dcfce3; padding-bottom:10px;">
                <span style="font-size:1.5rem;">🤖</span>
                <h3 style="margin:0; color:#166534;">تقييم المعلم الذكي</h3>
            </div>
            <div style="color:#15803d; font-size:1.1rem;">${htmlReply}</div>`;
            
            const showAnswerBtn = document.getElementById('bentoShowAnswerBtn');
            showAnswerBtn.disabled = false;
            showAnswerBtn.style.backgroundColor = "#4CAF50"; 
            
        } else {
            feedbackDiv.innerHTML = '<span style="color:red;">عذراً، حدث خطأ أثناء التقييم. حاول مرة أخرى.</span>';
        }
    } catch (e) {
        alert('خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت وأن الخادم يعمل.');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.style.backgroundColor = '#f1f5f9';
}

window.handleSelfEval = function(btn, points, msg) {
  if (typeof addPoints === 'function') addPoints(points, msg);
  // Disable all buttons in the same container
  const container = btn.parentElement;
  const buttons = container.querySelectorAll('button');
  buttons.forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.5';
    b.style.cursor = 'not-allowed';
  });
  // Highlight the clicked one slightly
  btn.style.opacity = '1';
  btn.style.border = '2px solid black';
};

/* --- SOUND EFFECTS SYSTEM --- */
let audioCtx = null;

window.playSound = function(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'success' || type === 'ok') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error' || type === 'err') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'info') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch(e) {}
};

/* --- PWA INSTALLATION SYSTEM --- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'flex';
});

window.installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.style.display = 'none';
    }
    deferredPrompt = null;
  }
};


/* ═══════════════════════════════════════════════════
   PODCAST LOGIC
   ═══════════════════════════════════════════════════ */
let currentPodcastId = null;

function renderPodcasts(subjectFilter = null) {
  const listContainer = document.getElementById('podcast-list');
  if (!listContainer) return;
  
  if (typeof podcastData === 'undefined') {
    listContainer.innerHTML = '<p>جاري تحميل البيانات...</p>';
    return;
  }
  
  listContainer.innerHTML = '';
  
  let filteredData = podcastData;
  if (subjectFilter) {
      filteredData = podcastData.filter(p => p.category === subjectFilter);
  }
  
  if (filteredData.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; padding: 40px 0; color: var(--text-muted);"><i class="fa-solid fa-microphone-lines-slash" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i><p>لا توجد حلقات متوفرة لهذه المادة حالياً. قريباً!</p></div>';
      return;
  }
  
  filteredData.forEach(pod => {
    const card = document.createElement('div');
    card.className = 'podcast-card';
    card.onclick = () => playPodcast(pod.id);
    card.innerHTML = `
      <img src="${pod.coverImage}" class="podcast-img" alt="Cover">
      <div class="podcast-info">
        <div class="podcast-title">${pod.title}</div>
        <div class="podcast-meta">
          <span><i class="fa-solid fa-tag"></i> ${pod.category}</span>
          <span><i class="fa-solid fa-clock"></i> ${pod.duration}</span>
        </div>
      </div>
      <div class="podcast-play-icon">
        <i class="fa-solid fa-play"></i>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

function openPodcastSubject(subjectName) {
    const viewSubjects = document.getElementById('podcast-subjects-view');
    const viewEpisodes = document.getElementById('podcast-episodes-view');
    const title = document.getElementById('current-podcast-subject-title');
    
    title.innerText = 'حلقات ' + subjectName;
    renderPodcasts(subjectName);
    
    viewSubjects.style.display = 'none';
    viewEpisodes.style.display = 'block';
}

function backToPodcastSubjects() {
    const viewSubjects = document.getElementById('podcast-subjects-view');
    const viewEpisodes = document.getElementById('podcast-episodes-view');
    
    viewEpisodes.style.display = 'none';
    viewSubjects.style.display = 'block';
}


function playPodcast(id) {
  if (typeof podcastData === 'undefined') return;
  const pod = podcastData.find(p => p.id === id);
  if (!pod) return;

  const player = document.getElementById('podcast-player');
  const audio = document.getElementById('global-audio');
  const playBtn = document.getElementById('btn-play-pause');
  
  // Show player if hidden
  player.style.display = 'block';
  setTimeout(() => {
    player.classList.remove('podcast-player-hidden');
    player.classList.add('podcast-player-shown');
  }, 10);

  if (currentPodcastId === id) {
    // Toggle play/pause
    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      audio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  } else {
    // New podcast
    currentPodcastId = id;
    document.getElementById('player-title').innerText = pod.title;
    document.getElementById('player-category').innerText = pod.category;
    document.getElementById('player-cover').style.backgroundImage = `url('${pod.coverImage}')`;
    
    // In a real app we set audio.src = pod.audioSrc. Since it's fake right now:
    audio.src = pod.audioSrc;
    audio.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; // Fake playing state
    toast('جاري تشغيل: ' + pod.title, 'info');
  }
}

function togglePlayPause() {
  if (!currentPodcastId) return;
  const audio = document.getElementById('global-audio');
  const playBtn = document.getElementById('btn-play-pause');
  if (audio.paused) {
    audio.play(); // Disabled for fake
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    // audio.pause(); // Disabled for fake
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
}

function updateProgress() {
  const audio = document.getElementById('global-audio');
  const progressBar = document.getElementById('podcast-progress');
  if (audio.duration) {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percent + '%';
  }
}

function seekAudio(e) {
  const audio = document.getElementById('global-audio');
  const container = e.currentTarget;
  const rect = container.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  let percent = clickX / width;
  
  if (document.dir === 'rtl') {
      percent = 1 - percent;
  }
  
  if (audio.duration) {
    audio.currentTime = percent * audio.duration;
  }
}

function resetPlayer() {
  const playBtn = document.getElementById('btn-play-pause');
  playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  document.getElementById('podcast-progress').style.width = '0%';
}

// Hook renderPodcasts to when the overlay opens
const originalOpenOverlay = window.openOverlay;
window.openOverlay = function(id) {
    if(originalOpenOverlay) originalOpenOverlay(id);
    if(id === 'podcast') {
        // Reset to subjects view every time we open it
        const viewSubjects = document.getElementById('podcast-subjects-view');
        const viewEpisodes = document.getElementById('podcast-episodes-view');
        if (viewSubjects && viewEpisodes) {
            viewEpisodes.style.display = 'none';
            viewSubjects.style.display = 'block';
        }
    }
};
