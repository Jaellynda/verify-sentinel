/**
 * OFFLINE CHECK-IN QUEUE — Verify Sentinel
 * ─────────────────────────────────────────────────────────────
 * When the user checks in while offline, we cache the GPS data
 * and timestamp to localStorage. On next online detection, we
 * automatically sync all pending check-ins to the database.
 *
 * localStorage key: "sentinel_offline_checkins"
 * Format: Array of { addressId, lat, lng, timestamp, residencyType }
 * ─────────────────────────────────────────────────────────────
 */

const QUEUE_KEY = 'sentinel_offline_checkins';

/** Add a check-in to the offline queue */
export function queueCheckin({ addressId, lat, lng, timestamp, residencyType }) {
  const queue = getPendingCheckins();
  // Deduplicate by addressId — only one pending per address
  const filtered = queue.filter(item => item.addressId !== addressId);
  filtered.push({ addressId, lat, lng, timestamp, residencyType });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/** Get all pending offline check-ins */
export function getPendingCheckins() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Remove a specific check-in from the queue */
export function removeCheckin(addressId) {
  const queue = getPendingCheckins().filter(item => item.addressId !== addressId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Clear all queued check-ins */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Sync all offline check-ins to the database.
 * Called automatically when the browser goes online.
 * Returns count of synced records.
 */
export async function syncOfflineQueue(processFn) {
  const queue = getPendingCheckins();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const item of queue) {
    try {
      await processFn(item);
      removeCheckin(item.addressId);
      synced++;
    } catch (e) {
      console.warn('Failed to sync check-in for', item.addressId, e);
    }
  }
  return synced;
}

/** Check if there are pending offline check-ins */
export function hasPendingCheckins() {
  return getPendingCheckins().length > 0;
}

/**
 * Calculate milliseconds remaining in the 20-hour time-lock.
 * Returns 0 if the lock has expired (check-in allowed).
 */
export function getTimeLockRemaining(lastCheckinISO) {
  if (!lastCheckinISO) return 0;
  const LOCK_MS = 20 * 60 * 60 * 1000; // 20 hours
  const last = new Date(lastCheckinISO).getTime();
  const now = Date.now();
  const elapsed = now - last;
  return Math.max(0, LOCK_MS - elapsed);
}

/** Format milliseconds as "Xh Ym remaining" */
export function formatTimeRemaining(ms) {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
  return `${seconds}s remaining`;
}