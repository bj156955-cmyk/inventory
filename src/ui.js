import { state, updateState } from './state.js';
import { DOMAIN } from './config.js';
import * as api from './api.js';

export function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 translate-y-10 opacity-0`;
    
    const icon = type === 'error' ? 'error' : (type === 'success' ? 'check_circle' : 'info');
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <span class="text-sm font-bold">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y--2');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-24 lg:bottom-10 right-6 lg:right-10 z-[1000] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
    return container;
}

export function detectPlatform() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    document.body.classList.remove('platform-mobile', 'platform-pc');
    document.body.classList.add(isMobile ? 'platform-mobile' : 'platform-pc');
    console.log("Atelier: Platform detected -", isMobile ? "Mobile" : "PC");
}

export function showApp(user) {
    const username = user.email.replace(DOMAIN, "");
    updateState({ currentUser: user });

    const auth = document.getElementById('auth-container');
    const setup = document.getElementById('setup-overlay');
    const app = document.getElementById('app-container');

    if (auth) auth.classList.add('hidden');
    if (setup) setup.classList.add('hidden');
    if (app) {
        app.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
        app.classList.add('opacity-100');
        app.style.display = 'flex';
        app.style.pointerEvents = 'auto';
    }

    const nameLabels = ['user-display-name-desktop', 'user-name-dropdown', 'user-display-id-header'];
    nameLabels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = username.toUpperCase();
    });

    const navTeam = document.getElementById('nav-team');
    if (navTeam) navTeam.classList.remove('hidden');
}

export function showAuth() {
    const app = document.getElementById('app-container');
    const auth = document.getElementById('auth-container');
    if (app) app.classList.add('hidden');
    if (auth) auth.classList.remove('hidden');
}

export function renderCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;

    const categories = ['all', ...new Set(state.products.map(p => p.category).filter(c => c))];
    const fragment = document.createDocumentFragment();
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `chip ${state.currentCategory === cat ? 'active' : ''}`;
        btn.textContent = cat === 'all' ? 'All Items' : cat;
        btn.setAttribute('data-action', 'filter-category');
        btn.setAttribute('data-category', cat);
        fragment.appendChild(btn);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

export function getStatus(p) {
    const target = p.target_quantity || 1;
    const stock = p.stock_quantity || 0;
    const ratio = stock / target;
    if (stock <= 0) return 'OUT';
    if (ratio <= 0.25) return 'LOW';
    return 'OK';
}

export function renderInventory() {
    const desktopBody = document.getElementById('inventory-body');
    const mobileList = document.getElementById('mobile-inventory-list');
    if (!desktopBody || !mobileList) return;

    let filtered = state.products;
    if (state.currentCategory !== 'all') filtered = filtered.filter(p => p.category === state.currentCategory);
    if (state.currentStatusFilter === 'low') filtered = filtered.filter(p => getStatus(p) === 'LOW');
    else if (state.currentStatusFilter === 'out') filtered = filtered.filter(p => getStatus(p) === 'OUT');

    const dtFragment = document.createDocumentFragment();
    const mbFragment = document.createDocumentFragment();

    filtered.forEach(p => {
        const status = getStatus(p);
        const target = p.target_quantity || 1;
        const stock = p.stock_quantity || 0;
        const pending = p.pending_quantity || 0;
        const ratioPercent = Math.round((stock / target) * 100);
        const pendingPercent = Math.round((pending / target) * 100);
        const totalPercent = Math.min(ratioPercent + pendingPercent, 100);

        // Desktop Row
        const tr = document.createElement('tr');
        tr.className = "group hover:bg-surface-container-low transition-all cursor-pointer";
        tr.setAttribute('data-id', p.id);
        tr.setAttribute('data-action', 'edit');
        tr.innerHTML = `
            <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                    <div class="w-2 h-2 rounded-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}"></div>
                    <span class="text-sm font-black text-primary-container tracking-tight">${p.name}</span>
                </div>
            </td>
            <td class="px-8 py-6"><span class="text-[10px] font-black px-3 py-1 bg-surface-container-high rounded-lg text-primary-container uppercase tracking-widest">${p.category || 'N/A'}</span></td>
            <td class="px-8 py-6">
                <div class="flex flex-col gap-3 min-w-[140px]">
                    <div class="flex items-center justify-between flex-nowrap gap-4">
                        <div class="flex items-baseline gap-1 whitespace-nowrap shrink-0 ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-orange-500' : 'text-primary-container')}">
                            <span class="text-sm font-black">${stock}</span>
                            <span class="text-[10px] opacity-30 mx-1">/</span>
                            <span class="text-sm font-black opacity-30">${target}</span>
                        </div>
                    </div>
                    <div class="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden flex">
                        <div class="h-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}" style="width: ${Math.min(ratioPercent, 100)}%"></div>
                        <div class="h-full progress-pending ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-orange-400' : 'text-primary')}" style="width: ${Math.min(pendingPercent, 100 - ratioPercent)}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-8 py-6">
                <div class="flex items-center justify-center gap-2">
                    <button data-id="${p.id}" data-action="order" class="btn-action btn-order w-9 h-9 p-0" title="Order"><span class="material-symbols-outlined text-[18px]">shopping_cart</span></button>
                    <button data-id="${p.id}" data-action="receipt" class="btn-action btn-receipt w-9 h-9 p-0 ${pending <= 0 ? 'opacity-20 pointer-events-none' : ''}" title="Receipt"><span class="material-symbols-outlined text-[18px]">local_shipping</span></button>
                </div>
            </td>
            <td class="px-8 py-6 text-right">
                <button data-id="${p.id}" data-action="delete" class="p-2 text-on-surface-variant/20 hover:text-error opacity-0 group-hover:opacity-100 transition-all"><span class="material-symbols-outlined text-sm">delete</span></button>
            </td>
        `;
        dtFragment.appendChild(tr);

        // Mobile Card Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = "mobile-card-wrapper";
        wrapper.innerHTML = `
            <div class="mobile-card-actions">
                <button data-id="${p.id}" data-action="order" class="swipe-btn increment"><span class="material-symbols-outlined">shopping_cart</span></button>
                <button data-id="${p.id}" data-action="receipt" class="swipe-btn" style="background-color: #22c55e;"><span class="material-symbols-outlined">local_shipping</span></button>
                <button data-id="${p.id}" data-action="delete" class="swipe-btn delete"><span class="material-symbols-outlined">delete</span></button>
            </div>
        `;

        // Mobile Card
        const card = document.createElement('div');
        card.className = "mobile-inventory-card";
        card.setAttribute('data-id', p.id);
        card.setAttribute('data-action', 'edit');
        if (state.activeSwipeId === p.id) {
            card.style.transform = 'translateX(-180px)';
        }
        card.innerHTML = `
            <div class="flex-1 min-w-0">
                <p class="font-black text-sm text-primary-container tracking-tight truncate">${p.name}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">${p.category || 'N/A'}</span>
                </div>
                <div class="flex items-center gap-2 mt-3">
                    <div class="flex-1 bg-surface-container-low h-1.5 rounded-full overflow-hidden flex">
                        <div class="mobile-stock-progress h-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-red-400' : 'bg-primary')}" style="width: ${Math.min(ratioPercent, 100)}%"></div>
                        <div class="h-full progress-pending ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-red-400' : 'text-primary')}" style="width: ${Math.min(pendingPercent, 100 - ratioPercent)}%"></div>
                    </div>
                </div>
            </div>
            <div class="text-right flex flex-col items-end gap-1">
                <div class="mobile-stock-status flex items-baseline gap-1 whitespace-nowrap shrink-0 ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-red-500' : 'text-primary-container')}">
                    <span class="mobile-stock-count text-[10px] font-black">${stock}</span>
                    <span class="text-[8px] opacity-30">/</span>
                    <span class="text-[10px] font-black opacity-30">${target}</span>
                </div>
                <p class="mobile-stock-ratio text-[9px] font-black text-on-surface-variant/20 uppercase">${Math.round(totalPercent)}%</p>
                <div class="mobile-stock-badge-container">
                    ${status === 'LOW' || status === 'OUT' ? `<span class="mt-1 px-2 py-0.5 bg-red-50 text-red-600 text-[8px] font-black rounded-md border border-red-100 uppercase tracking-tighter">Low stock</span>` : ''}
                </div>
            </div>
        `;
        wrapper.appendChild(card);
        mbFragment.appendChild(wrapper);
    });


    desktopBody.innerHTML = '';
    desktopBody.appendChild(dtFragment);
    mobileList.innerHTML = '';
    mobileList.appendChild(mbFragment);
}

export function renderActivities() {
    const container = document.getElementById('activity-log-container');
    if (!container) return;
    
    if (state.activities.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest text-center mt-10">No recent activity</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    state.activities.forEach(act => {
        const date = new Date(act.created_at).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const userPrefix = act.user_email ? act.user_email.replace(DOMAIN, "").toUpperCase() : 'SYSTEM';
        
        const card = document.createElement('div');
        card.className = "flex gap-4 group relative";
        card.innerHTML = `
            <div class="w-8 h-8 rounded-full ${act.type === 'ORDER' ? 'bg-primary/10 text-primary' : 'bg-orange-400/10 text-orange-400'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-sm">${act.type === 'ORDER' ? 'shopping_cart' : 'local_shipping'}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-primary-container leading-tight mb-1">${act.message}</p>
                <p class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                    ${userPrefix} • ${date}
                </p>
            </div>
            <button data-id="${act.id}" data-action="delete-activity" class="absolute -right-2 top-0 p-1 text-on-surface-variant/10 hover:text-error opacity-0 group-hover:opacity-100 transition-all">
                <span class="material-symbols-outlined text-[14px]">close</span>
            </button>
        `;
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

export function renderAllowedUsers() {
    const container = document.getElementById('whitelist-container');
    if (!container) return;
    
    const fragment = document.createDocumentFragment();
    state.allowedUsers.forEach(user => {
        const card = document.createElement('div');
        card.className = "flex justify-between items-center p-5 bg-surface-container-low rounded-3xl group transition-all";
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center font-black text-primary text-xs tracking-tighter">${user.username.substring(0,2).toUpperCase()}</div>
                <div>
                    <p class="font-black text-sm text-primary-container tracking-widest uppercase">${user.username}</p>
                    <p class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Invited by ${user.created_by || 'Admin'}</p>
                </div>
            </div>
            <button data-id="${user.id}" data-action="remove-whitelist" class="p-2 text-on-surface-variant/20 hover:text-error opacity-0 group-hover:opacity-100 transition-all">
                <span class="material-symbols-outlined text-sm">remove_circle</span>
            </button>
        `;
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

export function renderActiveUsers() {
    const container = document.getElementById('active-users-list');
    const badge = document.getElementById('active-user-count');
    if (!container) return;
    
    const uniqueUsers = Object.keys(state.onlineUsers);
    if (badge) badge.textContent = uniqueUsers.length;

    const fragment = document.createDocumentFragment();
    uniqueUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = "flex items-center gap-3 p-3 bg-white/50 rounded-2xl";
        item.innerHTML = `
            <div class="relative">
                <div class="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-[10px] font-black text-white">${user.substring(0,2).toUpperCase()}</div>
                <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div class="text-left">
                <p class="text-xs font-black text-primary-container tracking-widest uppercase">${user}</p>
                <p class="text-[8px] font-bold text-green-600 uppercase">Online Now</p>
            </div>
        `;
        fragment.appendChild(item);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

export function updateStats() {
    document.querySelectorAll('#total-items').forEach(el => el.textContent = state.products.length.toLocaleString());
    const totalValue = state.products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0);
    document.querySelectorAll('#total-value').forEach(el => el.textContent = `₩${totalValue.toLocaleString()}`);
    const lowStock = state.products.filter(p => getStatus(p) === 'LOW').length;
    document.querySelectorAll('#low-stock').forEach(el => el.textContent = lowStock);
    const outOfStock = state.products.filter(p => getStatus(p) === 'OUT').length;
    document.querySelectorAll('#out-of-stock').forEach(el => el.textContent = outOfStock);
}

// Modal handling
export function openModal() { document.getElementById('modal-overlay').classList.add('active'); }
export function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
export function openActivityModal() { document.getElementById('activity-modal-overlay').classList.add('active'); }
export function closeActivityModal() { document.getElementById('activity-modal-overlay').classList.remove('active'); }
export function openPasswordModal() { document.getElementById('password-modal-overlay').classList.add('active'); }
export function closePasswordModal() { document.getElementById('password-modal-overlay').classList.remove('active'); }

/**
 * Custom Confirmation Modal
 * @param {Object} options { title, message, onConfirm }
 */
export function showConfirm({ title, message, onConfirm }) {
    const overlay = document.getElementById('confirm-modal-overlay');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-btn-confirm');
    const cancelBtn = document.getElementById('confirm-modal-btn-cancel');

    if (!overlay) return;

    titleEl.textContent = title || "Are you sure?";
    msgEl.textContent = message || "This action cannot be undone.";
    
    overlay.classList.add('active');

    const closeHandler = () => {
        overlay.classList.remove('active');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    confirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        closeHandler();
    };
    cancelBtn.onclick = closeHandler;
}

export function switchView(view) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(i => {
        if (i.getAttribute('data-view') === view) i.classList.add('active');
        else i.classList.remove('active');
    });

    const sections = ['section-stats', 'section-inventory', 'section-activity', 'section-team'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const title = document.getElementById('view-title');
    const subtitle = document.getElementById('view-subtitle');
    if (view === 'inventory') {
        const el = document.getElementById('section-inventory');
        if (el) el.classList.remove('hidden');
        title.textContent = "Full Inventory Management";
        subtitle.textContent = "Complete list of architectural assets across all zones.";
    } else if (view === 'team') {
        const el = document.getElementById('section-team');
        if (el) el.classList.remove('hidden');
        title.textContent = "Team Access Management";
        subtitle.textContent = "Manage whitelisted IDs and active warehouse members.";
    } else if (view === 'dashboard') {
        ['section-stats', 'section-activity', 'section-inventory'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
        title.textContent = "Main Atelier Dashboard";
        subtitle.textContent = "Real-time oversight of architectural stock movements.";
    }
}

export function editItem(id) {
    const p = state.products.find(i => i.id === id);
    if (!p) return;
    updateState({ editingId: id });
    document.getElementById('modal-title').textContent = "Adjust Item Details";
    document.getElementById('item-name').value = p.name;
    document.getElementById('item-category').value = p.category || '';
    document.getElementById('item-stock').value = p.stock_quantity;
    document.getElementById('item-target').value = p.target_quantity || 0;
    document.getElementById('item-price').value = p.price || 0;

    const auditInfo = document.getElementById('audit-info');
    if (p.updated_at && p.updated_by && auditInfo) {
        auditInfo.classList.remove('hidden');
        document.getElementById('audit-user').textContent = p.updated_by.toUpperCase();
        const date = new Date(p.updated_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        document.getElementById('audit-date').textContent = date;
    }
    openModal();
}
