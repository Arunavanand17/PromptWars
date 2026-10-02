/**
 * @fileoverview Unit tests for data.js utility functions.
 *
 * Covers: clampValue, validateResourceInput, getHospitalStatus,
 * getResourceLevel, getResourceColor, calculateDistance, timeAgo,
 * getAggregatedStats, simulateUpdate, generateHistoricalData, getTypeDistribution.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  clampValue,
  validateResourceInput,
  getHospitalStatus,
  getResourceLevel,
  getResourceColor,
  calculateDistance,
  timeAgo,
  getAggregatedStats,
  simulateUpdate,
  generateHistoricalData,
  getTypeDistribution,
  initialHospitals,
} from './data.js';

// ──────────────────────────────────────────────
//  clampValue
// ──────────────────────────────────────────────

describe('clampValue', () => {
  it('clamps values within range', () => {
    expect(clampValue(5, 0, 10)).toBe(5);
  });

  it('clamps to min when below', () => {
    expect(clampValue(-3, 0, 10)).toBe(0);
  });

  it('clamps to max when above', () => {
    expect(clampValue(15, 0, 10)).toBe(10);
  });

  it('returns fallback for NaN', () => {
    expect(clampValue(NaN, 0, 10, 5)).toBe(5);
  });

  it('returns fallback for undefined', () => {
    expect(clampValue(undefined, 0, 10, 0)).toBe(0);
  });

  it('floors floating point numbers', () => {
    expect(clampValue(5.7, 0, 10)).toBe(5);
  });

  it('handles string numbers', () => {
    expect(clampValue('8', 0, 10)).toBe(8);
  });
});

// ──────────────────────────────────────────────
//  validateResourceInput
// ──────────────────────────────────────────────

describe('validateResourceInput', () => {
  it('returns valid value for normal input', () => {
    const result = validateResourceInput(5, 10);
    expect(result).toEqual({ value: 5, error: null });
  });

  it('rejects empty input', () => {
    const result = validateResourceInput('', 10);
    expect(result.error).toBe('Value is required.');
  });

  it('rejects negative values', () => {
    const result = validateResourceInput(-3, 10);
    expect(result.error).toBe('Cannot be negative.');
  });

  it('rejects NaN input', () => {
    const result = validateResourceInput('abc', 10);
    expect(result.error).toBe('Must be a valid number.');
  });

  it('rejects values exceeding total capacity', () => {
    const result = validateResourceInput(15, 10);
    expect(result.error).toBe('Cannot exceed total capacity (10).');
  });

  it('floors floating point and passes', () => {
    const result = validateResourceInput(5.8, 10);
    expect(result.value).toBe(5);
    expect(result.error).toBeNull();
  });

  it('accepts zero as valid', () => {
    const result = validateResourceInput(0, 10);
    expect(result).toEqual({ value: 0, error: null });
  });

  it('accepts max capacity exactly', () => {
    const result = validateResourceInput(10, 10);
    expect(result).toEqual({ value: 10, error: null });
  });
});

// ──────────────────────────────────────────────
//  getHospitalStatus
// ──────────────────────────────────────────────

describe('getHospitalStatus', () => {
  it('returns "full" when ICU available is 0', () => {
    const h = { icu: { total: 50, available: 0 } };
    expect(getHospitalStatus(h)).toBe('full');
  });

  it('returns "limited" when ICU below 15%', () => {
    const h = { icu: { total: 100, available: 10 } };
    expect(getHospitalStatus(h)).toBe('limited');
  });

  it('returns "available" when ICU above 15%', () => {
    const h = { icu: { total: 100, available: 30 } };
    expect(getHospitalStatus(h)).toBe('available');
  });

  it('returns "full" when total is 0 (edge case)', () => {
    const h = { icu: { total: 0, available: 0 } };
    expect(getHospitalStatus(h)).toBe('full');
  });

  it('returns "limited" at exactly 15%', () => {
    const h = { icu: { total: 100, available: 15 } };
    expect(getHospitalStatus(h)).toBe('limited');
  });
});

// ──────────────────────────────────────────────
//  getResourceLevel
// ──────────────────────────────────────────────

describe('getResourceLevel', () => {
  it('returns "critical" at 0%', () => {
    expect(getResourceLevel(0, 100)).toBe('critical');
  });

  it('returns "critical" at 5%', () => {
    expect(getResourceLevel(5, 100)).toBe('critical');
  });

  it('returns "warning" at 10%', () => {
    expect(getResourceLevel(10, 100)).toBe('warning');
  });

  it('returns "warning" at 20%', () => {
    expect(getResourceLevel(20, 100)).toBe('warning');
  });

  it('returns "good" above 20%', () => {
    expect(getResourceLevel(50, 100)).toBe('good');
  });

  it('returns "critical" when total is 0', () => {
    expect(getResourceLevel(0, 0)).toBe('critical');
  });
});

// ──────────────────────────────────────────────
//  getResourceColor
// ──────────────────────────────────────────────

describe('getResourceColor', () => {
  it('maps "critical" to danger color', () => {
    expect(getResourceColor('critical')).toBe('var(--danger-400)');
  });

  it('maps "warning" to warning color', () => {
    expect(getResourceColor('warning')).toBe('var(--warning-400)');
  });

  it('maps "good" to success color', () => {
    expect(getResourceColor('good')).toBe('var(--success-400)');
  });

  it('defaults to "good" for unknown levels', () => {
    expect(getResourceColor('unknown')).toBe('var(--success-400)');
  });
});

// ──────────────────────────────────────────────
//  calculateDistance
// ──────────────────────────────────────────────

describe('calculateDistance', () => {
  it('returns "0.0" for same coordinates', () => {
    expect(calculateDistance(28.6, 77.2, 28.6, 77.2)).toBe('0.0');
  });

  it('returns a positive distance for different coords', () => {
    const dist = parseFloat(calculateDistance(28.6139, 77.2090, 28.5672, 77.2100));
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(20); // should be ~5 km
  });

  it('returns a string with one decimal', () => {
    const result = calculateDistance(28.0, 77.0, 29.0, 78.0);
    expect(result).toMatch(/^\d+\.\d$/);
  });
});

// ──────────────────────────────────────────────
//  timeAgo
// ──────────────────────────────────────────────

describe('timeAgo', () => {
  it('returns seconds ago for recent timestamps', () => {
    expect(timeAgo(Date.now() - 30000)).toMatch(/\d+s ago/);
  });

  it('returns minutes ago for older timestamps', () => {
    expect(timeAgo(Date.now() - 120000)).toMatch(/\d+m ago/);
  });

  it('returns hours ago for much older timestamps', () => {
    expect(timeAgo(Date.now() - 7200000)).toMatch(/\d+h ago/);
  });
});

// ──────────────────────────────────────────────
//  getAggregatedStats
// ──────────────────────────────────────────────

describe('getAggregatedStats', () => {
  it('aggregates stats from initial hospitals correctly', () => {
    const stats = getAggregatedStats(initialHospitals);
    expect(stats.hospitalCount).toBe(12);
    expect(stats.totalICU).toBeGreaterThan(0);
    expect(stats.availableICU).toBeLessThanOrEqual(stats.totalICU);
    expect(stats.totalVentilators).toBeGreaterThan(0);
    expect(stats.totalOxygen).toBeGreaterThan(0);
    expect(stats.totalBeds).toBeGreaterThan(0);
  });

  it('returns zeros for empty array', () => {
    const stats = getAggregatedStats([]);
    expect(stats.hospitalCount).toBe(0);
    expect(stats.totalICU).toBe(0);
    expect(stats.availableICU).toBe(0);
  });
});

// ──────────────────────────────────────────────
//  simulateUpdate
// ──────────────────────────────────────────────

describe('simulateUpdate', () => {
  it('returns an array of the same length', () => {
    const updated = simulateUpdate(initialHospitals);
    expect(updated).toHaveLength(initialHospitals.length);
  });

  it('never makes available exceed total', () => {
    // Run multiple times to test stochastic behaviour
    for (let i = 0; i < 20; i++) {
      const updated = simulateUpdate(initialHospitals);
      updated.forEach((h) => {
        expect(h.icu.available).toBeLessThanOrEqual(h.icu.total);
        expect(h.icu.available).toBeGreaterThanOrEqual(0);
        expect(h.ventilators.available).toBeLessThanOrEqual(h.ventilators.total);
        expect(h.ventilators.available).toBeGreaterThanOrEqual(0);
        expect(h.oxygen.available).toBeLessThanOrEqual(h.oxygen.total);
        expect(h.oxygen.available).toBeGreaterThanOrEqual(0);
        expect(h.beds.available).toBeLessThanOrEqual(h.beds.total);
        expect(h.beds.available).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('preserves hospital identity (id, name, etc.)', () => {
    const updated = simulateUpdate(initialHospitals);
    updated.forEach((h, i) => {
      expect(h.id).toBe(initialHospitals[i].id);
      expect(h.name).toBe(initialHospitals[i].name);
    });
  });
});

// ──────────────────────────────────────────────
//  generateHistoricalData
// ──────────────────────────────────────────────

describe('generateHistoricalData', () => {
  it('returns 24 data points', () => {
    const data = generateHistoricalData();
    expect(data).toHaveLength(24);
  });

  it('each point has expected keys', () => {
    const data = generateHistoricalData();
    const keys = ['time', 'icuAvailable', 'ventAvailable', 'oxygenAvailable', 'bedsAvailable', 'admissions', 'discharges'];
    data.forEach((point) => {
      keys.forEach((key) => {
        expect(point).toHaveProperty(key);
      });
    });
  });
});

// ──────────────────────────────────────────────
//  getTypeDistribution
// ──────────────────────────────────────────────

describe('getTypeDistribution', () => {
  it('groups hospitals into Government and Private', () => {
    const dist = getTypeDistribution(initialHospitals);
    const names = dist.map((d) => d.name);
    expect(names).toContain('Government');
    expect(names).toContain('Private');
  });

  it('sums to total hospital count', () => {
    const dist = getTypeDistribution(initialHospitals);
    const sum = dist.reduce((a, d) => a + d.value, 0);
    expect(sum).toBe(initialHospitals.length);
  });
});

// ──────────────────────────────────────────────
//  Initial Data Integrity
// ──────────────────────────────────────────────

describe('initialHospitals schema compliance', () => {
  it('every hospital has all required fields', () => {
    const requiredFields = [
      'id', 'name', 'type', 'address', 'phone', 'lat', 'lng',
      'icu', 'ventilators', 'oxygen', 'beds',
      'bloodBank', 'emergency247', 'ambulanceAvailable',
      'specialties', 'lastUpdated',
    ];

    initialHospitals.forEach((h) => {
      requiredFields.forEach((field) => {
        expect(h).toHaveProperty(field);
      });
    });
  });

  it('every resource pool has total ≥ available ≥ 0', () => {
    initialHospitals.forEach((h) => {
      ['icu', 'ventilators', 'oxygen', 'beds'].forEach((r) => {
        expect(h[r].available).toBeGreaterThanOrEqual(0);
        expect(h[r].available).toBeLessThanOrEqual(h[r].total);
        expect(h[r].total).toBeGreaterThan(0);
      });
    });
  });

  it('all IDs are unique', () => {
    const ids = initialHospitals.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('coordinates are valid lat/lng', () => {
    initialHospitals.forEach((h) => {
      expect(h.lat).toBeGreaterThanOrEqual(-90);
      expect(h.lat).toBeLessThanOrEqual(90);
      expect(h.lng).toBeGreaterThanOrEqual(-180);
      expect(h.lng).toBeLessThanOrEqual(180);
    });
  });
});
