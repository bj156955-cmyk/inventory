// Atelier Inventory - Premium Real-time Core (Dual-Platform Mode)

console.log("Atelier: Dual-Platform Core loaded");

let supabaseClient;
let products = [];
let activities = [];
let allowedUsers = [];
let editingId = null;
let isSignUp = false;
let realtimeChannel;
let activityChannel;
let whitelistChannel;
let currentCategory = 'all';
let currentStatusFilter = 'all'; 
let presenceChannel;
let onlineUsers = {}; 

const DOMAIN = "@atelier.app"; // Internal domain proxy
const CONFIG_URL = "https://dxtnryxplefvtcpdsnuq.supabase.co";
const CONFIG_KEY = "sb_publishable_4OUEZ3TcBegF2JtqoldIzA_qo7sNkNm";

// --- Initialization ---

window.onload = () => {
    console.log("Atelier: Window Loaded");
    setupEventListeners();
    checkSetup();
};

function checkSetup() {
    initSupabase(CONFIG_URL, CONFIG_KEY);
}

async function initSupabase(url, key) {
    try {
        if (typeof supabase === 'undefined') throw new Error("Supabase library not loaded.");
        supabaseClient = supabase.createClient(url, key);
        await checkAuth();
    } catch (e) {
        console.error("Atelier: Init error", e);
        localStorage.clear();
        location.reload();
    }
}

// --- Auth Section ---

async function checkAuth() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session) showApp(session.user);
        else showAuth();
    } catch (e) {
        showAuth();
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) showApp(session.user);
        else showAuth();
    });
}

function showApp(user) {
    const username = user.email.replace(DOMAIN, "");
    console.log("Atelier: Showing App for ID:", username);

    const auth = document.getElementById('auth-container');
    const setup = document.getElementById('setup-overlay');
    const app = document.getElementById('app-container');

    if (auth) { auth.style.display = 'none'; auth.classList.add('hidden'); }
    if (setup) { setup.style.display = 'none'; setup.classList.add('hidden'); }

    if (app) {
        app.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
        app.classList.add('opacity-100');
        app.style.display = 'block'; // Changed from flex to allow inner wrappers to handle it
        app.style.pointerEvents = 'auto';
    }

    const nameLabel = document.getElementById('user-display-name-desktop');
    if (nameLabel) nameLabel.textContent = username.toUpperCase();

    // Team Access visible to all team members
    document.querySelectorAll('[id^="nav-team"]').forEach(el => el.classList.remove('hidden'));

    fetchProducts();
    fetchActivities();
    fetchAllowedUsers();
    setupRealtime();
    setupPresence(username);
}

function showAuth() {
    const app = document.getElementById('app-container');
    const auth = document.getElementById('auth-container');
    if (app) { app.classList.add('hidden'); app.style.display = 'none'; }
    if (auth) { auth.classList.remove('hidden'); auth.style.display = 'flex'; }
}

// --- Whitelist Logic ---

async function fetchAllowedUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('allowed_users')
            .select('*')
            .order('username', { ascending: true });

        if (error) throw error;
        allowedUsers = data;
        renderAllowedUsers();
    } catch (e) {
        console.error("Atelier: Whitelist fetch error", e);
    }
}

function renderAllowedUsers() {
    const containers = [
        document.getElementById('whitelist-container-pc'),
        document.getElementById('whitelist-container-mobile')
    ];
    
    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';

        allowedUsers.forEach(user => {
            const card = document.createElement('div');
            card.className = "flex justify-between items-center p-4 bg-surface-container-low rounded-2xl group transition-all";
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-primary/5 rounded-xl flex items-center justify-center font-black text-primary text-[10px] uppercase">${user.username.substring(0,2)}</div>
                    <div>
                        <p class="font-black text-xs text-primary-container tracking-widest uppercase">${user.username}</p>
                        <p class="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">By ${user.created_by || 'Admin'}</p>
                    </div>
                </div>
                <button onclick="removeWhitelistedUser('${user.id}')" class="p-2 text-on-surface-variant/20 hover:text-error transition-all">
                    <span class="material-symbols-outlined text-sm">remove_circle</span>
                </button>
            `;
            container.appendChild(card);
        });
    });
}

async function addWhitelistedUser(username) {
    if (!username) return;
    const cleanUsername = username.trim().toLowerCase();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const inviterId = user.email.replace(DOMAIN, "").toLowerCase();

    const { error } = await supabaseClient
        .from('allowed_users')
        .insert([{ username: cleanUsername, created_by: inviterId }]);

    if (error) alert(error.message);
    else fetchAllowedUsers();
}

async function removeWhitelistedUser(id) {
    if (confirm('Revoke access for this user?')) {
        const { error } = await supabaseClient
            .from('allowed_users')
            .delete()
            .eq('id', id);
        
        if (error) alert(error.message);
        else fetchAllowedUsers();
    }
}

// --- Presence Logic (Active Users) ---

function setupPresence(username) {
    presenceChannel = supabaseClient.channel('atelier-lobby', {
        config: { presence: { key: username } }
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            onlineUsers = presenceChannel.presenceState();
            renderActiveUsers();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ online_at: new Date().toISOString() });
            }
        });
}

function renderActiveUsers() {
    const containers = [
        document.getElementById('active-users-list-pc'),
        document.getElementById('active-users-list-mobile')
    ];
    
    const uniqueUsers = Object.keys(onlineUsers);

    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';

        uniqueUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = "flex items-center gap-3 p-3 bg-white/50 rounded-2xl w-full";
            item.innerHTML = `
                <div class="relative">
                    <div class="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-[10px] font-black text-white">${user.substring(0,2).toUpperCase()}</div>
                    <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div class="text-left">
                    <p class="text-[10px] font-black text-primary-container tracking-widest uppercase">${user}</p>
                    <p class="text-[7px] font-bold text-green-600 uppercase">Online</p>
                </div>
            `;
            container.appendChild(item);
        });
    });
}

async function fetchProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        products = data;
        renderCategoryChips();
        renderInventory();
        updateStats();
    } catch (e) {
        console.error("Atelier: Fetch error", e);
    }
}

async function fetchActivities() {
    try {
        const { data, error } = await supabaseClient
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        activities = data;
        renderActivities();
    } catch (e) {
        console.error("Atelier: Fetch Activities error", e);
    }
}

function setupRealtime() {
    if (!realtimeChannel) {
        realtimeChannel = supabaseClient.channel('db-products')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                if (payload.eventType === 'INSERT') products.push(payload.new);
                else if (payload.eventType === 'UPDATE') {
                    products = products.map(p => p.id === payload.new.id ? payload.new : p);
                }
                else if (payload.eventType === 'DELETE') products = products.filter(p => p.id !== payload.old.id);
                renderCategoryChips();
                renderInventory();
                updateStats();
            })
            .subscribe();
    }

    if (!activityChannel) {
        activityChannel = supabaseClient.channel('db-activities')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
                activities.unshift(payload.new);
                if (activities.length > 20) activities.pop();
                renderActivities();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, (payload) => {
                activities = activities.filter(a => a.id !== payload.old.id);
                renderActivities();
            })
            .subscribe();
    }

    if (!whitelistChannel) {
        whitelistChannel = supabaseClient.channel('db-whitelist')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'allowed_users' }, (payload) => {
                fetchAllowedUsers();
            })
            .subscribe();
    }
}

function renderCategoryChips() {
    const containers = [
        document.getElementById('category-chips-pc'),
        document.getElementById('category-chips-mobile')
    ];

    const categories = ['all', ...new Set(products.map(p => p.category).filter(c => c))];

    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `chip ${currentCategory === cat ? 'active' : ''}`;
            btn.textContent = cat === 'all' ? 'All Items' : cat;
            btn.onclick = () => {
                currentCategory = cat;
                renderCategoryChips();
                renderInventory();
            };
            container.appendChild(btn);
        });
    });
}

function getStatus(p) {
    const target = p.target_quantity || 1;
    const stock = p.stock_quantity || 0;
    const ratio = stock / target;

    if (stock <= 0) return 'OUT';
    if (ratio <= 0.25) return 'LOW';
    return 'OK';
}

function renderInventory() {
    const desktopBody = document.getElementById('inventory-body-pc');
    const mobileList = document.getElementById('mobile-inventory-list');
    if (!desktopBody || !mobileList) return;

    desktopBody.innerHTML = '';
    mobileList.innerHTML = '';

    let filtered = products;
    if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    
    if (currentStatusFilter === 'low') filtered = filtered.filter(p => getStatus(p) === 'LOW');
    else if (currentStatusFilter === 'out') filtered = filtered.filter(p => getStatus(p) === 'OUT');

    filtered.forEach(p => {
        const status = getStatus(p);
        const target = p.target_quantity || 0;
        const stock = p.stock_quantity || 0;
        const ratioPercent = target > 0 ? Math.round((stock / target) * 100) : 0;

        // PC Row
        const tr = document.createElement('tr');
        tr.className = "group hover:bg-surface-container-low transition-all cursor-pointer";
        tr.onclick = () => editItem(p.id);
        tr.innerHTML = `
            <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                    <div class="w-2 h-2 rounded-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}"></div>
                    <span class="text-sm font-black text-primary-container tracking-tight">${p.name}</span>
                </div>
            </td>
            <td class="px-8 py-6 text-xs font-black text-on-surface-variant/40 tracking-widest">${p.sku || 'NONE'}</td>
            <td class="px-8 py-6"><span class="text-[10px] font-black px-3 py-1 bg-surface-container-high rounded-lg text-primary-container uppercase tracking-widest">${p.category || 'N/A'}</span></td>
            <td class="px-8 py-6">
                <div class="flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-black ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-orange-500' : 'text-primary-container')}">${stock} / ${target}</span>
                        <span class="text-[10px] font-bold text-on-surface-variant/40">${ratioPercent}%</span>
                    </div>
                    <div class="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
                        <div class="h-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}" style="width: ${Math.min(ratioPercent, 100)}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-8 py-6 text-right">
                <button onclick="event.stopPropagation(); deleteItem('${p.id}')" class="p-2 text-on-surface-variant/20 hover:text-error opacity-0 group-hover:opacity-100 transition-all"><span class="material-symbols-outlined text-sm">delete</span></button>
            </td>
        `;
        desktopBody.appendChild(tr);

        // Mobile Card
        const card = document.createElement('div');
        card.className = "mobile-inventory-card shadow-sm border border-black/[0.02]";
        card.innerHTML = `
            <div class="flex-1 min-w-0" onclick="editItem('${p.id}')">
                <p class="font-black text-sm text-primary-container tracking-tight truncate">${p.name}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">SKU: ${p.sku || 'NONE'}</span>
                    <span class="w-1 h-1 rounded-full bg-black/5"></span>
                    <span class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">${p.category || 'N/A'}</span>
                </div>
                
                <div class="flex items-center gap-2 mt-3">
                    <div class="flex-1 bg-surface-container-low h-1 rounded-full overflow-hidden">
                        <div class="h-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-red-400' : 'bg-primary')}" style="width: ${Math.min(ratioPercent, 100)}%"></div>
                    </div>
                </div>
            </div>
            <div class="text-right flex flex-col items-end gap-1">
                <p class="text-[10px] font-black ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-red-500' : 'text-primary-container')} uppercase">${stock} / ${target}</p>
                <p class="text-[9px] font-black text-on-surface-variant/20 uppercase">${ratioPercent}%</p>
                ${status === 'LOW' || status === 'OUT' ? `<span class="mt-1 px-2 py-0.5 bg-red-50 text-red-600 text-[8px] font-black rounded-md border border-red-100 uppercase tracking-tighter">Low stock</span>` : ''}
            </div>
        `;
        mobileList.appendChild(card);
    });
}

function renderActivities() {
    const container = document.getElementById('activity-log-pc');
    if (!container) return;
    container.innerHTML = '';

    if (activities.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest text-center mt-10">No recent activity</p>';
        return;
    }

    activities.forEach(act => {
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
                <p class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">${userPrefix} • ${date}</p>
            </div>
            <button onclick="deleteActivity('${act.id}')" class="absolute -right-2 top-0 p-1 text-on-surface-variant/10 hover:text-error opacity-0 group-hover:opacity-100 transition-all"><span class="material-symbols-outlined text-[14px]">close</span></button>
        `;
        container.appendChild(card);
    });
}

function updateStats() {
    // Total Items
    document.querySelectorAll('[id^="total-items"]').forEach(el => el.textContent = products.length.toLocaleString());
    
    // Total Value
    const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0);
    document.querySelectorAll('[id^="total-value"]').forEach(el => el.textContent = `₩${totalValue.toLocaleString()}`);
    
    // Low Stock
    const lowStock = products.filter(p => getStatus(p) === 'LOW').length;
    document.querySelectorAll('[id^="low-stock"]').forEach(el => el.textContent = lowStock);
    
    // Out of Stock
    const outOfStock = products.filter(p => getStatus(p) === 'OUT').length;
    document.querySelectorAll('[id^="out-of-stock"]').forEach(el => el.textContent = outOfStock);
}

function handleGlobalSearch(query) {
    const dropdown = document.getElementById('search-results-dropdown');
    const list = document.getElementById('search-results-list');
    if (!query || query.length < 2) { if (dropdown) dropdown.classList.add('hidden'); return; }

    const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 8); 

    if (results.length > 0 && dropdown && list) {
        dropdown.classList.remove('hidden');
        list.innerHTML = '';
        results.forEach(p => {
            const status = getStatus(p);
            item = document.createElement('div');
            item.className = "flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 cursor-pointer group";
            item.onclick = () => { editItem(p.id); dropdown.classList.add('hidden'); document.getElementById('search-input-desktop').value = ''; };
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}"></div>
                    <span class="text-xs font-black text-primary-container group-hover:text-primary">${p.name}</span>
                </div>
                <span class="text-[10px] font-black text-on-surface-variant/40">${p.stock_quantity}/${p.target_quantity || 0}</span>
            `;
            list.appendChild(item);
        });
    } else if (dropdown) { dropdown.classList.add('hidden'); }
}

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input-desktop');
    if (searchInput) searchInput.oninput = (e) => handleGlobalSearch(e.target.value);
    
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('search-results-dropdown');
        const searchInput = document.getElementById('search-input-desktop');
        if (dropdown && !dropdown.contains(e.target) && e.target !== searchInput) dropdown.classList.add('hidden');
    });

    // Modals
    document.querySelectorAll('[id^="add-activity-btn"]').forEach(btn => btn.onclick = openActivityModal);
    document.getElementById('close-activity-modal').onclick = closeActivityModal;
    document.getElementById('close-modal').onclick = closeModal;

    // Item Creation
    document.querySelectorAll('[id^="add-item-btn"]').forEach(btn => btn.onclick = openAddModal);

    // Logout
    document.querySelectorAll('[id^="logout-btn"]').forEach(btn => btn.onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); });
    
    // Refresh
    document.querySelectorAll('[id^="refresh-btn"]').forEach(btn => btn.onclick = fetchProducts);

    // Navigation
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        };
    });

    // Filters
    document.querySelectorAll('[id^="filter-total"]').forEach(el => el.onclick = () => { currentStatusFilter = 'all'; renderInventory(); });
    document.querySelectorAll('[id^="filter-low"]').forEach(el => el.onclick = () => { currentStatusFilter = 'low'; renderInventory(); });
    document.querySelectorAll('[id^="filter-out"]').forEach(el => el.onclick = () => { currentStatusFilter = 'out'; renderInventory(); });

    // Forms
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const rawId = document.getElementById('auth-username').value.trim();
            const password = document.getElementById('auth-password').value;
            const email = rawId.toLowerCase() + DOMAIN;
            const lowerId = rawId.toLowerCase();

            const { data: allowed } = await supabaseClient.from('allowed_users').select('*').ilike('username', lowerId).single();
            const isBJ = lowerId === 'bj';

            if (!allowed && !isBJ) { alert("Unauthorized ID."); return; }

            const { data, error } = isSignUp 
                ? await supabaseClient.auth.signUp({ email, password }) 
                : await supabaseClient.auth.signInWithPassword({ email, password });
            
            if (error) { alert(error.message); return; }
            if (isBJ && !allowed && data.user) await supabaseClient.from('allowed_users').insert([{ username: 'bj', created_by: 'system' }]);
        };
    }

    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.onsubmit = async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            const data = {
                name: document.getElementById('item-name').value,
                sku: document.getElementById('item-sku').value.trim() || null,
                category: document.getElementById('item-category').value,
                stock_quantity: parseInt(document.getElementById('item-stock').value),
                target_quantity: parseInt(document.getElementById('item-target').value || 0),
                price: parseFloat(document.getElementById('item-price').value || 0),
                updated_at: new Date().toISOString(),
                updated_by: user ? user.email.replace(DOMAIN, "") : 'System'
            };
            if (editingId) await supabaseClient.from('products').update(data).eq('id', editingId);
            else await supabaseClient.from('products').insert([data]);
            await fetchProducts();
            closeModal();
        };
    }

    const activityForm = document.getElementById('activity-form');
    if (activityForm) {
        activityForm.onsubmit = async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            const typeValue = document.querySelector('input[name="activity-type"]:checked').value;
            const { error } = await supabaseClient.from('activities').insert([{
                type: typeValue,
                message: document.getElementById('activity-message').value,
                user_email: user ? user.email.replace(DOMAIN, "").toUpperCase() : 'UNKNOWN',
                created_at: new Date().toISOString()
            }]);
            if (error) alert(error.message);
            else { await fetchActivities(); closeActivityModal(); }
        };
    }

    document.querySelectorAll('[id^="add-whitelist-btn"]').forEach(btn => {
        btn.onclick = () => {
            const id = prompt("Enter new User ID:");
            if (id) addWhitelistedUser(id.trim());
        };
    });
}

function switchView(view) {
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(i => {
        if (i.getAttribute('data-view') === view) i.classList.add('active');
        else i.classList.remove('active');
    });

    const pcViews = {
        dashboard: ['section-stats-pc', 'pc-main-layout'],
        inventory: ['section-inventory-pc'],
        team: ['section-team-pc']
    };

    const mobileViews = {
        dashboard: ['section-stats-mobile', 'section-inventory-mobile'],
        inventory: ['section-inventory-mobile'],
        team: ['section-team-mobile']
    };

    // Helper to toggle visibility
    const toggle = (map, currentView) => {
        Object.keys(map).forEach(v => {
            map[v].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (v === currentView) el.classList.remove('hidden');
                    else el.classList.add('hidden');
                }
            });
        });
    };

    toggle(pcViews, view);
    toggle(mobileViews, view);

    // Update Titles
    const titles = {
        dashboard: ["Main Atelier Dashboard", "Dashboard"],
        inventory: ["Full Inventory Management", "Stock"],
        team: ["Team Access Management", "Team"]
    };

    const pcTitle = document.getElementById('view-title-pc');
    const mobileTitle = document.getElementById('view-title-mobile');
    if (pcTitle) pcTitle.textContent = titles[view][0];
    if (mobileTitle) mobileTitle.textContent = titles[view][1];
}

function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = "Create New Entry";
    document.getElementById('audit-info').classList.add('hidden');
    document.getElementById('item-form').reset();
    openModal();
}

function openActivityModal() { document.getElementById('activity-form').reset(); document.getElementById('activity-modal-overlay').classList.add('active'); }
function closeActivityModal() { document.getElementById('activity-modal-overlay').classList.remove('active'); }
function openModal() { document.getElementById('modal-overlay').classList.add('active'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

async function editItem(id) {
    const p = products.find(i => i.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById('modal-title').textContent = "Adjust Item Details";
    document.getElementById('item-name').value = p.name;
    document.getElementById('item-sku').value = p.sku || ''; 
    document.getElementById('item-category').value = p.category || '';
    document.getElementById('item-stock').value = p.stock_quantity;
    document.getElementById('item-target').value = p.target_quantity || 0;
    document.getElementById('item-price').value = p.price || 0;

    const auditInfo = document.getElementById('audit-info');
    if (p.updated_at && p.updated_by && auditInfo) {
        auditInfo.classList.remove('hidden');
        document.getElementById('audit-user').textContent = p.updated_by.toUpperCase();
        document.getElementById('audit-date').textContent = new Date(p.updated_at).toLocaleString('ko-KR');
    }
    openModal();
}

async function deleteItem(id) { if (confirm('Delete item?')) { await supabaseClient.from('products').delete().eq('id', id); fetchProducts(); } }
async function deleteActivity(id) { if (confirm('Delete activity?')) { await supabaseClient.from('activities').delete().eq('id', id); fetchActivities(); } }
