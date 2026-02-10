
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
    // Sanitize immediately before adding to queue if possible
    if (action.table === 'tasks' && action.payload.subtasks) {
        const { subtasks, ...cleanPayload } = action.payload;
        action.payload = cleanPayload;
    }
    if (action.table === 'goals' && action.payload.subobjectives) {
        const { subobjectives, ...cleanPayload } = action.payload;
        action.payload = cleanPayload;
    }

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

    for (let action of queue) {
        try {
            let error = null;
            
            // AUTO-FIX: Sanitize payload for problematic tables before retry
            if (action.table === 'tasks' && action.payload && action.payload.subtasks) {
                console.log("Sanitizing task payload in queue...");
                const { subtasks, ...cleanPayload } = action.payload;
                action.payload = cleanPayload;
            }
            if (action.table === 'goals' && action.payload && action.payload.subobjectives) {
                console.log("Sanitizing goal payload in queue...");
                const { subobjectives, ...cleanPayload } = action.payload;
                action.payload = cleanPayload;
            }

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
                // CRITICAL FIX: Handle Duplicate Key Error (Postgres code 23505)
                // If the item already exists, we consider the sync successful (or moot) and remove it from queue.
                if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('violates unique constraint')) {
                    console.warn(`Duplicate key detected for ${action.table} (ID: ${action.payload?.id}). Removing from queue.`);
                    continue; // Skip pushing to remainingQueue
                }

                console.error(`Supabase Error (${action.type} on ${action.table}):`, error.message);
                throw error;
            }

        } catch (e: any) {
            // Re-check for duplicate key in the caught exception object if not caught above
            if (e?.code === '23505' || e?.message?.includes('duplicate key') || e?.message?.includes('violates unique constraint')) {
                 console.warn("Duplicate detected in catch block, skipping.");
                 continue;
            }

            console.warn("Failed to process action, keeping in queue:", action.type);
            remainingQueue.push(action); // Keep for retry
        }
    }

    await saveToCache(QUEUE_KEY, remainingQueue);
    return remainingQueue.length;
};
