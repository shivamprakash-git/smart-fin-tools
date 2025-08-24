// Centralized storage management for SmartFinTools
// Handles localStorage availability, fallbacks, and error handling

// Storage availability check
let storageAvailable = false;
let storageTestCompleted = false;

// Test storage availability once
function testStorageAvailability() {
    if (storageTestCompleted) return storageAvailable;
    
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        storageAvailable = localStorage.getItem(test) === test;
        localStorage.removeItem(test);
        storageTestCompleted = true;
        return storageAvailable;
    } catch (e) {
        storageAvailable = false;
        storageTestCompleted = true;
        return false;
    }
}

// Get storage availability status
export function isStorageAvailable() {
    return testStorageAvailability();
}

// Safe storage getter with fallback
export function getStorageItem(key, fallback = null) {
    if (!testStorageAvailability()) {
        return fallback;
    }
    
    try {
        const value = localStorage.getItem(key);
        return value !== null ? value : fallback;
    } catch (e) {
        console.log(`Could not read storage item: ${key}`, e);
        return fallback;
    }
}

// Safe storage setter
export function setStorageItem(key, value) {
    if (!testStorageAvailability()) {
        return false;
    }
    
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.log(`Could not save storage item: ${key}`, e);
        return false;
    }
}

// Safe storage remover
export function removeStorageItem(key) {
    if (!testStorageAvailability()) {
        return false;
    }
    
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.log(`Could not remove storage item: ${key}`, e);
        return false;
    }
}

// Safe storage clear
export function clearStorage() {
    if (!testStorageAvailability()) {
        return false;
    }
    
    try {
        localStorage.clear();
        return true;
    } catch (e) {
        console.log('Could not clear storage', e);
        return false;
    }
}

// Get all storage keys (for debugging)
export function getStorageKeys() {
    if (!testStorageAvailability()) {
        return [];
    }
    
    try {
        return Object.keys(localStorage);
    } catch (e) {
        console.log('Could not get storage keys', e);
        return [];
    }
}

// Check if a specific key exists
export function hasStorageItem(key) {
    if (!testStorageAvailability()) {
        return false;
    }
    
    try {
        return localStorage.getItem(key) !== null;
    } catch (e) {
        console.log(`Could not check storage item: ${key}`, e);
        return false;
    }
}

// Get storage size (approximate)
export function getStorageSize() {
    if (!testStorageAvailability()) {
        return 0;
    }
    
    try {
        let size = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length + key.length;
            }
        }
        return size;
    } catch (e) {
        console.log('Could not get storage size', e);
        return 0;
    }
}

// Check if storage is getting full (warning at 80% of 5MB limit)
export function isStorageFull() {
    const size = getStorageSize();
    const limit = 5 * 1024 * 1024; // 5MB
    return size > (limit * 0.8);
}

// Clean up old/unused storage items
export function cleanupStorage() {
    if (!testStorageAvailability()) {
        return false;
    }
    
    try {
        // Remove old cache keys if they exist
        const keys = getStorageKeys();
        keys.forEach(key => {
            if (key.startsWith('smartfin-cache-') && key !== 'smartfin-cache-v6') {
                removeStorageItem(key);
            }
        });
        return true;
    } catch (e) {
        console.log('Could not cleanup storage', e);
        return false;
    }
}

// Initialize storage cleanup on app start
export function initializeStorage() {
    // Clean up old cache entries
    cleanupStorage();
    
    // Log storage status
    if (isStorageAvailable()) {
        console.log('Storage available:', getStorageSize(), 'bytes used');
        if (isStorageFull()) {
            console.warn('Storage is getting full, consider cleanup');
        }
    } else {
        console.log('Storage not available, using fallbacks');
    }
}
