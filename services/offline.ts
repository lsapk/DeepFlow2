
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const QUEUE_KEY = 'offline_queue';
export const CACHE_KEYS = {
    TASKS: 'cache_tasks',
    HABITS: 'cache_habits',
    GOALS: 'cache_goals',
    USER: 'cache_user',
    PLAYER: 'cache_player',
    QUESTS: 'cache_quests'
};

// --- ID GENERATOR (UUID v4 like) ---
export const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// --- CACHE MANAGERS ---
export const saveToCache = async (key: string, data: any) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Cache Save Error', e);
    }
};

export const loadFromCache = async (key: string) => {
    try {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
};

// --- QUEUE MANAGERS ---
export const addToQueue = async (action: { type: string, payload: any, table?: string }) => {
    const queue = await loadFromCache(QUEUE_KEY) || [];
    queue.push({ ...action, timestamp: Date.now() });
    await saveToCache(QUEUE_KEY, queue);
    console.log("Action queued offline:", action.type);
};

export const getQueueSize = async (): Promise<number> => {
    const queue = await loadFromCache(QUEUE_KEY) || [];
    return queue.length;
};

export const processQueue = async (): Promise<number> => {
    const queue = await loadFromCache(QUEUE_KEY) || [];
    if (queue.length === 0) return 0;

    console.log(`Processing ${queue.length} offline actions...`);
    const remainingQueue = [];

    for (const action of queue) {
        try {
            let error = null;
            
            // Generic handler based on type
            switch (action.type) {
                case 'INSERT':
                    ({ error } = await supabase.from(action.table!).insert(action.payload));
                    break;
                case 'UPDATE':
                    // Assuming payload has id and updates
                    const { id, ...updates } = action.payload;
                    ({ error } = await supabase.from(action.table!).update(updates).eq('id', id));
                    break;
                case 'DELETE':
                    ({ error } = await supabase.from(action.table!).delete().eq('id', action.payload.id));
                    break;
                case 'RPC':
                    ({ error } = await supabase.rpc(action.function, action.payload));
                    break;
            }

            if (error) {
                console.error(`Supabase Error (${action.type} on ${action.table}):`, error.message);
                throw error;
            }

        } catch (e) {
            console.warn("Failed to process action, keeping in queue:", action.type);
            remainingQueue.push(action); // Keep for retry
        }
    }

    await saveToCache(QUEUE_KEY, remainingQueue);
    return remainingQueue.length;
};
