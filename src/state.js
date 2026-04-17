export const state = {
    products: [],
    activities: [],
    allowedUsers: [],
    onlineUsers: {},
    editingId: null,
    isSignUp: false,
    currentCategory: 'all',
    currentStatusFilter: 'all',
    supabaseClient: null,
    currentUser: null,
};

export function updateState(updates) {
    Object.assign(state, updates);
}
