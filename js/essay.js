// AI Essay Grader Logic

const essayTopics = {
    'ar': [
        { id: 'ar_1', title: 'وصف رحلة إلى مزار تاريخي', prompt: 'السند: زرت مع عائلتك أو زملائك مزاراً تاريخياً في الجزائر (مثل مقام الشهيد أو أثار تيمقاد). التعليمة: اكتب نصاً من 10 إلى 12 سطراً تصف فيه هذا المزار مبرزاً أهميته التاريخية، وموظفاً جملة واقعة مضافاً إليه.' },
        { id: 'ar_2', title: 'التلوث البيئي', prompt: 'السند: البيئة هي المحيط الذي نعيش فيه، وحمايتها واجب وطني وديني. التعليمة: اكتب نصاً حجاجياً من 12 سطراً تقنع فيه زملاءك بضرورة الحفاظ على نظافة المحيط، موظفاً محسناً بديعياً واستعارة.' },
        { id: 'ar_3', title: 'آفة التدخين', prompt: 'السند: التدخين آفة اجتماعية خطيرة تهدد صحة الفرد والمجتمع. التعليمة: اكتب نصاً تفسيرياً من 10 أسطر تبيّن فيه أخطار التدخين على الصحة مقترحاً حلولاً للوقاية منه، موظفاً ممنوعاً من الصرف.' }
    ],
    'fr': [
        { id: 'fr_1', title: 'La beauté de l\'Algérie (Argumentatif)', prompt: 'Consigne: Rédige un texte argumentatif de 10 à 12 lignes pour convaincre les touristes de visiter l\'Algérie. Donne au moins trois arguments illustrés par des exemples.' },
        { id: 'fr_2', title: 'L\'importance de la solidarité', prompt: 'Consigne: Écris un texte d\'une dizaine de lignes dans lequel tu expliques l\'importance de la solidarité lors des catastrophes naturelles.' }
    ],
    'en': [
        { id: 'en_1', title: 'My Dream Job', prompt: 'Prompt: Write a paragraph of 8-10 lines about your dream job. Explain what the job is, why you chose it, and what you need to do to achieve it.' },
        { id: 'en_2', title: 'An Outstanding Figure', prompt: 'Prompt: Write a short biography (10 lines) about an outstanding Algerian figure (e.g. Emir Abdelkader or Mouloud Feraoun), using the past tense and the passive voice.' }
    ]
};

window.updateEssayTopics = function() {
    const subject = document.getElementById('essay-subject').value;
    const listContainer = document.getElementById('essay-topic-list');
    const hiddenInput = document.getElementById('essay-topic');
    listContainer.innerHTML = '';
    
    const topics = essayTopics[subject];
    
    // Helper function to create a card
    const createCard = (val, text, isCustom) => {
        const card = document.createElement('div');
        card.style.cssText = 'padding: 12px 15px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; font-weight: 500;';
        card.innerHTML = `<div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--text-muted); display: flex; align-items: center; justify-content: center;" class="radio-circle"></div> ${text}`;
        
        card.onclick = () => {
            // Deselect all
            Array.from(listContainer.children).forEach(c => {
                c.style.borderColor = 'var(--border)';
                c.style.background = 'var(--bg)';
                c.querySelector('.radio-circle').style.borderColor = 'var(--text-muted)';
                c.querySelector('.radio-circle').innerHTML = '';
            });
            // Select this
            card.style.borderColor = '#38bdf8';
            card.style.background = 'rgba(56,189,248,0.05)';
            card.querySelector('.radio-circle').style.borderColor = '#38bdf8';
            card.querySelector('.radio-circle').innerHTML = '<div style="width: 10px; height: 10px; background: #38bdf8; border-radius: 50%;"></div>';
            
            hiddenInput.value = val;
            window.updateEssayPrompt();
        };
        return card;
    };
    
    topics.forEach((t, index) => {
        const card = createCard(index, t.title, false);
        listContainer.appendChild(card);
    });
    
    const customCard = createCard('custom', '✏️ موضوع مخصص (كتابة سند من عندك)', true);
    listContainer.appendChild(customCard);
    
    // Select first by default
    if (listContainer.firstChild) listContainer.firstChild.onclick();
    
    window.updateEssayPrompt();
};

window.updateEssayPrompt = function() {
    const subject = document.getElementById('essay-subject').value;
    const topicIndex = document.getElementById('essay-topic').value;
    const promptText = document.getElementById('essay-prompt-text');
    
    if (topicIndex === 'custom') {
        promptText.innerHTML = '<textarea id="essay-custom-prompt" placeholder="اكتب السند والتعليمة هنا (مثلاً من فرض أو اختبار)..." style="width: 100%; min-height: 100px; padding: 10px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); resize: vertical; font-family: inherit; font-size: 0.9rem;"></textarea>';
    } else if (essayTopics[subject] && essayTopics[subject][topicIndex]) {
        promptText.textContent = essayTopics[subject][topicIndex].prompt;
    }
};

window.updateEssayWordCount = function() {
    const text = document.getElementById('essay-textarea').value;
    // Count words (filter out empty strings)
    const count = text.split(/\s+/).filter(word => word.length > 0).length;
    document.getElementById('essay-word-count').textContent = `${count} كلمة`;
};

window.startEssayWriting = function() {
    const subject = document.getElementById('essay-subject').value;
    const topicIndex = document.getElementById('essay-topic').value;
    
    let topicTitle = '';
    let topicPrompt = '';

    if (topicIndex === 'custom') {
        const customPromptArea = document.getElementById('essay-custom-prompt');
        if (!customPromptArea || customPromptArea.value.trim() === '') {
            toast('يرجى كتابة السند والتعليمة أولاً.', 'err');
            return;
        }
        topicTitle = 'موضوع مخصص';
        topicPrompt = customPromptArea.value.trim();
        // Store it temporarily so we can access it during grading
        window.currentCustomPrompt = topicPrompt;
    } else {
        const topic = essayTopics[subject][topicIndex];
        topicTitle = topic.title;
        topicPrompt = topic.prompt;
        window.currentCustomPrompt = null;
    }
    
    document.getElementById('essay-setup').style.display = 'none';
    document.getElementById('essay-writing').style.display = 'flex';
    document.getElementById('essay-writing-topic').textContent = topicTitle;
    document.getElementById('essay-textarea').value = '';
    document.getElementById('essay-textarea').focus();
    window.updateEssayWordCount();
};

window.resetEssayLab = function() {
    document.getElementById('essay-setup').style.display = 'flex';
    document.getElementById('essay-writing').style.display = 'none';
    document.getElementById('essay-result').style.display = 'none';
};

window.submitEssayForGrading = async function() {
    const text = document.getElementById('essay-textarea').value.trim();
    if (text.length < 20) {
        toast('يرجى كتابة نص معتبر قبل التصحيح (على الأقل 20 حرف).', 'err');
        return;
    }
    
    const subject = document.getElementById('essay-subject').value;
    const topicIndex = document.getElementById('essay-topic').value;
    
    let promptForAI = '';
    if (topicIndex === 'custom') {
        promptForAI = window.currentCustomPrompt || 'موضوع مخصص';
    } else {
        const topic = essayTopics[subject][topicIndex];
        promptForAI = topic.prompt;
    }
    
    // Switch UI to loading state
    document.getElementById('essay-writing').style.display = 'none';
    document.getElementById('essay-result').style.display = 'block';
    
    document.getElementById('essay-verdict-title').textContent = 'جاري التصحيح بالذكاء الاصطناعي... ⏳';
    document.getElementById('essay-verdict-title').style.color = 'var(--text)';
    document.getElementById('essay-score-circle').style.background = 'conic-gradient(#475569 0deg, var(--surface) 0deg)';
    document.getElementById('essay-total-score').textContent = '0';
    document.getElementById('essay-total-score').style.color = '#475569';
    document.getElementById('essay-criteria-list').innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">نحلل النص الخاص بك، الرجاء الانتظار...</div>';
    document.getElementById('essay-feedback').innerHTML = '';
    document.getElementById('essay-corrections').innerHTML = '';

    const systemPrompt = `
You are an expert Algerian Middle School (BEM) teacher grading a student's essay.
Language: ${subject === 'ar' ? 'Arabic' : (subject === 'fr' ? 'French' : 'English')}.
The topic/prompt provided by the student or teacher is: "${promptForAI}".

You MUST return your grading strictly as a JSON object with the following structure (do not include markdown block \`\`\`json or anything else, just the raw JSON object).
CRITICAL: ALL text inside the JSON (except the keys) MUST BE IN ARABIC so the student understands the feedback, even if they wrote in French or English.

{
  "totalScore": 6.5,
  "maxScore": 8,
  "criteria": [
    { "name": "الوجاهة (الملاءمة مع الموضوع)", "score": 2, "max": 2, "comment": "احترمت المطلوب وكتبت في الموضوع." },
    { "name": "الانسجام (تسلسل الأفكار)", "score": 1.5, "max": 2, "comment": "تسلسل منطقي لكن الخاتمة ضعيفة." },
    { "name": "سلامة اللغة (نحو، صرف، إملاء)", "score": 2, "max": 3, "comment": "بعض الأخطاء الإملائية." },
    { "name": "الإتقان والإبداع", "score": 1, "max": 1, "comment": "توظيف جيد للمطلوب وخط مقروء." }
  ],
  "generalFeedback": "تعبير جيد، ركز أكثر على علامات الوقف.",
  "corrections": [
    { "error": "الذهابو", "correction": "الذهاب", "reason": "خطأ إملائي" }
  ]
}
Total max score must always be 8.
Be fair and encouraging but strict on grammar.
`;

    try {
        const token = localStorage.getItem('eco_token');
        const apiEndpoint = (typeof API_URL !== 'undefined') ? API_URL + '/chat' : 'https://api.eco-bem.com/chat';
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('فشل الاتصال بالخادم الذكي.');
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        // Try parsing JSON
        // Sometimes LLMs add ```json ... ``` wrapper
        let cleanJson = reply.replace(/```json/g, '').replace(/```/g, '').trim();
        let result = JSON.parse(cleanJson);
        
        renderEssayResult(result);
        
    } catch (err) {
        console.error("Essay Grading Error: ", err);
        toast('حدث خطأ أثناء التصحيح، حاول مجدداً', 'err');
        document.getElementById('essay-verdict-title').textContent = 'فشل التصحيح ❌';
        document.getElementById('essay-criteria-list').innerHTML = '<div style="color: #ef4444; padding: 10px;">حدث خطأ أثناء الاتصال بالمصحح الذكي.</div>';
    }
};

function renderEssayResult(result) {
    const total = parseFloat(result.totalScore) || 0;
    const max = parseFloat(result.maxScore) || 8;
    
    // Animate score circle
    const degree = (total / max) * 360;
    let color = '#10b981'; // Green
    let title = 'عمل ممتاز! 🎉';
    
    if (total < max * 0.5) {
        color = '#ef4444'; // Red
        title = 'يحتاج إلى عمل أكثر 💡';
    } else if (total < max * 0.75) {
        color = '#f59e0b'; // Yellow/Orange
        title = 'مجهود جيد 👍';
    }
    
    const circle = document.getElementById('essay-score-circle');
    circle.style.background = `conic-gradient(${color} ${degree}deg, var(--surface) 0deg)`;
    
    const scoreText = document.getElementById('essay-total-score');
    scoreText.textContent = total;
    scoreText.style.color = color;
    
    document.getElementById('essay-verdict-title').textContent = title;
    document.getElementById('essay-verdict-title').style.color = color;
    
    // Render criteria
    let criteriaHtml = '';
    if (result.criteria && result.criteria.length > 0) {
        result.criteria.forEach(c => {
            const pct = (c.score / c.max) * 100;
            const cColor = pct >= 80 ? '#10b981' : (pct >= 50 ? '#f59e0b' : '#ef4444');
            criteriaHtml += `
                <div style="background: var(--surface); border-radius: var(--r-sm); padding: 12px; border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: bold; color: var(--text);">${c.name}</span>
                        <span style="font-weight: bold; color: ${cColor};">${c.score} / ${c.max}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">${c.comment}</div>
                    <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin-top: 8px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: ${cColor}; border-radius: 2px;"></div>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('essay-criteria-list').innerHTML = criteriaHtml;
    
    // Render general feedback
    document.getElementById('essay-feedback').innerHTML = result.generalFeedback || 'لا توجد ملاحظات عامة.';
    
    // Render corrections
    let corrHtml = '';
    if (result.corrections && result.corrections.length > 0) {
        corrHtml += '<div class="section-label">الأخطاء المكتشفة</div>';
        result.corrections.forEach(c => {
            corrHtml += `
                <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--r-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
                        <span style="color: #ef4444; text-decoration: line-through;">${c.error}</span>
                        <i class="fa-solid fa-arrow-left" style="color: var(--text-muted); font-size: 0.8rem;"></i>
                        <span style="color: #10b981; font-weight: bold;">${c.correction}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-circle-info"></i> ${c.reason}</div>
                </div>
            `;
        });
    } else {
        corrHtml = '<div style="color: #10b981; font-size: 0.9rem;"><i class="fa-solid fa-check-circle"></i> لم نكتشف أخطاء لغوية واضحة. ممتاز!</div>';
    }
    document.getElementById('essay-corrections').innerHTML = corrHtml;
    
    // Reward player with coins based on score
    if (total >= max * 0.5) {
        if(typeof playSound === 'function') playSound('ok');
        let currentCoins = parseInt(localStorage.getItem('eco_user_coins_v2')) || 0;
        let earned = Math.floor(total * 5); // up to 40 coins
        localStorage.setItem('eco_user_coins_v2', currentCoins + earned);
        if (typeof EcoDB !== 'undefined' && EcoDB.updateXP) EcoDB.updateXP(Math.floor(total * 10));
        toast(`ربحت ${earned} عملة ذهبية تقديراً لمجهودك!`, 'ok');
    } else {
        if(typeof playSound === 'function') playSound('err');
    }
}

// Initialize topics on load
setTimeout(() => {
    if (document.getElementById('essay-subject')) {
        window.updateEssayTopics();
    }
}, 1000);
