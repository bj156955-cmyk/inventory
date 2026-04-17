import { state, updateState } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import { DOMAIN } from './config.js';

export function setupEventListeners() {
    console.log("Atelier: Setting up UI listeners");

    // Global click listener for dropdowns and delegation
    document.addEventListener('click', (e) => {
        // Search Results Dropdown
        const dropdown = document.getElementById('search-results-dropdown');
        const searchInput = document.getElementById('search-input-desktop');
        if (dropdown && !dropdown.contains(e.target) && e.target !== searchInput) {
            dropdown.classList.add('hidden');
        }

        // User Profile Dropdown
        const userMenu = document.getElementById('user-dropdown-menu');
        const userTrigger = document.getElementById('user-profile-trigger');
        if (userMenu && !userMenu.contains(e.target) && !userTrigger?.contains(e.target)) {
            userMenu.classList.remove('show');
            userMenu.classList.add('hidden');
        }

        // --- Event Delegation ---
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');

        switch (action) {
            case 'edit':
                ui.editItem(id);
                break;
            case 'delete':
                e.stopPropagation();
                ui.showConfirm({
                    title: "Delete Item?",
                    message: "This item will be permanently removed from the inventory.",
                    onConfirm: async () => {
                        try {
                            await api.deleteProduct(id);
                            ui.showToast("Item deleted", "success");
                        } catch (err) {
                            ui.showToast(err.message, "error");
                        }
                    }
                });
                break;
            case 'delete-activity':
                ui.showConfirm({
                    title: "Delete Activity?",
                    message: "This activity record will be removed from the timeline.",
                    onConfirm: async () => {
                        try {
                            await api.deleteActivity(id);
                            ui.showToast("Activity deleted", "success");
                        } catch (err) {
                            ui.showToast(err.message, "error");
                        }
                    }
                });
                break;
            case 'remove-whitelist':
                ui.showConfirm({
                    title: "Revoke Access?",
                    message: "This user will no longer be able to access the Atelier.",
                    onConfirm: async () => {
                        try {
                            await api.removeWhitelistedUser(id);
                            ui.showToast("Access revoked", "success");
                        } catch (err) {
                            ui.showToast(err.message, "error");
                        }
                    }
                });
                break;
            case 'filter-category':
                const category = target.getAttribute('data-category');
                updateState({ currentCategory: category });
                ui.renderCategoryChips();
                ui.renderInventory();
                break;
        }
    });

    // Search
    const searchInput = document.getElementById('search-input-desktop');
    if (searchInput) {
        searchInput.oninput = (e) => handleGlobalSearch(e.target.value);
    }

    // Modal Triggers - Add Item
    ['add-item-btn-pc', 'add-item-btn-header', 'add-item-btn-desktop', 'add-item-btn-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => {
            updateState({ editingId: null });
            document.getElementById('modal-title').textContent = "Create New Entry";
            const audit = document.getElementById('audit-info');
            if (audit) audit.classList.add('hidden');
            document.getElementById('item-form').reset();
            ui.openModal();
        };
    });

    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) closeModalBtn.onclick = ui.closeModal;

    // Activity
    const addActivityBtn = document.getElementById('add-activity-btn');
    if (addActivityBtn) addActivityBtn.onclick = ui.openActivityModal;

    const closeActivityBtn = document.getElementById('close-activity-modal');
    if (closeActivityBtn) closeActivityBtn.onclick = ui.closeActivityModal;

    // User Dropdown
    const profileTrigger = document.getElementById('user-profile-trigger');
    const userMenu = document.getElementById('user-dropdown-menu');
    if (profileTrigger && userMenu) {
        profileTrigger.onclick = (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
            userMenu.classList.toggle('hidden');
        };
    }

    // Password Change
    const changePassTrigger = document.getElementById('change-password-btn-trigger');
    if (changePassTrigger) {
        changePassTrigger.onclick = () => {
            userMenu.classList.remove('show', 'hidden');
            userMenu.classList.add('hidden');
            ui.openPasswordModal();
        };
    }

    const closePassModalBtn = document.getElementById('close-password-modal');
    if (closePassModalBtn) closePassModalBtn.onclick = ui.closePasswordModal;

    // Logout
    ['logout-btn-desktop', 'logout-btn-mobile', 'logout-btn-dropdown'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = async () => {
            await state.supabaseClient.auth.signOut();
            location.reload();
        };
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            ui.switchView(view);
        };
    });

    // Dashboard Filters
    const filters = {
        'filter-total': 'all',
        'filter-low': 'low',
        'filter-out': 'out'
    };
    Object.entries(filters).forEach(([id, filter]) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => {
            updateState({ currentStatusFilter: filter });
            ui.renderInventory();
            document.getElementById('section-inventory').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    });

    // Refresh
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.onclick = () => api.fetchProducts().then(() => ui.renderInventory());

    // Forms
    setupFormListeners();
}

function setupFormListeners() {
    // Auth Form
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const rawId = document.getElementById('auth-username').value.trim();
            const password = document.getElementById('auth-password').value;
            const email = rawId.toLowerCase() + DOMAIN;
            const lowerId = rawId.toLowerCase();

            try {
                // 1. Whitelist Check
                const { data: allowed } = await state.supabaseClient
                    .from('allowed_users')
                    .select('*')
                    .ilike('username', lowerId)
                    .single();
                
                const isBJ = lowerId === 'bj';
                if (!allowed && !isBJ) {
                    ui.showToast("Unauthorized ID. Access restricted.", "error");
                    return;
                }

                // 2. Auth call
                const { data, error } = state.isSignUp 
                    ? await state.supabaseClient.auth.signUp({ email, password }) 
                    : await state.supabaseClient.auth.signInWithPassword({ email, password });
                
                if (error) throw error;

                // 3. Bootstrap 'bj'
                if (isBJ && !allowed && data.user) {
                    await state.supabaseClient
                        .from('allowed_users')
                        .insert([{ username: 'bj', created_by: 'system' }]);
                }
                ui.showToast("Welcome to Atelier", "success");
            } catch (err) {
                ui.showToast(err.message, "error");
            }
        };
    }

    const toggleAuth = document.getElementById('toggle-auth');
    if (toggleAuth) {
        toggleAuth.onclick = () => {
            const isSignUp = !state.isSignUp;
            updateState({ isSignUp });
            document.getElementById('auth-btn-text').textContent = isSignUp ? '초대받은 분 가입하기' : 'Atelier 입장';
            toggleAuth.textContent = isSignUp ? '이미 가입하셨나요? 로그인' : '초대받은 분 가공 가입';
        };
    }

    // Item Form
    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.onsubmit = async (e) => {
            e.preventDefault();
            const { data: { user } } = await state.supabaseClient.auth.getUser();
            const data = {
                name: document.getElementById('item-name').value,
                sku: document.getElementById('item-sku').value.trim() || null,
                category: document.getElementById('item-category').value,
                stock_quantity: parseInt(document.getElementById('item-stock').value),
                target_quantity: parseInt(document.getElementById('item-target').value || 0),
                price: parseFloat(document.getElementById('item-price').value || 0),
                updated_at: new Date().toISOString(),
                updated_by: user ? user.email.replace(DOMAIN, "") : 'Unknown'
            };

            try {
                if (state.editingId) await api.updateProduct(state.editingId, data);
                else await api.addProduct(data);
                
                ui.showToast("Item saved successfully", "success");
                ui.closeModal();
            } catch (err) {
                ui.showToast(err.message, "error");
            }
        };
    }

    // Activity Form
    const activityForm = document.getElementById('activity-form');
    if (activityForm) {
        activityForm.onsubmit = async (e) => {
            e.preventDefault();
            const { data: { user } } = await state.supabaseClient.auth.getUser();
            const type = document.querySelector('input[name="activity-type"]:checked').value;
            const message = document.getElementById('activity-message').value;

            try {
                await api.addActivity(type, message, user?.email || 'unknown');
                ui.showToast("Activity logged", "success");
                ui.closeActivityModal();
            } catch (err) {
                ui.showToast(err.message, "error");
            }
        };
    }

    // Password Form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            
            if (newPass !== confirmPass) {
                ui.showToast("Passwords do not match", "error");
                return;
            }
            
            const submitBtn = passwordForm.querySelector('button[type="submit"]');
            submitBtn.innerText = "Updating...";
            submitBtn.disabled = true;

            try {
                const { error } = await state.supabaseClient.auth.updateUser({ password: newPass });
                if (error) throw error;
                
                ui.showToast("Password updated!", "success");
                setTimeout(() => {
                    ui.closePasswordModal();
                    submitBtn.innerText = "Update Key";
                    submitBtn.disabled = false;
                }, 1500);
            } catch (err) {
                ui.showToast(err.message, "error");
                submitBtn.innerText = "Update Key";
                submitBtn.disabled = false;
            }
        };
    }

    // Whitelist Add
    const addWhBtn = document.getElementById('add-whitelist-btn');
    if (addWhBtn) {
        addWhBtn.onclick = () => {
            const id = prompt("Enter new User ID to whitelist:");
            if (id) {
                const { currentUser } = state;
                const inviterId = currentUser?.email.replace(DOMAIN, "").toLowerCase();
                api.addWhitelistedUser(id, inviterId)
                    .then(() => ui.showToast("User whitelisted", "success"))
                    .catch(err => ui.showToast(err.message, "error"));
            }
        };
    }
}

function handleGlobalSearch(query) {
    const dropdown = document.getElementById('search-results-dropdown');
    const list = document.getElementById('search-results-list');
    
    if (!query || query.length < 2) {
        if (dropdown) dropdown.classList.add('hidden');
        return;
    }

    const results = state.products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 8); 

    if (results.length > 0 && dropdown && list) {
        dropdown.classList.remove('hidden');
        list.innerHTML = '';
        results.forEach(p => {
            const status = ui.getStatus(p);
            const item = document.createElement('div');
            item.className = "flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 cursor-pointer transition-all group";
            item.onclick = () => {
                ui.editItem(p.id);
                dropdown.classList.add('hidden');
                document.getElementById('search-input-desktop').value = '';
            };
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full ${status === 'OUT' ? 'bg-error' : (status === 'LOW' ? 'bg-orange-400' : 'bg-primary')}"></div>
                    <span class="text-xs font-black text-primary-container group-hover:text-primary">${p.name}</span>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-black ${status === 'OUT' ? 'text-error' : (status === 'LOW' ? 'text-orange-500' : 'text-primary-container')}">${p.stock_quantity} / ${p.target_quantity}</span>
                </div>
            `;
            list.appendChild(item);
        });
    } else if (dropdown) {
        dropdown.classList.add('hidden');
    }
}
