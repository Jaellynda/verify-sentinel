/**
 * H3 CORE ENGINE — Verify Sentinel
 * 
 * HOW H3 WORKS MATHEMATICALLY (OFFLINE):
 * ─────────────────────────────────────────────────────────────────────────
 * H3 uses an icosahedron (20-sided 3D polyhedron) projected onto Earth's
 * surface via a gnomonic (center-point) projection. Here's the math chain:
 *
 * 1. COORDINATE → FACE: The lat/lng (WGS84 decimal degrees) is converted to
 *    3D Cartesian (x,y,z) on a unit sphere. The 20 icosahedron faces are
 *    pre-defined; the algorithm finds which face the point falls on using
 *    dot-product calculations.
 *
 * 2. FACE → IJK GRID: Each face is a flat hexagonal grid using axial (i,j,k)
 *    coordinates with the constraint i+j+k=0. The gnomonic projection maps
 *    the spherical point to 2D (u,v) coordinates on the face, then these
 *    are snapped to the nearest (i,j,k) integer using a "hex rounding"
 *    algorithm similar to cube-coordinate rounding.
 *
 * 3. RESOLUTION: Each resolution subdivides every hexagon into ~7 children
 *    (aperture-7 system). Resolution 0 = 122 base cells covering Earth.
 *    Resolution 9 = ~4.7 billion hexagons, each ~174m² average area.
 *    The subdivision factor: area(res_n) = area(res_0) / 7^n
 *
 * 4. INDEX ENCODING: The final H3 index is a 64-bit integer: bits 63-59 =
 *    mode (1 for cell), bits 58-56 = resolution, bits 55-0 = hierarchical
 *    path through the tree. This is encoded as a 15-char hex string.
 *
 * 5. OFFLINE GUARANTEE: All lookup tables (icosahedron face vertices,
 *    base cell definitions, orientation matrices) are compiled into h3-js.
 *    Zero network calls. Pure geometry on-device.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { latLngToCell, cellToLatLng, cellToBoundary, gridDisk, cellToParent } from 'h3-js';

// Resolution constants per MoICT 2025-2030 mapping
export const RESOLUTION = {
  DISTRICT: 6,   // ~36km² — District/Province level
  PARISH: 8,     // ~0.74km² — Parish/Cell level
  SENTINEL: 9,   // ~174m² — Plot/Household "Sentinel ID"
  PLOT: 10       // ~16m² — Sub-plot precision
};

/**
 * Generate a Sentinel ID from GPS coordinates.
 * The ID is formatted as XXXX-XXXX-XXXX-XXX for human readability.
 * Format encodes: [res-prefix][4-char face][4-char zone][3-char cell]
 */
export function generateSentinelID(lat, lng, resolution = RESOLUTION.SENTINEL) {
  const h3Index = latLngToCell(lat, lng, resolution);
  
  // Format the 15-char hex string into readable groups: XXXX-XXXX-XXXX-XXX
  const clean = h3Index.replace(/[^a-f0-9]/gi, '').toUpperCase();
  const formatted = `${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8,12)}-${clean.slice(12,15)}`;
  
  return {
    h3_index: h3Index,
    sentinel_id: formatted,
    resolution
  };
}

/**
 * Get hierarchical parent indices (District → Parish → Sentinel chain)
 */
export function getHierarchy(h3Index) {
  return {
    district: cellToParent(h3Index, RESOLUTION.DISTRICT),
    parish: cellToParent(h3Index, RESOLUTION.PARISH),
    sentinel: h3Index
  };
}

/**
 * Get the center coordinates of a hexagon.
 * Used for deep-link generation to Google Maps / Apple Maps.
 */
export function getHexCenter(h3Index) {
  const [lat, lng] = cellToLatLng(h3Index);
  return { lat, lng };
}

/**
 * Get the boundary polygon of a hexagon (6 vertices for Res-9).
 * Returns array of [lat, lng] pairs for map rendering.
 */
export function getHexBoundary(h3Index) {
  return cellToBoundary(h3Index); // returns [[lat,lng], ...]
}

/**
 * Get neighboring hexagons (k-ring) for context visualization.
 * k=1 returns 6 neighbors + center = 7 cells
 */
export function getHexNeighbors(h3Index, k = 1) {
  return gridDisk(h3Index, k);
}

/**
 * Generate Google Maps deep link to hex center
 */
export function generateGoogleMapsLink(lat, lng) {
  return `https://maps.google.com/?q=${lat.toFixed(8)},${lng.toFixed(8)}&z=18`;
}

/**
 * Generate Apple Maps deep link
 */
export function generateAppleMapsLink(lat, lng) {
  return `maps://maps.apple.com/?ll=${lat.toFixed(8)},${lng.toFixed(8)}&z=18`;
}

/**
 * Detect which country the hex falls in (basic bounding box).
 * Used for language defaults and regional resolution labeling.
 */
export function detectCountry(lat, lng) {
  if (lat >= -1.48 && lat <= 4.24 && lng >= 29.57 && lng <= 35.0) return 'Uganda';
  if (lat >= -4.67 && lat <= 4.62 && lng >= 33.91 && lng <= 41.91) return 'Kenya';
  if (lat >= -2.84 && lat <= -1.05 && lng >= 28.86 && lng <= 30.9) return 'Rwanda';
  if (lat >= -13.46 && lat <= 5.38 && lng >= 12.21 && lng <= 31.31) return 'DRC';
  return 'Other';
}

/**
 * Calculate trust score from persistence data.
 * Formula: base(30%) + nights(50%) + vouches(20%)
 * - 3 consecutive nights = full persistence score
 * - Each vouch from neighbor = 5 points (max 20)
 */
export function calculateTrustScore(persistenceNights, vouchesCount) {
  const baseScore = 30; // Minimum for having an address
  const nightsScore = Math.min(persistenceNights / 3, 1) * 50;
  const vouchScore = Math.min(vouchesCount * 5, 20);
  return Math.round(baseScore + nightsScore + vouchScore);
}

/**
 * Verify if a device's current GPS position is within the claimed hexagon.
 * Uses H3's containment check by comparing H3 indices at resolution 9.
 */
export function isInsideHex(currentLat, currentLng, claimedH3Index) {
  const currentH3 = latLngToCell(currentLat, currentLng, RESOLUTION.SENTINEL);
  return currentH3 === claimedH3Index;
}

/**
 * Parse a Sentinel ID string back to H3 index
 */
export function parseSentinelID(sentinelId) {
  const clean = sentinelId.replace(/-/g, '').toLowerCase();
  return clean;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}