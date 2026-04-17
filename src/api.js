import { CONFIG_URL, CONFIG_KEY, DOMAIN } from './config.js';
import { state, updateState } from './state.js';

export async function initSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            throw new Error("Supabase library not loaded.");
        }
        state.supabaseClient = supabase.createClient(CONFIG_URL, CONFIG_KEY);
        return true;
    } catch (e) {
        console.error("Atelier: Init error", e);
        return false;
    }
}

export async function fetchProducts() {
    const { data, error } = await state.supabaseClient
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    updateState({ products: data });
    return data;
}

export async function fetchActivities() {
    const { data, error } = await state.supabaseClient
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw error;
    updateState({ activities: data });
    return data;
}

export async function fetchAllowedUsers() {
    const { data, error } = await state.supabaseClient
        .from('allowed_users')
        .select('*')
        .order('username', { ascending: true });

    if (error) throw error;
    updateState({ allowedUsers: data });
    return data;
}

export async function addProduct(data) {
    const { error } = await state.supabaseClient.from('products').insert([data]);
    if (error) throw error;
}

export async function updateProduct(id, data) {
    const { error } = await state.supabaseClient.from('products').update(data).eq('id', id);
    if (error) throw error;
}

export async function deleteProduct(id) {
    const { error } = await state.supabaseClient.from('products').delete().eq('id', id);
    if (error) throw error;
}

export async function addActivity(type, message, userEmail) {
    const { error } = await state.supabaseClient.from('activities').insert([{
        type,
        message,
        user_email: userEmail.replace(DOMAIN, "").toUpperCase(),
        created_at: new Date().toISOString()
    }]);
    if (error) throw error;
}

export async function deleteActivity(id) {
    const { error } = await state.supabaseClient.from('activities').delete().eq('id', id);
    if (error) throw error;
}

export async function addWhitelistedUser(username, inviterId) {
    const { error } = await state.supabaseClient
        .from('allowed_users')
        .insert([{ username: username.trim().toLowerCase(), created_by: inviterId }]);
    if (error) throw error;
}

export async function removeWhitelistedUser(id) {
    const { error } = await state.supabaseClient.from('allowed_users').delete().eq('id', id);
    if (error) throw error;
}
