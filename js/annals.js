// ═══════════════ BEM ANNALS LOGIC ═══════════════
function renderAnnalsSubjects() {
  const listEl = document.getElementById('annals-subject-list');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  
  if (typeof annalsData === 'undefined') {
    listEl.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;">لم يتم العثور على بيانات الحوليات. تأكد من تحميل annalsData.js</div>';
    
    return;
  }
  
  const subjects = Object.keys(annalsData);
  if (subjects.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;">لا توجد حوليات متوفرة حالياً.</div>';
  } else {
    subjects.forEach(sub => {
      // Find the first year to use as default or create a sub-menu later
      // For now, if clicking a subject, just open the first year available
      const years = Object.keys(annalsData[sub]).sort((a,b)=>b.localeCompare(a)); // newest first
      const defaultYear = years[0];
      
      const div = document.createElement('div');
      div.className = 'tile';
      div.style.textAlign = 'center';
      div.style.padding = '15px';
      
      // Determine color based on subject (simple hash or mapping)
      let color = '#fbbf24';
      if(sub.includes('رياضيات') || sub.includes('فيزياء')) color = '#38bdf8';
      if(sub.includes('عربية') || sub.includes('إسلامية')) color = '#10b981';
      if(sub.includes('تاريخ')) color = '#a855f7';
      if(sub.includes('فرنسية') || sub.includes('إنجليزية')) color = '#f43f5e';
      
      div.innerHTML = `
        <div class="tile-icon" style="background:${color}20;color:${color};margin:0 auto 10px;">
          <i class="fa-solid fa-book"></i>
        </div>
        <h4 style="margin:0;font-size:1rem;">${sub}</h4>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:5px;">${years.length} مواضيع متوفرة</div>
      `;
      div.onclick = () => openAnnalsViewer(sub, defaultYear);
      listEl.appendChild(div);
    });
  }
  
  
}

function openAnnalsViewer(subject, year) {
  const viewerTitle = document.getElementById('annals-viewer-title');
  const bentoArea = document.getElementById('bento-content-area');
  
  if (!annalsData || !annalsData[subject] || !annalsData[subject][year]) {
      bentoArea.innerHTML = "<p style='text-align:center;padding:20px;'>عذراً، هذا الموضوع غير متوفر حالياً.</p>";
      return;
  }
  
  const data = annalsData[subject][year];
  // Convert spaces and fix paths for the iframe
  const questionPath = data.question;
  const answerPath = data.answer || data.question; // Fallback if no answer
  
  // Build a dropdown for years if multiple years exist
  const availableYears = Object.keys(annalsData[subject]);
  let titleHtml = `حوليات ${subject}`;
  if (availableYears.length > 1) {
    let savedYears = JSON.parse('{}');
    let options = availableYears.map(y => {
      return { key: y, display: savedYears[`${subject}_${y}`] || y.replace('_', ' ') };
    });
    
    let uniqueOptions = [];
    let seen = new Set();
    options.forEach(opt => {
      if (!seen.has(opt.display)) {
        seen.add(opt.display);
        uniqueOptions.push(opt);
      }
    });
    uniqueOptions.sort((a, b) => b.display.localeCompare(a.display));

    titleHtml += ` <select onchange="openAnnalsViewer('${subject}', this.value)" style="margin-right:10px;padding:4px;border-radius:4px;background:#fff;color:#000;border:1px solid #ccc;font-weight:bold;cursor:pointer;">`;
    uniqueOptions.forEach(opt => {
      titleHtml += `<option value="${opt.key}" ${opt.key === year ? 'selected' : ''}>${opt.display}</option>`;
    });
    titleHtml += `</select>`;
  } else {
    titleHtml += ` - ${year}`;
  }
  viewerTitle.innerHTML = titleHtml;
  
  // Build Bento UI
  bentoArea.innerHTML = `
        <!-- عرض ملف السؤال -->
        <section class="bento-card pdf-card" style="margin-bottom: 20px;">
            <h2 id="examTitle">نص الموضوع 📄</h2>
            <iframe id="questionIframe" src="${questionPath}#toolbar=0" width="100%" height="500px" style="border: 2px solid #eee; border-radius: 12px;"></iframe>
        </section>

        <!-- مساحة المحاولة -->
        <section class="bento-card attempt-card" style="margin-bottom: 20px;">
            <h2>مساحة المحاولة ✍️</h2>
            <p>اكتب إجابتك هنا لتتمكن من رؤية الحل النموذجي.</p>
            
            <textarea id="studentAttempt" class="bento-textarea" rows="6" placeholder="ابدأ بكتابة إجابتك هنا..."></textarea>
            
            <div class="bento-actions">
                <button id="uploadBtn" class="bento-btn bento-secondary" onclick="alert('سيتم ربط هذا الزر لاحقاً لرفع صورة من الهاتف أو الحاسوب.')">📷 إرفاق صورة لمحاولتي</button>
                <button id="showAnswerBtn" class="bento-btn bento-primary" disabled style="background-color:#cccccc;">🔒 عرض الإجابة النموذجية</button>
            </div>
        </section>

        <!-- عرض ملف الإجابة النموذجية -->
        <section id="answerSection" class="bento-card pdf-card bento-hidden">
            <h2>الإجابة النموذجية وسلم التنقيط 🎯</h2>
            <iframe id="answerIframe" src="${answerPath}#toolbar=0" width="100%" height="600px" style="border: 2px solid #eee; border-radius: 12px;"></iframe>
            
            <div class="self-evaluation">
                <h3 style="width: 100%; text-align: center; margin-bottom: 10px;">قيم محاولتك:</h3>
                <button class="eval-btn success" onclick="alert('أحسنت! تمت إضافة 100 نقطة.')">صحيحة كلياً (+100 نقطة)</button>
                <button class="eval-btn warning" onclick="alert('محاولة جيدة! تمت إضافة 50 نقطة.')">صحيحة جزئياً (+50 نقطة)</button>
                <button class="eval-btn danger" onclick="alert('لا بأس، الخطأ جزء من التعلم. (+10 نقاط)')">خاطئة (+10 نقاط)</button>
            </div>
        </section>
  `;
  
  // Attach event listeners for the newly injected HTML
  const attemptText = document.getElementById("studentAttempt");
  const showAnswerBtn = document.getElementById("showAnswerBtn");
  const answerSection = document.getElementById("answerSection");

  attemptText.addEventListener("input", () => {
      if (attemptText.value.trim().length >= 5) {
          showAnswerBtn.disabled = false;
          showAnswerBtn.innerHTML = "👁️ عرض الإجابة النموذجية";
          showAnswerBtn.style.backgroundColor = "#4CAF50"; 
      } else {
          showAnswerBtn.disabled = true;
          showAnswerBtn.innerHTML = "🔒 عرض الإجابة النموذجية";
          showAnswerBtn.style.backgroundColor = "#cccccc"; 
      }
  });

  showAnswerBtn.addEventListener("click", () => {
      answerSection.classList.remove("bento-hidden");
      setTimeout(() => { answerSection.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
      
      showAnswerBtn.innerHTML = "✅ تم كشف الإجابة";
      showAnswerBtn.disabled = true;
      showAnswerBtn.style.backgroundColor = "#2E7D32";
  });
  
  openOverlay('annals-viewer');
}

function showAnnalsSolution() {
  const attemptArea = document.getElementById('annals-attempt-area');
  if (attemptArea.value.trim().length < 5) {
    alert('يرجى المحاولة وكتابة إجابتك (أو بعض النقاط الرئيسية) قبل عرض الحل النموذجي!');
    attemptArea.focus();
    return;
  }
  
  document.getElementById('annals-solution-images').style.display = 'block';
  document.getElementById('annals-show-solution-btn').style.display = 'none';
  
  // Scroll to solution
  setTimeout(() => {
    document.getElementById('annals-solution-images').scrollIntoView({behavior: 'smooth'});
  }, 100);
}

function closeAnnalsViewer() {
  closeOverlay('annals-viewer');
}

window.openAnnalsViewer = openAnnalsViewer;

window.editYear = function(subject, yearId) {
    let saved = JSON.parse('{}' || '{}');
    let current = saved[`${subject}_${yearId}`] || yearId.replace('_', ' ');
    let newYear = prompt("أدخل السنة الصحيحة لهذا الامتحان (مثلاً: 2024):", current);
    if (newYear && newYear.trim() !== '') {
        saved[`${subject}_${yearId}`] = newYear.trim();
        localStorage.setItem('customYears', JSON.stringify(saved));
        openAnnalsViewer(subject, yearId); // Refresh view
    }
};

window.adjustSplit = function(subject, yearId, delta) {
    const data = annalsData[subject][yearId];
    let customSplits = JSON.parse(localStorage.getItem('customSplits') || '{}');
    let currentSplit = customSplits[`${subject}_${yearId}`] !== undefined ? customSplits[`${subject}_${yearId}`] : data.split_idx;
    currentSplit += delta;
    if (currentSplit < 1) currentSplit = 1;
    if (currentSplit > data.pages.length) currentSplit = data.pages.length;
    customSplits[`${subject}_${yearId}`] = currentSplit;
    localStorage.setItem('customSplits', JSON.stringify(customSplits));
    openAnnalsViewer(subject, yearId);
};
