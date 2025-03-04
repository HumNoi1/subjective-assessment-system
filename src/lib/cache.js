// src/lib/cache.js
// ตัวเก็บ cache แบบง่ายที่ใช้ memory
const memoryCache = new Map();

// Function to get data from cache
export function getCache(key) {
  if (memoryCache.has(key)) {
    const { value, expiry } = memoryCache.get(key);
    // Check if cache entry has expired
    if (expiry && expiry < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return value;
  }
  return null;
}

// Function to set data in cache with optional expiry time (in seconds)
export function setCache(key, value, expiryInSeconds = 3600) {
  const expiry = expiryInSeconds ? Date.now() + (expiryInSeconds * 1000) : null;
  memoryCache.set(key, { value, expiry });
  return true;
}

// Function to delete data from cache
export function deleteCache(key) {
  return memoryCache.delete(key);
}

// Function to clear all cache
export function clearCache() {
  memoryCache.clear();
  return true;
}

// Function to get cache size
export function getCacheSize() {
  return memoryCache.size;
}

// Function to check if a key exists in cache
export function hasCache(key) {
  if (!memoryCache.has(key)) return false;
  
  const { expiry } = memoryCache.get(key);
  // Check if cache entry has expired
  if (expiry && expiry < Date.now()) {
    memoryCache.delete(key);
    return false;
  }
  
  return true;
}