/**
 * @fileoverview MedAlert — Hospital Data Layer & Simulation Engine
 *
 * Defines the standardized hospital resource schema used across the platform.
 * Every hospital object conforms to a single, consistent structure so that
 * government bodies, private facilities, and third-party integrations all
 * broadcast availability in the same format.
 *
 * @module data
 */

// ──────────────────────────────────────────────
//  Standardized Resource Schema (JSDoc typedefs)
// ──────────────────────────────────────────────

/**
 * A single resource pool (e.g. ICU beds, ventilators).
 * Every resource tracks both its total capacity and current availability.
 *
 * @typedef {Object} ResourcePool
 * @property {number} total     - Total installed capacity (≥ 0).
 * @property {number} available - Currently available units (0 ≤ available ≤ total).
 */

/**
 * Standardized hospital record.
 * This is the single source-of-truth schema that all hospitals must follow
 * when broadcasting resource availability on the MedAlert network.
 *
 * @typedef {Object} Hospital
 * @property {string}       id                 - Unique identifier (e.g. "h1").
 * @property {string}       name               - Display name of the hospital.
 * @property {string}       type               - Category (e.g. "Government Super Specialty").
 * @property {string}       address            - Full street address.
 * @property {string}       phone              - Contact phone with country code.
 * @property {number}       lat                - Latitude (WGS-84).
 * @property {number}       lng                - Longitude (WGS-84).
 * @property {ResourcePool} icu                - ICU bed availability.
 * @property {ResourcePool} ventilators        - Ventilator availability.
 * @property {ResourcePool} oxygen             - Oxygen cylinder availability.
 * @property {ResourcePool} beds               - General ward bed availability.
 * @property {boolean}      bloodBank          - Whether a blood bank is on-site.
 * @property {boolean}      emergency247       - Whether the ER runs 24/7.
 * @property {boolean}      ambulanceAvailable - Whether hospital-owned ambulances are ready.
 * @property {string[]}     specialties        - List of medical specialties.
 * @property {number}       lastUpdated        - Unix-ms timestamp of the last data update.
 */

/**
 * Availability status derived from resource utilization.
 * @typedef {'available' | 'limited' | 'full'} HospitalStatus
 */

/**
 * Resource criticality level for UI color coding.
 * @typedef {'good' | 'warning' | 'critical'} ResourceLevel
 */

// ──────────────────────────────────────────────
//  Validation Helpers
// ──────────────────────────────────────────────

/**
 * Clamp a numeric value to [min, max].
 * Guards against NaN by falling back to `fallback`.
 *
 * @param {number} value    - The raw value.
 * @param {number} min      - Lower bound (inclusive).
 * @param {number} max      - Upper bound (inclusive).
 * @param {number} fallback - Value to use when `value` is NaN.
 * @returns {number}
 */
export function clampValue(value, min, max, fallback = 0) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * Validate and sanitize a resource update coming from the admin panel.
 * Ensures `available` is a non-negative integer ≤ total.
 *
 * @param {number} rawValue  - The raw input value from the admin form.
 * @param {number} totalCap  - The total capacity ceiling.
 * @returns {{ value: number, error: string | null }}
 */
export function validateResourceInput(rawValue, totalCap) {
  const str = String(rawValue).trim();

  if (str === '') {
    return { value: 0, error: 'Value is required.' };
  }

  const n = Number(str);

  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { value: 0, error: 'Must be a valid number.' };
  }
  if (n < 0) {
    return { value: 0, error: 'Cannot be negative.' };
  }
  if (!Number.isInteger(n)) {
    return { value: Math.floor(n), error: null };
  }
  if (n > totalCap) {
    return { value: totalCap, error: `Cannot exceed total capacity (${totalCap}).` };
  }

  return { value: n, error: null };
}

// ──────────────────────────────────────────────
//  Realistic Hospital Data — Delhi NCR Region
// ──────────────────────────────────────────────

/** @type {Hospital[]} */
export const initialHospitals = [
  {
    id: 'h1',
    name: 'AIIMS New Delhi',
    type: 'Government Super Specialty',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
    phone: '+91-11-2658-8500',
    lat: 28.5672,
    lng: 77.2100,
    icu: { total: 120, available: 14 },
    ventilators: { total: 80, available: 22 },
    oxygen: { total: 200, available: 85 },
    beds: { total: 2500, available: 320 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Cardiology', 'Neurology', 'Trauma', 'Oncology'],
    lastUpdated: Date.now() - 120000,
  },
  {
    id: 'h2',
    name: 'Safdarjung Hospital',
    type: 'Government General Hospital',
    address: 'Ring Road, Safdarjung, New Delhi',
    phone: '+91-11-2616-5060',
    lat: 28.5685,
    lng: 77.2039,
    icu: { total: 80, available: 3 },
    ventilators: { total: 50, available: 5 },
    oxygen: { total: 150, available: 42 },
    beds: { total: 1800, available: 85 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Trauma', 'General Surgery', 'Orthopedics'],
    lastUpdated: Date.now() - 300000,
  },
  {
    id: 'h3',
    name: 'Max Super Specialty, Saket',
    type: 'Private Super Specialty',
    address: '1, Press Enclave Road, Saket, New Delhi',
    phone: '+91-11-2651-5050',
    lat: 28.5270,
    lng: 77.2145,
    icu: { total: 60, available: 18 },
    ventilators: { total: 40, available: 15 },
    oxygen: { total: 100, available: 55 },
    beds: { total: 500, available: 120 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Cardiology', 'Neurosurgery', 'Oncology', 'Transplant'],
    lastUpdated: Date.now() - 60000,
  },
  {
    id: 'h4',
    name: 'Fortis Escort Heart Institute',
    type: 'Private Specialty',
    address: 'Okhla Road, Sukhdev Vihar, New Delhi',
    phone: '+91-11-4713-5000',
    lat: 28.5490,
    lng: 77.2800,
    icu: { total: 45, available: 8 },
    ventilators: { total: 30, available: 12 },
    oxygen: { total: 80, available: 35 },
    beds: { total: 310, available: 65 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Cardiology', 'Cardiac Surgery', 'Vascular Surgery'],
    lastUpdated: Date.now() - 180000,
  },
  {
    id: 'h5',
    name: 'Sir Ganga Ram Hospital',
    type: 'Private General Hospital',
    address: 'Rajinder Nagar, New Delhi',
    phone: '+91-11-2575-0000',
    lat: 28.6388,
    lng: 77.1900,
    icu: { total: 55, available: 0 },
    ventilators: { total: 35, available: 2 },
    oxygen: { total: 90, available: 18 },
    beds: { total: 675, available: 42 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: false,
    specialties: ['Gastroenterology', 'Nephrology', 'Pulmonology'],
    lastUpdated: Date.now() - 240000,
  },
  {
    id: 'h6',
    name: 'Apollo Hospital, Indraprastha',
    type: 'Private Super Specialty',
    address: 'Delhi Mathura Road, Sarita Vihar, New Delhi',
    phone: '+91-11-7179-1090',
    lat: 28.5437,
    lng: 77.2838,
    icu: { total: 70, available: 25 },
    ventilators: { total: 50, available: 20 },
    oxygen: { total: 120, available: 68 },
    beds: { total: 710, available: 180 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Transplant', 'Oncology', 'Robotic Surgery', 'Cardiology'],
    lastUpdated: Date.now() - 90000,
  },
  {
    id: 'h7',
    name: 'GTB Hospital',
    type: 'Government General Hospital',
    address: 'Dilshad Garden, Delhi',
    phone: '+91-11-2258-9111',
    lat: 28.6839,
    lng: 77.3144,
    icu: { total: 50, available: 5 },
    ventilators: { total: 30, available: 4 },
    oxygen: { total: 100, available: 28 },
    beds: { total: 1500, available: 110 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['General Medicine', 'Trauma', 'Pediatrics'],
    lastUpdated: Date.now() - 400000,
  },
  {
    id: 'h8',
    name: 'Medanta – The Medicity',
    type: 'Private Super Specialty',
    address: 'CH Baktawar Singh Road, Sector 38, Gurugram',
    phone: '+91-124-4141-414',
    lat: 28.4397,
    lng: 77.0427,
    icu: { total: 90, available: 32 },
    ventilators: { total: 60, available: 28 },
    oxygen: { total: 150, available: 90 },
    beds: { total: 1250, available: 350 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Cardiac Surgery', 'Neurosciences', 'Liver Transplant', 'Urology'],
    lastUpdated: Date.now() - 150000,
  },
  {
    id: 'h9',
    name: 'RML Hospital',
    type: 'Government General Hospital',
    address: 'Baba Kharak Singh Marg, New Delhi',
    phone: '+91-11-2336-5525',
    lat: 28.6258,
    lng: 77.2092,
    icu: { total: 40, available: 2 },
    ventilators: { total: 25, available: 1 },
    oxygen: { total: 80, available: 15 },
    beds: { total: 1100, available: 55 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['General Medicine', 'Orthopedics', 'ENT'],
    lastUpdated: Date.now() - 350000,
  },
  {
    id: 'h10',
    name: 'BLK-Max Super Specialty Hospital',
    type: 'Private Super Specialty',
    address: 'Pusa Road, Rajinder Nagar, New Delhi',
    phone: '+91-11-3040-3040',
    lat: 28.6424,
    lng: 77.1830,
    icu: { total: 65, available: 20 },
    ventilators: { total: 45, available: 18 },
    oxygen: { total: 110, available: 62 },
    beds: { total: 700, available: 155 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Oncology', 'BMT', 'Liver Transplant', 'Neurology'],
    lastUpdated: Date.now() - 200000,
  },
  {
    id: 'h11',
    name: 'Lok Nayak Jai Prakash Hospital',
    type: 'Government General Hospital',
    address: 'Jawaharlal Nehru Marg, Delhi Gate, New Delhi',
    phone: '+91-11-2323-2400',
    lat: 28.6378,
    lng: 77.2384,
    icu: { total: 60, available: 6 },
    ventilators: { total: 40, available: 8 },
    oxygen: { total: 130, available: 40 },
    beds: { total: 2000, available: 250 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Infectious Disease', 'General Medicine', 'Pediatrics'],
    lastUpdated: Date.now() - 280000,
  },
  {
    id: 'h12',
    name: 'Artemis Hospital, Gurugram',
    type: 'Private Super Specialty',
    address: 'Sector 51, Gurugram',
    phone: '+91-124-6767-999',
    lat: 28.4230,
    lng: 77.0476,
    icu: { total: 50, available: 16 },
    ventilators: { total: 35, available: 14 },
    oxygen: { total: 90, available: 50 },
    beds: { total: 400, available: 95 },
    bloodBank: true,
    emergency247: true,
    ambulanceAvailable: true,
    specialties: ['Cardiac Sciences', 'Oncology', 'Orthopedics', 'Renal Sciences'],
    lastUpdated: Date.now() - 100000,
  },
];

// ──────────────────────────────────────────────
//  Status & Level Utilities
// ──────────────────────────────────────────────

/**
 * Derive the overall availability status for a hospital.
 * Uses ICU occupancy as the primary indicator because ICU beds
 * are the most critical bottleneck during emergencies.
 *
 * @param {Hospital} hospital
 * @returns {HospitalStatus}
 */
export function getHospitalStatus(hospital) {
  const { available, total } = hospital.icu;
  if (total === 0) return 'full';
  const pct = available / total;
  if (pct === 0) return 'full';
  if (pct <= 0.15) return 'limited';
  return 'available';
}

/**
 * Determine the criticality level for a single resource pool.
 *
 * @param {number} available
 * @param {number} total
 * @returns {ResourceLevel}
 */
export function getResourceLevel(available, total) {
  if (total === 0) return 'critical';
  const pct = available / total;
  if (pct <= 0.05) return 'critical';
  if (pct <= 0.2) return 'warning';
  return 'good';
}

/**
 * Map a ResourceLevel to its CSS colour variable.
 *
 * @param {ResourceLevel} level
 * @returns {string} CSS custom-property reference.
 */
export function getResourceColor(level) {
  const map = {
    critical: 'var(--danger-400)',
    warning: 'var(--warning-400)',
    good: 'var(--success-400)',
  };
  return map[level] || map.good;
}

// ──────────────────────────────────────────────
//  Distance Calculation
// ──────────────────────────────────────────────

/**
 * Haversine distance between two WGS-84 coordinates in kilometres.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {string} Distance in km, to one decimal place.
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

// ──────────────────────────────────────────────
//  Real-Time Simulation Engine
// ──────────────────────────────────────────────

/**
 * Simulate a periodic data update for demo purposes.
 * In production this would be replaced by WebSocket / SSE push.
 *
 * Each call randomly nudges some hospitals' resources by a small delta,
 * clamped to [0, total] to ensure invariants hold.
 *
 * @param {Hospital[]} hospitals - Current state.
 * @returns {Hospital[]} Next state (new references only where changed).
 */
export function simulateUpdate(hospitals) {
  return hospitals.map((h) => {
    if (Math.random() > 0.4) return h; // ~60% chance of update

    /** @param {ResourcePool} resource */
    const updateResource = (resource) => {
      const delta = Math.floor(Math.random() * 5) - 2; // –2 to +2
      const next = clampValue(resource.available + delta, 0, resource.total);
      return next === resource.available
        ? resource // no change → same ref for memo
        : { ...resource, available: next };
    };

    const nextIcu = updateResource(h.icu);
    const nextVent = updateResource(h.ventilators);
    const nextOxy = updateResource(h.oxygen);
    const nextBeds = updateResource(h.beds);

    // Only create a new object if something actually changed
    if (
      nextIcu === h.icu &&
      nextVent === h.ventilators &&
      nextOxy === h.oxygen &&
      nextBeds === h.beds
    ) {
      return h;
    }

    return {
      ...h,
      icu: nextIcu,
      ventilators: nextVent,
      oxygen: nextOxy,
      beds: nextBeds,
      lastUpdated: Date.now(),
    };
  });
}

// ──────────────────────────────────────────────
//  Aggregation & Analytics
// ──────────────────────────────────────────────

/**
 * Aggregate resource totals across all hospitals.
 *
 * @param {Hospital[]} hospitals
 * @returns {Object} Totals and available counts for each resource type.
 */
export function getAggregatedStats(hospitals) {
  return hospitals.reduce(
    (acc, h) => {
      acc.totalICU += h.icu.total;
      acc.availableICU += h.icu.available;
      acc.totalVentilators += h.ventilators.total;
      acc.availableVentilators += h.ventilators.available;
      acc.totalOxygen += h.oxygen.total;
      acc.availableOxygen += h.oxygen.available;
      acc.totalBeds += h.beds.total;
      acc.availableBeds += h.beds.available;
      acc.hospitalCount += 1;
      return acc;
    },
    {
      totalICU: 0,
      availableICU: 0,
      totalVentilators: 0,
      availableVentilators: 0,
      totalOxygen: 0,
      availableOxygen: 0,
      totalBeds: 0,
      availableBeds: 0,
      hospitalCount: 0,
    },
  );
}

/**
 * Generate simulated 24-hour historical trend data for charts.
 *
 * @returns {Object[]} Array of hourly data points.
 */
export function generateHistoricalData() {
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date();
    hour.setHours(hour.getHours() - i);
    hours.push({
      time: `${hour.getHours().toString().padStart(2, '0')}:00`,
      icuAvailable: Math.floor(60 + Math.random() * 80),
      ventAvailable: Math.floor(40 + Math.random() * 60),
      oxygenAvailable: Math.floor(100 + Math.random() * 200),
      bedsAvailable: Math.floor(500 + Math.random() * 800),
      admissions: Math.floor(20 + Math.random() * 40),
      discharges: Math.floor(15 + Math.random() * 35),
    });
  }
  return hours;
}

/**
 * Compute distribution of hospitals by ownership type.
 *
 * @param {Hospital[]} hospitals
 * @returns {{ name: string, value: number }[]}
 */
export function getTypeDistribution(hospitals) {
  const dist = {};
  hospitals.forEach((h) => {
    const key = h.type.includes('Government') ? 'Government' : 'Private';
    dist[key] = (dist[key] || 0) + 1;
  });
  return Object.entries(dist).map(([name, value]) => ({ name, value }));
}

// ──────────────────────────────────────────────
//  Formatting
// ──────────────────────────────────────────────

/**
 * Human-readable "time ago" string from a Unix-ms timestamp.
 *
 * @param {number} timestamp - Unix timestamp in milliseconds.
 * @returns {string} e.g. "2m ago", "1h ago".
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
