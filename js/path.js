// Duolingo-style Learning Path System
const ECO_PATH_SUBJECTS = [
    { id: 'math', name: 'الرياضيات', icon: 'fa-calculator', color: '#38bdf8' },
    { id: 'arabic', name: 'اللغة العربية', icon: 'fa-feather', color: '#a4d466' },
    { id: 'science', name: 'العلوم الطبيعية', icon: 'fa-flask', color: '#fbbf24' },
    { id: 'physics', name: 'العلوم الفيزيائية', icon: 'fa-atom', color: '#818cf8' },
    { id: 'islamic', name: 'التربية الإسلامية', icon: 'fa-moon', color: '#34d399' },
    { id: 'civic', name: 'التربية المدنية', icon: 'fa-landmark', color: '#f472b6' },
    { id: 'hisgeo', name: 'التاريخ والجغرافيا', icon: 'fa-globe', color: '#fdba74' },
    { id: 'french', name: 'اللغة الفرنسية', icon: 'fa-language', color: '#c084fc' },
    { id: 'english', name: 'اللغة الإنجليزية', icon: 'fa-book', color: '#fca5a5' }
];

const ECO_PATH_NODES = {
    'math': [
        { id: 1, title: 'العمليات على الأعداد', type: 'lesson' },
        { id: 2, title: 'الحساب الحرفي', type: 'practice' },
        { id: 3, title: 'المعادلات', type: 'quiz' },
        { id: 4, title: 'نظرية طالس', type: 'lesson' },
        { id: 5, title: 'اختبار الوحدة', type: 'chest' },
        { id: 6, title: 'النسب المثلثية', type: 'lesson' },
        { id: 7, title: 'تمرين شامل', type: 'practice' }
    ],
    'arabic': [
        { id: 1, title: 'عطف النسق', type: 'lesson' },
        { id: 2, title: 'البدل', type: 'practice' },
        { id: 3, title: 'الممنوع من الصرف', type: 'quiz' },
        { id: 4, title: 'اختبار الفصل 1', type: 'chest' }
    ],
    'science': [
        { id: 1, title: 'تحولات الأغذية', type: 'lesson' },
        { id: 2, title: 'الامتصاص المعوي', type: 'practice' },
        { id: 3, title: 'نقل المغذيات', type: 'quiz' },
        { id: 4, title: 'التنفس', type: 'lesson' },
        { id: 5, title: 'مراجعة المقطع 1', type: 'chest' }
    ],
    'physics': [
        { id: 1, title: 'الشحنة الكهربائية', type: 'lesson' },
        { id: 2, title: 'النموذج المبسط للذرة', type: 'practice' },
        { id: 3, title: 'التيار المتناوب', type: 'quiz' },
        { id: 4, title: 'الأمن الكهربائي', type: 'lesson' },
        { id: 5, title: 'اختبار الفصل الأول', type: 'chest' }
    ],
    'islamic': [
        { id: 1, title: 'سورة النبأ', type: 'lesson' },
        { id: 2, title: 'الإيمان باليوم الآخر', type: 'practice' },
        { id: 3, title: 'الحج', type: 'quiz' },
        { id: 4, title: 'مواقف من السيرة', type: 'lesson' },
        { id: 5, title: 'اختبار الوحدة', type: 'chest' }
    ],
    'civic': [
        { id: 1, title: 'الصلح والوساطة', type: 'lesson' },
        { id: 2, title: 'المؤسسات القضائية', type: 'practice' },
        { id: 3, title: 'الدستور', type: 'quiz' },
        { id: 4, title: 'الهوية الوطنية', type: 'chest' }
    ],
    'hisgeo': [
        { id: 1, title: 'الوثيقة التاريخية', type: 'lesson' },
        { id: 2, title: 'الاحتلال الفرنسي', type: 'practice' },
        { id: 3, title: 'تضاريس الجزائر', type: 'lesson' },
        { id: 4, title: 'المناخ', type: 'quiz' },
        { id: 5, title: 'اختبار المقطع', type: 'chest' }
    ],
    'french': [
        { id: 1, title: 'Le texte argumentatif', type: 'lesson' },
        { id: 2, title: 'Le vocabulaire', type: 'practice' },
        { id: 3, title: 'La grammaire', type: 'quiz' },
        { id: 4, title: 'Projet 1', type: 'chest' }
    ],
    'english': [
        { id: 1, title: 'Landmarks', type: 'lesson' },
        { id: 2, title: 'Outstanding Figures', type: 'practice' },
        { id: 3, title: 'Passive Voice', type: 'quiz' },
        { id: 4, title: 'Unit 1 Test', type: 'chest' }
    ]
};

// Store progress in localStorage temporarily (would go to EcoDB in real scenario)
function getPathProgress(subject) {
    let p = localStorage.getItem('eco_path_progress');
    if(p) {
        try { p = JSON.parse(p); } catch(e){ p = {}; }
    } else {
        p = {};
    }
    return p[subject] || 1; // Default to node 1
}

function setPathProgress(subject, nodeLevel) {
    let p = localStorage.getItem('eco_path_progress');
    if(p) {
        try { p = JSON.parse(p); } catch(e){ p = {}; }
    } else {
        p = {};
    }
    p[subject] = nodeLevel;
    localStorage.setItem('eco_path_progress', JSON.stringify(p));
}

let currentPathSubject = 'math';

function renderPathSelector() {
    const container = document.getElementById('path-subjects');
    if (!container) return;
    
    let html = '';
    ECO_PATH_SUBJECTS.forEach(sub => {
        const isActive = sub.id === currentPathSubject;
        html += `
            <button class="path-sub-btn ${isActive ? 'active' : ''}" style="${isActive ? `background:${sub.color}20; color:${sub.color}; border-color:${sub.color};` : ''}" onclick="switchPathSubject('${sub.id}')">
                <i class="fa-solid ${sub.icon}"></i> ${sub.name}
            </button>
        `;
    });
    container.innerHTML = html;
}

function switchPathSubject(id) {
    currentPathSubject = id;
    renderPathSelector();
    renderPathMap();
}

function renderPathMap() {
    const container = document.getElementById('path-map-container');
    if (!container) return;
    
    const nodes = ECO_PATH_NODES[currentPathSubject];
    if (!nodes) return;
    
    const userLevel = getPathProgress(currentPathSubject);
    const subjectColor = ECO_PATH_SUBJECTS.find(s => s.id === currentPathSubject).color;
    
    let html = '<div class="path-wrapper">';
    
    nodes.forEach((node, index) => {
        const isLocked = node.id > userLevel;
        const isCurrent = node.id === userLevel;
        const isCompleted = node.id < userLevel;
        
        let iconClass = 'fa-star';
        if (node.type === 'lesson') iconClass = 'fa-book-open';
        if (node.type === 'practice') iconClass = 'fa-dumbbell';
        if (node.type === 'quiz') iconClass = 'fa-brain';
        if (node.type === 'chest') iconClass = 'fa-box-open';
        
        let nodeClass = 'path-node';
        if (isLocked) nodeClass += ' locked';
        if (isCurrent) nodeClass += ' current';
        if (isCompleted) nodeClass += ' completed';
        
        let nodeColor = isCompleted ? '#fbbf24' : (isCurrent ? subjectColor : '#475569');
        let iconHtml = `<i class="fa-solid ${iconClass}"></i>`;
        
        // Zig-zag positioning
        const offset = Math.sin(index * 1.5) * 40; // -40px to +40px
        
        html += `
            <div class="path-step" style="transform: translateX(${offset}px)">
                <div class="${nodeClass}" style="background-color: ${nodeColor}; box-shadow: 0 8px 0 ${shadeColor(nodeColor, -30)};" onclick="handleNodeClick('${currentPathSubject}', ${node.id}, ${isLocked})">
                    ${iconHtml}
                </div>
                <div class="path-label" style="color: ${isLocked ? '#475569' : '#e2e8f0'}">${node.title}</div>
            </div>
        `;
        
        // Add connecting SVG line if not last node
        if (index < nodes.length - 1) {
            const nextOffset = Math.sin((index + 1) * 1.5) * 40;
            const diffX = nextOffset - offset;
            const curve = 30; // height of SVG
            
            // Draw a dynamic SVG path between nodes
            const isPathActive = node.id < userLevel; // Line is active if THIS node is completed
            const strokeColor = isPathActive ? '#fbbf24' : '#334155';
            const strokeWidth = 10;
            
            // Simple straight/diagonal connector for now via SVG
            html += `
                <div class="path-connector">
                    <svg width="100" height="40" viewBox="0 0 100 40" style="overflow:visible;">
                        <line x1="${50 + offset}" y1="0" x2="${50 + nextOffset}" y2="40" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
                    </svg>
                </div>
            `;
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function handleNodeClick(subject, nodeId, isLocked) {
    if (isLocked) {
        toast('🔒 عليك إتمام المحطات السابقة أولاً!', 'err');
        if(typeof playSound === 'function') playSound('err');
        return;
    }
    
    // Map path subjects to learningDB subjects
    const dbMap = {
        'math': 'math',
        'arabic': 'ar',
        'hisgeo': 'history'
    };
    
    const dbSubj = dbMap[subject];
    const nodeIndex = nodeId - 1; // 0-indexed for array
    
    // Check if lesson actually exists in learningDB
    if (dbSubj && typeof learningDB !== 'undefined' && learningDB[dbSubj] && learningDB[dbSubj][nodeIndex]) {
        if(typeof playSound === 'function') playSound('ok');
        // If it's already completed, we can still review it
        // If it's current, opening it might complete it at the end (handled in LMS usually)
        
        // Let's hook into the existing LMS logic
        if (typeof openLp === 'function') {
            openLp(dbSubj, nodeIndex);
            
            // To integrate with the path progress, we need the LMS to update the path when finished.
            // But for now, let's just mark it completed when they click if it's the current node
            const currentProg = getPathProgress(subject);
            if (nodeId === currentProg) {
                setPathProgress(subject, currentProg + 1);
                
                // Reward
                const node = ECO_PATH_NODES[subject].find(n => n.id === nodeId);
                let coins = (node && node.type === 'chest') ? 100 : 15;
                let currentCoins = parseInt(localStorage.getItem('eco_user_coins_v2')) || 0;
                localStorage.setItem('eco_user_coins_v2', currentCoins + coins);
                if (typeof EcoDB !== 'undefined' && EcoDB.updateXP) EcoDB.updateXP(50);
                triggerConfetti();
                toast(`🎉 مبروك! تقدمت في المسار وربحت ${coins} عملة!`, 'ok');
                renderPathMap();
            }
        } else {
            toast('حدث خطأ في النظام!', 'err');
        }
    } else {
        toast('هذه المحطة قيد التطوير وستتوفر قريباً! 🚧', 'info');
    }
}

// Utility for shading hex colors
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  
    let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    return "#"+RR+GG+BB;
}

// Confetti effect (simulated via simple DOM elements)
function triggerConfetti() {
    for (let i = 0; i < 30; i++) {
        let conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = ['#fbbf24', '#38bdf8', '#a4d466', '#f472b6'][Math.floor(Math.random() * 4)];
        document.body.appendChild(conf);
        
        setTimeout(() => {
            conf.style.top = '100vh';
            conf.style.opacity = '0';
        }, 50);
        
        setTimeout(() => {
            conf.remove();
        }, 2000);
    }
}

// Init path when tab is shown
function initPathTab() {
    try {
        renderPathSelector();
        renderPathMap();
    } catch(e) {
        toast("Path Error: " + e.message, "err");
        console.error(e);
    }
}
