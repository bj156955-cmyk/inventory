// Atelier Inventory - Premium Real-time Core (Whitelisted ID Edition)

function detectPlatform() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.body.classList.add('platform-mobile');
    } else {
        document.body.classList.add('platform-pc');
    }
    console.log("Atelier: Platform detected -", isMobile ? "Mobile" : "PC");
}

/* CSS Injection for Layout Stability */
const style = document.createElement('style');
style.innerHTML = `
    body.platform-pc table {
        table-layout: fixed !important;
        width: 100% !important;
    }
    body.platform-pc table th:nth-child(4), 
    body.platform-pc table td:nth-child(4) {
        width: 180px !important;
        min-width: 180px !important;
    }
    .stock-container {
        display: flex !important;
        flex-wrap: nowrap !important;
        white-space: nowrap !important;
        align-items: center;
        gap: 4px;
    }
`;
document.head.appendChild(style);

console.log("Atelier: Whitelisted Core loaded");

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
    detectPlatform();
    setupEventListeners();
    checkSetup();
};

function checkSetup() {
    // Automatically use hardcoded config
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
        app.style.display = 'flex';
        app.style.pointerEvents = 'auto';
    }

    const nameLabel = document.getElementById('user-display-name-desktop');
    if (nameLabel) nameLabel.textContent = username.toUpperCase();

    const nameLabelDropdown = document.getElementById('user-name-dropdown');
    if (nameLabelDropdown) nameLabelDropdown.textContent = username.toUpperCase();

    const nameLabelHeader = document.getElementById('user-display-id-header');
    if (nameLabelHeader) nameLabelHeader.textContent = username.toUpperCase();

    // Team Access visible to all team members
    const navTeam = document.getElementById('nav-team');
    if (navTeam) navTeam.classList.remove('hidden');

    fetchProducts();
    fetchActivities();
    fetchAllowedUsers();
    setupRealtime();
    setupPresence(username);
}

function openPasswordModal() {
    const overlay = document.getElementById('password-modal-overlay');
    if (overlay) {
        overlay.classList.add('active');
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('password-error').classList.add('hidden');
    }
}

function closePasswordModal() {
    const overlay = document.getElementById('password-modal-overlay');
    if (overlay) overlay.classList.remove('active');
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
    const container = document.getElementById('whitelist-container');
    if (!container) return;
    container.innerHTML = '';

    allowedUsers.forEach(user => {
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
            <button onclick="removeWhitelistedUser('${user.id}')" class="p-2 text-on-surface-variant/20 hover:text-error opacity-0 group-hover:opacity-100 transition-all">
                <span class="material-symbols-outlined text-sm">remove_circle</span>
            </button>
        `;
        container.appendChild(card);
    });
}

async function addWhitelistedUser(username) {
    if (!username) return;
    const cleanUsername = username.trim().toLowerCase(); // Enforce lowercase
    const { data: { user } } = await supabaseClient.auth.getUser();
    const inviterId = user.email.replace(DOMAIN, "").toLowerCase();

    const { error } = await supabaseClient
        .from('allowed_users')
        .insert([{ username: cleanUsername, created_by: inviterId }]);

    if (error) alert(error.message);
    else fetchAllowedUsers();
}

async function removeWhitelistedUser(id) {
    if (confirm('Revoke access for this user? They will no longer be able to log in.')) {
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
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('Join:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('Leave:', key, leftPresences);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ online_at: new Date().toISOString() });
            }
        });
}

function renderActiveUsers() {
    const container = document.getElementById('active-users-list');
    const badge = document.getElementById('active-user-count');
    if (!container) return;
    
    container.innerHTML = '';
    const uniqueUsers = Object.keys(onlineUsers);
    if (badge) badge.textContent = uniqueUsers.length;

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
        container.appendChild(item);
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
    const container = document.getElementById('category-chips');
    if (!container) return;

    const categories = ['all', ...new Set(products.map(p => p.category).filter(c => c))];
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
    const desktopBody = document.getElementById('inventory-body');
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
                    <div class="flex items-center justify-between flex-nowrap gap-4">
                        <div class="flex items-baseline gap-1 whitespace-nowrap shrink-0 ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-orange-500' : 'text-primary-container')}">
                            <span class="text-sm font-black">${stock}</span>
                            <span class="text-[10px] opacity-30">/</span>
                            <span class="text-sm font-black">${target}</span>
                        </div>
                        <span class="text-[10px] font-bold text-on-surface-variant/40 shrink-0">${ratioPercent}%</span>
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

        const card = document.createElement('div');
        card.className = "mobile-inventory-card";
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
                <div class="flex items-baseline gap-1 whitespace-nowrap shrink-0 ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-red-500' : 'text-primary-container')}">
                    <span class="text-[10px] font-black">${stock}</span>
                    <span class="text-[8px] opacity-30">/</span>
                    <span class="text-[10px] font-black">${target}</span>
                </div>
                <p class="text-[9px] font-black text-on-surface-variant/20 uppercase">${ratioPercent}%</p>
                ${status === 'LOW' || status === 'OUT' ? `<span class="mt-1 px-2 py-0.5 bg-red-50 text-red-600 text-[8px] font-black rounded-md border border-red-100 uppercase tracking-tighter">Low stock</span>` : ''}
            </div>
        `;
        mobileList.appendChild(card);
    });
}

function renderActivities() {
    const container = document.getElementById('activity-log-container');
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
                <p class="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                    ${userPrefix} • ${date}
                </p>
            </div>
            <button onclick="deleteActivity('${act.id}')" class="absolute -right-2 top-0 p-1 text-on-surface-variant/10 hover:text-error opacity-0 group-hover:opacity-100 transition-all">
                <span class="material-symbols-outlined text-[14px]">close</span>
            </button>
        `;
        container.appendChild(card);
    });
}

function updateStats() {
    document.querySelectorAll('#total-items').forEach(el => el.textContent = products.length.toLocaleString());
    const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0);
    document.querySelectorAll('#total-value').forEach(el => el.textContent = `₩${totalValue.toLocaleString()}`);
    
    const lowStock = products.filter(p => getStatus(p) === 'LOW').length;
    document.querySelectorAll('#low-stock').forEach(el => el.textContent = lowStock);
    
    const outOfStock = products.filter(p => getStatus(p) === 'OUT').length;
    document.querySelectorAll('#out-of-stock').forEach(el => el.textContent = outOfStock);
}

// --- Search Logic ---

function handleGlobalSearch(query) {
    const dropdown = document.getElementById('search-results-dropdown');
    const list = document.getElementById('search-results-list');
    
    if (!query || query.length < 2) {
        if (dropdown) dropdown.classList.add('hidden');
        return;
    }

    const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 8); 

    if (results.length > 0 && dropdown && list) {
        dropdown.classList.remove('hidden');
        list.innerHTML = '';
        results.forEach(p => {
            const status = getStatus(p);
            const stock = p.stock_quantity || 0;
            const target = p.target_quantity || 0;

            const item = document.createElement('div');
            item.className = "flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 cursor-pointer transition-all group";
            item.onclick = () => {
                editItem(p.id);
                dropdown.classList.add('hidden');
                document.getElementById('search-input-desktop').value = '';
            };
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}"></div>
                    <span class="text-xs font-black text-primary-container group-hover:text-primary">${p.name}</span>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-black ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-orange-500' : 'text-primary-container')}">${stock} / ${target}</span>
                </div>
            `;
            list.appendChild(item);
        });
    } else if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

// --- Actions ---

function setupEventListeners() {
    console.log("Atelier: Setting up UI listeners");
    
    const searchInput = document.getElementById('search-input-desktop');
    if (searchInput) {
        searchInput.oninput = (e) => handleGlobalSearch(e.target.value);
    }
    
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('search-results-dropdown');
        const searchInput = document.getElementById('search-input-desktop');
        if (dropdown && !dropdown.contains(e.target) && e.target !== searchInput) {
            dropdown.classList.add('hidden');
        }

        // Close user dropdown if clicking outside
        const userMenu = document.getElementById('user-dropdown-menu');
        if (userMenu && !userMenu.contains(e.target) && e.target.id !== 'user-profile-trigger') {
            userMenu.classList.remove('show');
            userMenu.classList.add('hidden');
        }
    });

    const addActivityBtn = document.getElementById('add-activity-btn');
    if (addActivityBtn) {
        addActivityBtn.addEventListener('click', () => {
            console.log("Atelier: Add Activity clicked");
            openActivityModal();
        });
    }

    // New Header + Button (PC)
    const addItemBtnPC = document.getElementById('add-item-btn-pc');
    if (addItemBtnPC) {
        addItemBtnPC.onclick = () => {
            console.log("Atelier: Header Add clicked");
            openModal();
        };
    }

    // User Dropdown Logic
    const profileTrigger = document.getElementById('user-profile-trigger');
    const userMenu = document.getElementById('user-dropdown-menu');
    if (profileTrigger && userMenu) {
        profileTrigger.onclick = (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
            userMenu.classList.toggle('hidden');
        };
    }

    const closeActivityBtn = document.getElementById('close-activity-modal');
    if (closeActivityBtn) {
        closeActivityBtn.addEventListener('click', closeActivityModal);
    }

    const saveSetupBtn = document.getElementById('save-setup-btn');
    if (saveSetupBtn) {
        saveSetupBtn.onclick = () => {
            const url = document.getElementById('setup-url').value.trim();
            const key = document.getElementById('setup-key').value.trim();
            if (url && key) {
                localStorage.setItem('ATELIER_SUPABASE_URL', url);
                localStorage.setItem('ATELIER_SUPABASE_KEY', key);
                location.reload();
            }
        };
    }

    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const errorDiv = document.getElementById('password-error');
            
            if (newPass !== confirmPass) {
                errorDiv.innerText = "Passwords do not match";
                errorDiv.classList.remove('hidden');
                return;
            }
            
            errorDiv.classList.add('hidden');
            const submitBtn = passwordForm.querySelector('button[type="submit"]');
            submitBtn.innerText = "Updating...";
            submitBtn.disabled = true;

            try {
                const { error } = await supabaseClient.auth.updateUser({ password: newPass });
                if (error) throw error;
                
                // Success
                submitBtn.innerText = "Updated!";
                setTimeout(() => {
                    closePasswordModal();
                    submitBtn.innerText = "Update Key";
                    submitBtn.disabled = false;
                }, 1500);
            } catch (err) {
                console.error("Atelier: Password update error", err);
                errorDiv.innerText = err.message || "Update failed";
                errorDiv.classList.remove('hidden');
                submitBtn.innerText = "Update Key";
                submitBtn.disabled = false;
            }
        };
    }

    const changePassTrigger = document.getElementById('change-password-btn-trigger');
    if (changePassTrigger) {
        changePassTrigger.onclick = () => {
            console.log("Atelier: Change Password clicked");
            const userMenu = document.getElementById('user-dropdown-menu');
            if (userMenu) {
                userMenu.classList.remove('show');
                userMenu.classList.add('hidden');
            }
            openPasswordModal();
        };
    }

    const closePassModalBtn = document.getElementById('close-password-modal');
    if (closePassModalBtn) {
        closePassModalBtn.onclick = closePasswordModal;
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const rawId = document.getElementById('auth-username').value.trim();
            const password = document.getElementById('auth-password').value;
            const email = rawId.toLowerCase() + DOMAIN;
            const lowerId = rawId.toLowerCase();

            // 1. Whitelist Check (for both Sign Up and Login)
            const { data: allowed, error: checkError } = await supabaseClient
                .from('allowed_users')
                .select('*')
                .ilike('username', lowerId)
                .single();
            
            // Special bootstrap: 'bj' is always allowed to proceed if not in DB yet
            const isBJ = lowerId === 'bj';

            if (!allowed && !isBJ) {
                alert("Unauthorized ID. Access restricted to whitelisted members.");
                return;
            }

            // 2. Perform Supabase Auth
            const { data, error } = isSignUp 
                ? await supabaseClient.auth.signUp({ email, password }) 
                : await supabaseClient.auth.signInWithPassword({ email, password });
            
            if (error) {
                alert(error.message);
                return;
            }

            // 3. Auto-register 'bj' to the whitelist table if they just logged in and aren't there
            if (isBJ && !allowed && data.user) {
                await supabaseClient
                    .from('allowed_users')
                    .insert([{ username: 'bj', created_by: 'system' }]);
            }
        };
    }

    const toggleAuth = document.getElementById('toggle-auth');
    if (toggleAuth) {
        toggleAuth.onclick = () => {
            isSignUp = !isSignUp;
            document.getElementById('auth-btn-text').textContent = isSignUp ? '초대받은 분 가입하기' : 'Atelier 입장';
            toggleAuth.textContent = isSignUp ? '이미 가입하셨나요? 로그인' : '초대받은 분 가공 가입';
        };
    }

    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.onsubmit = async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            const skuValue = document.getElementById('item-sku').value.trim();
            const data = {
                name: document.getElementById('item-name').value,
                sku: skuValue === "" ? null : skuValue,
                category: document.getElementById('item-category').value,
                stock_quantity: parseInt(document.getElementById('item-stock').value),
                target_quantity: parseInt(document.getElementById('item-target').value || 0),
                price: parseFloat(document.getElementById('item-price').value || 0),
                updated_at: new Date().toISOString(),
                updated_by: user ? user.email.replace(DOMAIN, "") : 'Unknown'
            };
            if (editingId) await supabaseClient.from('products').update(data).eq('id', editingId);
            else await supabaseClient.from('products').insert([data]);
            
            closeModal();
        };
    }

    const activityForm = document.getElementById('activity-form');
    if (activityForm) {
        activityForm.onsubmit = async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            const typeValue = document.querySelector('input[name="activity-type"]:checked').value;
            const messageValue = document.getElementById('activity-message').value;

            const { error } = await supabaseClient.from('activities').insert([{
                type: typeValue,
                message: messageValue,
                user_email: user ? user.email.replace(DOMAIN, "").toUpperCase() : 'UNKNOWN',
                created_at: new Date().toISOString()
            }]);

            if (error) alert(error.message);
            else {
                closeActivityModal();
            }
        };
    }

    const addWhBtn = document.getElementById('add-whitelist-btn');
    if (addWhBtn) {
        addWhBtn.onclick = () => {
            const id = prompt("Enter new User ID to whitelist:");
            if (id) addWhitelistedUser(id.trim());
        };
    }

    // Modal triggers
    const addItemBtnDesk = document.getElementById('add-item-btn-desktop');
    if (addItemBtnDesk) addItemBtnDesk.onclick = openAddModal;
    
    const addItemBtnMob = document.getElementById('add-item-btn-mobile');
    if (addItemBtnMob) addItemBtnMob.onclick = openAddModal;

    const addItemBtnHeader = document.getElementById('add-item-btn-header');
    if (addItemBtnHeader) addItemBtnHeader.onclick = openAddModal;
    
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) closeModalBtn.onclick = closeModal;

    const logoutBtn = document.getElementById('logout-btn-desktop');
    if (logoutBtn) logoutBtn.onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); };

    const logoutBtnMob = document.getElementById('logout-btn-mobile');
    if (logoutBtnMob) logoutBtnMob.onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); };

    // New Dropdown Logout
    const logoutBtnDropdown = document.getElementById('logout-btn-dropdown');
    if (logoutBtnDropdown) logoutBtnDropdown.onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); };
    
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.onclick = fetchProducts;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        };
    });

    // Dashboard Stat Filters
    const fTotal = document.getElementById('filter-total');
    const fLow = document.getElementById('filter-low');
    const fOut = document.getElementById('filter-out');

    if (fTotal) {
        fTotal.onclick = () => {
            currentStatusFilter = 'all';
            renderInventory();
            document.getElementById('section-inventory').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
    if (fLow) {
        fLow.onclick = () => {
            currentStatusFilter = 'low';
            renderInventory();
            document.getElementById('section-inventory').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
    if (fOut) {
        fOut.onclick = () => {
            currentStatusFilter = 'out';
            renderInventory();
            document.getElementById('section-inventory').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
}

function switchView(view) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(i => {
        if (i.getAttribute('data-view') === view) i.classList.add('active');
        else i.classList.remove('active');
    });

    const stats = document.getElementById('section-stats');
    const inventory = document.getElementById('section-inventory');
    const activity = document.getElementById('section-activity');
    const team = document.getElementById('section-team');
    const title = document.getElementById('view-title');
    const subtitle = document.getElementById('view-subtitle');

    if (!title || !subtitle) return;

    // Reset visibility logic
    if (stats) stats.classList.add('hidden');
    if (inventory) inventory.classList.add('hidden');
    if (activity) activity.classList.add('hidden');
    if (team) team.classList.add('hidden');

    if (view === 'inventory') {
        if (inventory) inventory.classList.remove('hidden');
        title.textContent = "Full Inventory Management";
        subtitle.textContent = "Complete list of architectural assets across all zones.";
    } else if (view === 'team') {
        if (team) team.classList.remove('hidden');
        title.textContent = "Team Access Management";
        subtitle.textContent = "Manage whitelisted IDs and active warehouse members.";
    } else if (view === 'dashboard') {
        if (stats) stats.classList.remove('hidden');
        if (activity) activity.classList.remove('hidden');
        if (inventory) inventory.classList.remove('hidden');
        title.textContent = "Main Atelier Dashboard";
        subtitle.textContent = "Real-time oversight of architectural stock movements.";
    } else if (view === 'movements') {
        title.textContent = "Stock Movements";
        subtitle.textContent = "Log and track material transfers and shipments.";
    } else if (view === 'reports') {
        title.textContent = "Operational Reports";
        subtitle.textContent = "Analytics and performance metrics for the warehouse.";
    }
}

function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = "Create New Entry";
    const audit = document.getElementById('audit-info');
    if (audit) audit.classList.add('hidden');
    document.getElementById('item-form').reset();
    openModal();
}

function openActivityModal() {
    const overlay = document.getElementById('activity-modal-overlay');
    if (overlay) {
        document.getElementById('activity-form').reset();
        overlay.classList.add('active');
    }
}

function closeActivityModal() {
    const overlay = document.getElementById('activity-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

function editItem(id) {
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
        const date = new Date(p.updated_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        document.getElementById('audit-date').textContent = date;
    }
    openModal();
}

function openModal() { document.getElementById('modal-overlay').classList.add('active'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

async function deleteItem(id) {
    if (confirm('Permanently delete this item?')) {
        await supabaseClient.from('products').delete().eq('id', id);
    }
}

async function deleteActivity(id) {
    if (confirm('Delete this activity from timeline?')) {
        await supabaseClient.from('activities').delete().eq('id', id);
    }
}
