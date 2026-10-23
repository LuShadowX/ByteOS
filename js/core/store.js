// localStorage that never throws (private windows and blocked storage just lose persistence).

const PREFIX = 'byteos:';

export const store = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch { /* storage full or blocked */ }
    },
    remove(key) {
        try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
    },
    clearAll() {
        try {
            Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => localStorage.removeItem(key));
        } catch { /* ignore */ }
    }
};

// Tiny event bus so apps can react to each other (terminal -> files, git lab, monitor)
const listeners = new Map();
export const bus = {
    on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(fn);
        return () => listeners.get(event).delete(fn);
    },
    emit(event, data) {
        listeners.get(event)?.forEach(fn => fn(data));
    }
};
