export const state = {
    products: [],
    activities: [],
    allowedUsers: [],
    onlineUsers: {},
    editingId: null,
    isSignUp: false,
    currentCategory: 'all',
    currentStatusFilter: 'all',
    activeSwipeId: null,
    syncDebounceMap: new Map(),
    supabaseClient: null,
    currentUser: null,
    isAppInitialized: false,
};

export function updateState(updates) {
    Object.assign(state, updates);
}
