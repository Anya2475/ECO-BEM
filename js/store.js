const STORE_ITEMS = [
    {
        id: 'border_bronze',
        name: 'إطار برونزي',
        desc: 'يحيط صورتك الرمزية بإطار برونزي في قائمة الأبطال.',
        price: 50,
        icon: 'fa-certificate',
        color: '#cd7f32',
        borderStyle: '3px solid #cd7f32'
    },
    {
        id: 'border_silver',
        name: 'إطار فضي',
        desc: 'يحيط صورتك الرمزية بإطار فضي لامع.',
        price: 150,
        icon: 'fa-certificate',
        color: '#c0c0c0',
        borderStyle: '3px solid #c0c0c0'
    },
    {
        id: 'border_gold',
        name: 'إطار ذهبي',
        desc: 'تميز كبطل مع إطار ذهبي فاخر.',
        price: 350,
        icon: 'fa-certificate',
        color: '#fbbf24',
        borderStyle: '3px solid #fbbf24; box-shadow: 0 0 10px #fbbf24;'
    },
    {
        id: 'border_fire',
        name: 'إطار ناري',
        desc: 'إطار أسطوري لأفضل الأبطال فقط.',
        price: 1000,
        icon: 'fa-fire',
        color: '#ef4444',
        borderStyle: '3px solid transparent; background: linear-gradient(#0f172a, #0f172a) padding-box, linear-gradient(to right, #ef4444, #f97316) border-box;'
    }
];

function initStore() {
    const container = document.getElementById('store-container');
    if (!container) return;
    
    // Update store coin balance
    document.getElementById('store-ui-coins').textContent = window.userCoins || 0;
    
    let userInventory = [];
    let activeBorder = '';
    
    try {
        const invStr = localStorage.getItem('eco_user_inventory');
        if (invStr) userInventory = JSON.parse(invStr);
        activeBorder = localStorage.getItem('eco_active_border') || '';
    } catch(e) {}
    
    let html = `<div style="display:flex; flex-direction:column; gap:16px; margin-top:20px;">`;
    
    STORE_ITEMS.forEach(item => {
        const isOwned = userInventory.includes(item.id);
        const isActive = activeBorder === item.id;
        
        let btnHtml = '';
        if (isActive) {
            btnHtml = `<button disabled style="background:#475569; color:#94a3b8; border:none; padding:8px 16px; border-radius:12px; font-weight:800;">مُستخدم حالياً</button>`;
        } else if (isOwned) {
            btnHtml = `<button onclick="equipItem('${item.id}')" style="background:#34d399; color:#064e3b; border:none; padding:8px 16px; border-radius:12px; font-weight:800; cursor:pointer;">استعمل الآن</button>`;
        } else {
            const canAfford = window.userCoins >= item.price;
            const btnStyle = canAfford 
                ? `background:#fbbf24; color:#78350f; border:none; padding:8px 16px; border-radius:12px; font-weight:800; cursor:pointer;` 
                : `background:#334155; color:#94a3b8; border:none; padding:8px 16px; border-radius:12px; font-weight:800; cursor:not-allowed;`;
            
            btnHtml = `<button ${canAfford ? `onclick="buyItem('${item.id}')"` : 'disabled'} style="${btnStyle}">
                شراء بـ ${item.price} <i class="fa-solid fa-coins"></i>
            </button>`;
        }
        
        html += `
            <div style="background:#1e293b; border-radius:20px; padding:20px; display:flex; align-items:center; gap:15px; border:1px solid rgba(255,255,255,0.05);">
                <div style="width:50px; height:50px; border-radius:14px; background:rgba(0,0,0,0.2); display:flex; justify-content:center; align-items:center; color:${item.color}; font-size:24px; flex-shrink:0;">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <div style="flex:1;">
                    <h3 style="margin:0 0 5px; font-size:16px; color:#f8fafc;">${item.name}</h3>
                    <p style="margin:0; font-size:12px; color:#94a3b8; line-height:1.4;">${item.desc}</p>
                </div>
                <div style="text-align:left;">
                    ${btnHtml}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

window.buyItem = function(itemId) {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    
    if (window.userCoins < item.price) {
        if(typeof toast === 'function') toast('عفواً، لا تملك عملات كافية!', 'err');
        return;
    }
    
    // Deduct coins
    window.userCoins -= item.price;
    document.getElementById('ui-coins').textContent = window.userCoins;
    document.getElementById('store-ui-coins').textContent = window.userCoins;
    
    // Add to inventory
    let userInventory = [];
    try {
        const invStr = localStorage.getItem('eco_user_inventory');
        if (invStr) userInventory = JSON.parse(invStr);
    } catch(e) {}
    
    if (!userInventory.includes(item.id)) {
        userInventory.push(item.id);
        localStorage.setItem('eco_user_inventory', JSON.stringify(userInventory));
    }
    
    if (typeof EcoDB !== 'undefined' && EcoDB.setStat) {
        EcoDB.setStat('coins', window.userCoins);
    }
    
    if(typeof window.saveToDB === 'function') {
        window.saveToDB({ coins: window.userCoins, inventory: userInventory });
    }
    
    if(typeof toast === 'function') toast(`🎉 مبروك! لقد اشتريت ${item.name}`, 'ok');
    
    initStore(); // refresh UI
};

window.equipItem = function(itemId) {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    
    localStorage.setItem('eco_active_border', itemId);
    
    if(typeof window.saveToDB === 'function') {
        window.saveToDB({ active_border: itemId });
    }
    
    if(typeof toast === 'function') toast(`تم تفعيل ${item.name} بنجاح!`, 'ok');
    
    initStore(); // refresh UI
    
    // Apply locally to avatar if needed
    const accAv = document.getElementById('account-avatar');
    if (accAv) {
        accAv.style.cssText = `margin-bottom:18px;cursor:pointer;position:relative;background-size:cover;background-position:center; ${item.borderStyle}`;
        if(localStorage.getItem('eco_user_avatar')) {
             accAv.style.backgroundImage = `url('${localStorage.getItem('eco_user_avatar')}')`;
        }
    }
};

// Hook into overlay opening
const storeOriginalOpenOverlay = window.openOverlay;
window.openOverlay = function(id) {
    if (id === 'store') initStore();
    if (storeOriginalOpenOverlay) storeOriginalOpenOverlay(id);
};
