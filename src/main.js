import { state, updateState } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { setupEventListeners } from './events.js';

window.onload = async () => {
    console.log("Atelier: Loading Modular Core");
    ui.detectPlatform();
    setupEventListeners();
    
    const initialized = await api.initSupabase();
    if (initialized) {
        checkAuth();
    }
};

async function checkAuth() {
    try {
        const { data: { session }, error } = await state.supabaseClient.auth.getSession();
        if (error) throw error;

        if (session) {
            handleAuthenticatedSession(session.user);
        } else {
            ui.showAuth();
        }
    } catch (e) {
        ui.showAuth();
    }

    state.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            handleAuthenticatedSession(session.user);
        } else {
            ui.showAuth();
        }
    });
}

async function handleAuthenticatedSession(user) {
    if (state.isAppInitialized) return;
    updateState({ isAppInitialized: true });
    
    ui.showApp(user);
    const username = user.email.split('@')[0];
    
    // Initial fetch
    try {
        await Promise.all([
            api.fetchProducts(),
            api.fetchActivities(),
            api.fetchAllowedUsers()
        ]);
        
        ui.renderCategoryChips();
        ui.renderInventory();
        ui.renderActivities();
        ui.renderAllowedUsers();
        ui.updateStats();
        
        setupRealtime();
        setupPresence(username);
    } catch (e) {
        ui.showToast("Failed to load initial data", "error");
    }
}

function setupRealtime() {
    // Products Channel
    state.supabaseClient.channel('db-products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            const { products } = state;
            
            // Protection: If we are currently debouncing a local sync for this ID, ignore the incoming update
            // to prevent "stuttering" or "jumping" values.
            if (payload.new && state.syncDebounceMap.has(payload.new.id)) return;

            if (payload.eventType === 'INSERT') products.push(payload.new);
            else if (payload.eventType === 'UPDATE') {
                const index = products.findIndex(p => p.id === payload.new.id);
                if (index !== -1) products[index] = payload.new;
            }
            else if (payload.eventType === 'DELETE') {
                updateState({ products: products.filter(p => p.id !== payload.old.id) });
            }
            ui.renderCategoryChips();
            ui.renderInventory();
            ui.updateStats();
        })
        .subscribe();

    // Activities Channel
    state.supabaseClient.channel('db-activities')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
            // Check if already exists in local state to prevent double rendering
            if (state.activities.some(act => act.id === payload.new.id)) return;

            state.activities.unshift(payload.new);
            if (state.activities.length > 20) state.activities.pop();
            ui.renderActivities();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, (payload) => {
            updateState({ activities: state.activities.filter(a => a.id !== payload.old.id) });
            ui.renderActivities();
        })
        .subscribe();

    // Whitelist Channel
    state.supabaseClient.channel('db-whitelist')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'allowed_users' }, () => {
            api.fetchAllowedUsers().then(() => ui.renderAllowedUsers());
        })
        .subscribe();
}

function setupPresence(username) {
    const presenceChannel = state.supabaseClient.channel('atelier-lobby', {
        config: { presence: { key: username } }
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            updateState({ onlineUsers: presenceChannel.presenceState() });
            ui.renderActiveUsers();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ online_at: new Date().toISOString() });
            }
        });
}
