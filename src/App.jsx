/**
 * @fileoverview MedAlert — Main Application Component
 *
 * Orchestrates the dashboard, analytics, and admin panel views.
 * Provides real-time hospital resource tracking with simulated live updates,
 * search/filter, emergency contacts, and toast notifications.
 *
 * @module App
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Activity, MapPin, BarChart3, Settings, Phone, Search,
  Bed, Wind, Droplets, Navigation, PhoneCall,
  AlertTriangle, CheckCircle, XCircle, Info, X, Bell,
  Heart, Shield, TrendingUp, TrendingDown,
  RefreshCw, Stethoscope, Building2, Siren, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  initialHospitals, getHospitalStatus, getResourceLevel, getResourceColor,
  calculateDistance, simulateUpdate, getAggregatedStats,
  generateHistoricalData, getTypeDistribution, timeAgo, validateResourceInput,
} from './data.js';
import MapView from './MapView.jsx';

// ──────────────────────────────────────────────
//  Toast Notification System
// ──────────────────────────────────────────────

/**
 * Renders an accessible, auto-dismissing toast notification stack.
 * Uses `role="alert"` and `aria-live="assertive"` so screen readers
 * announce critical updates (e.g. "ICU Full at AIIMS").
 */
function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      className="toast-container"
      role="alert"
      aria-live="assertive"
      aria-atomic="false"
      id="toast-region"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <div className="toast-icon" aria-hidden="true">
            {toast.type === 'success' && <CheckCircle />}
            {toast.type === 'warning' && <AlertTriangle />}
            {toast.type === 'error' && <XCircle />}
            {toast.type === 'info' && <Info />}
          </div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label={`Dismiss notification: ${toast.title}`}
          >
            <X />
          </button>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
//  Emergency Modal (Accessible)
// ──────────────────────────────────────────────

/**
 * Full-screen emergency contacts overlay.
 * Implements keyboard trap (Escape to close), focus management,
 * and correct aria attributes for modal dialogs.
 */
function EmergencyModal({ onClose }) {
  const closeRef = useRef(null);

  // Focus trap: focus the first interactive element on mount
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      aria-describedby="emergency-modal-desc"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close emergency dialog"
          style={{
            position: 'absolute', top: 12, right: 12, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)', color: 'var(--neutral-400)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div className="modal-icon" aria-hidden="true">
          <Siren />
        </div>
        <h2 className="modal-title" id="emergency-modal-title">Emergency Helpline</h2>
        <p className="modal-desc" id="emergency-modal-desc">
          In case of a medical emergency, call the numbers below immediately.
          Ambulance services will locate the nearest available hospital for you.
        </p>
        <div className="emergency-contacts">
          {[
            { href: 'tel:112',  icon: <Phone />,     name: 'National Emergency Number',  number: '112' },
            { href: 'tel:102',  icon: <Heart />,     name: 'Ambulance Service',           number: '102' },
            { href: 'tel:108',  icon: <Activity />,  name: 'Emergency Medical Response',  number: '108' },
            { href: 'tel:1078', icon: <Shield />,    name: 'Disaster Helpline (NDMA)',     number: '1078' },
          ].map((c) => (
            <a
              key={c.number}
              href={c.href}
              className="emergency-contact-item"
              aria-label={`Call ${c.name} at ${c.number}`}
            >
              <div className="emergency-contact-icon" aria-hidden="true">{c.icon}</div>
              <div className="emergency-contact-info">
                <div className="emergency-contact-name">{c.name}</div>
                <div className="emergency-contact-number">{c.number}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Stat Card (Memoized)
// ──────────────────────────────────────────────

/**
 * Single KPI card with capacity bar.
 */
const StatCard = memo(function StatCard({ icon, label, value, total, change, colorClass }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  const level = percent > 70 ? 'good' : percent > 30 ? 'warning' : 'critical';
  const levelColor = level === 'good' ? 'var(--success-400)' : level === 'warning' ? 'var(--warning-400)' : 'var(--danger-400)';

  return (
    <div className={`stat-card ${colorClass} animate-in`} role="status" aria-label={`${label}: ${value} of ${total}`}>
      <div className="stat-card-header">
        <div className="stat-card-icon" aria-hidden="true">{icon}</div>
        {change !== undefined && (
          <div className={`stat-card-change ${change >= 0 ? 'up' : 'down'}`} aria-label={`Change: ${change >= 0 ? '+' : ''}${change}`}>
            {change >= 0 ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}
            {Math.abs(change)}
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {total > 0 && (
        <div className="capacity-bar-container">
          <div className="capacity-bar-label">
            <span className="capacity-bar-text">Capacity</span>
            <span className="capacity-bar-percent" style={{ color: levelColor }}>
              {percent}% available
            </span>
          </div>
          <div className="capacity-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} capacity`}>
            <div className={`capacity-bar-fill ${level}`} style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
});

// ──────────────────────────────────────────────
//  Hospital Card (Memoized)
// ──────────────────────────────────────────────

/**
 * Card showing a single hospital's resource snapshot.
 * Shows lastUpdated time for transparency (problem-statement requirement).
 * Keyboard-navigable with Enter/Space to select.
 */
const HospitalCard = memo(function HospitalCard({ hospital, onSelect }) {
  const status = getHospitalStatus(hospital);
  const statusLabels = { available: 'Available', limited: 'Limited', full: 'Full' };
  const icuLevel = getResourceLevel(hospital.icu.available, hospital.icu.total);
  const ventLevel = getResourceLevel(hospital.ventilators.available, hospital.ventilators.total);
  const oxyLevel = getResourceLevel(hospital.oxygen.available, hospital.oxygen.total);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(hospital);
    }
  };

  return (
    <div
      className="hospital-card"
      onClick={() => onSelect(hospital)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${hospital.name}, ${statusLabels[status]}. ${hospital.icu.available} ICU beds, ${hospital.ventilators.available} ventilators, ${hospital.oxygen.available} oxygen.`}
      id={`hospital-card-${hospital.id}`}
    >
      <div className="hospital-card-header">
        <div>
          <div className="hospital-name">{hospital.name}</div>
          <div className="hospital-type">{hospital.type}</div>
        </div>
        <div className={`hospital-status-badge ${status}`}>
          <span className="hospital-status-dot" aria-hidden="true" />
          {statusLabels[status]}
        </div>
      </div>

      <div className="hospital-resources">
        <div className="resource-item">
          <Bed size={16} aria-hidden="true" />
          <span className={`resource-value ${icuLevel}`}>{hospital.icu.available}</span>
          <span className="resource-label">ICU</span>
        </div>
        <div className="resource-item">
          <Wind size={16} aria-hidden="true" />
          <span className={`resource-value ${ventLevel}`}>{hospital.ventilators.available}</span>
          <span className="resource-label">Vent.</span>
        </div>
        <div className="resource-item">
          <Droplets size={16} aria-hidden="true" />
          <span className={`resource-value ${oxyLevel}`}>{hospital.oxygen.available}</span>
          <span className="resource-label">O₂</span>
        </div>
      </div>

      {/* Last Updated — critical transparency requirement */}
      <div className="last-updated" aria-label={`Last updated ${timeAgo(hospital.lastUpdated)}`}>
        <Clock size={14} aria-hidden="true" />
        Updated {timeAgo(hospital.lastUpdated)}
      </div>

      <div className="hospital-footer" style={{ marginTop: 'var(--space-2)' }}>
        <div className="hospital-distance">
          <Navigation size={14} aria-hidden="true" />
          {calculateDistance(28.6139, 77.2090, hospital.lat, hospital.lng)} km away
        </div>
        <div className="hospital-actions">
          <a
            href={`tel:${hospital.phone}`}
            className="hospital-action-btn"
            title="Call Hospital"
            aria-label={`Call ${hospital.name}`}
            onClick={(e) => e.stopPropagation()}
            id={`call-btn-${hospital.id}`}
          >
            <PhoneCall size={16} />
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hospital-action-btn"
            title="Get Directions"
            aria-label={`Get directions to ${hospital.name}`}
            onClick={(e) => e.stopPropagation()}
            id={`directions-btn-${hospital.id}`}
          >
            <Navigation size={16} />
          </a>
        </div>
      </div>
    </div>
  );
});

// ──────────────────────────────────────────────
//  Admin Panel (with validation)
// ──────────────────────────────────────────────

/**
 * Hospital-side interface for updating resource availability.
 * Includes input validation with visible error messages (Security + UX).
 */
function AdminPanel({ hospitals, onUpdate, addToast }) {
  const [selectedHospital, setSelectedHospital] = useState(hospitals[0]?.id || '');
  const [icuAvailable, setIcuAvailable] = useState('');
  const [ventAvailable, setVentAvailable] = useState('');
  const [oxygenAvailable, setOxygenAvailable] = useState('');
  const [bedsAvailable, setBedsAvailable] = useState('');
  const [errors, setErrors] = useState({});

  const selected = hospitals.find((h) => h.id === selectedHospital);

  useEffect(() => {
    if (selected) {
      setIcuAvailable(String(selected.icu.available));
      setVentAvailable(String(selected.ventilators.available));
      setOxygenAvailable(String(selected.oxygen.available));
      setBedsAvailable(String(selected.beds.available));
      setErrors({});
    }
  }, [selectedHospital, selected]);

  const handleSubmit = () => {
    if (!selected) return;

    const icuResult = validateResourceInput(icuAvailable, selected.icu.total);
    const ventResult = validateResourceInput(ventAvailable, selected.ventilators.total);
    const oxyResult = validateResourceInput(oxygenAvailable, selected.oxygen.total);
    const bedResult = validateResourceInput(bedsAvailable, selected.beds.total);

    const newErrors = {};
    if (icuResult.error) newErrors.icu = icuResult.error;
    if (ventResult.error) newErrors.vent = ventResult.error;
    if (oxyResult.error) newErrors.oxygen = oxyResult.error;
    if (bedResult.error) newErrors.beds = bedResult.error;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({ type: 'warning', title: 'Validation Errors', message: 'Please fix the highlighted fields.' });
      return;
    }

    setErrors({});

    const updated = hospitals.map((h) => {
      if (h.id !== selectedHospital) return h;
      return {
        ...h,
        icu: { ...h.icu, available: icuResult.value },
        ventilators: { ...h.ventilators, available: ventResult.value },
        oxygen: { ...h.oxygen, available: oxyResult.value },
        beds: { ...h.beds, available: bedResult.value },
        lastUpdated: Date.now(),
      };
    });

    onUpdate(updated);
    addToast({
      type: 'success',
      title: 'Resources Updated',
      message: `${selected.name} availability has been broadcast successfully.`,
    });
  };

  /** Render a validated input field with optional error message. */
  const renderField = (id, label, value, onChange, max, errorKey) => (
    <div className="admin-form-group">
      <label className="admin-label" htmlFor={id}>{label} (/{max})</label>
      <input
        id={id}
        className={`admin-input ${errors[errorKey] ? 'admin-input--error' : ''}`}
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={(e) => { onChange(e.target.value); setErrors((prev) => ({ ...prev, [errorKey]: null })); }}
        aria-invalid={!!errors[errorKey]}
        aria-describedby={errors[errorKey] ? `${id}-error` : undefined}
      />
      {errors[errorKey] && (
        <span className="admin-error" id={`${id}-error`} role="alert">
          {errors[errorKey]}
        </span>
      )}
    </div>
  );

  return (
    <section className="admin-section" aria-labelledby="admin-panel-title">
      <div className="admin-header">
        <div>
          <h2 className="admin-title" id="admin-panel-title">Hospital Admin Panel</h2>
          <p style={{ color: 'var(--neutral-400)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Update resource availability for your hospital in real-time
          </p>
        </div>
        <div className="live-indicator" aria-label="Broadcasting live">
          <span className="live-dot" aria-hidden="true" />
          Broadcasting Live
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="admin-label" htmlFor="admin-hospital-select">Select Hospital</label>
          <select
            id="admin-hospital-select"
            className="admin-select"
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        {renderField('admin-icu', 'ICU Beds Available', icuAvailable, setIcuAvailable, selected?.icu.total, 'icu')}
        {renderField('admin-vent', 'Ventilators Available', ventAvailable, setVentAvailable, selected?.ventilators.total, 'vent')}
        {renderField('admin-oxygen', 'Oxygen Cylinders Available', oxygenAvailable, setOxygenAvailable, selected?.oxygen.total, 'oxygen')}
        {renderField('admin-beds', 'General Beds Available', bedsAvailable, setBedsAvailable, selected?.beds.total, 'beds')}
      </div>

      <div className="admin-btn-group">
        <button className="btn-primary" onClick={handleSubmit} id="admin-submit-btn">
          <RefreshCw size={18} aria-hidden="true" />
          Update &amp; Broadcast
        </button>
        <button
          className="btn-secondary"
          id="admin-reset-btn"
          onClick={() => {
            if (selected) {
              setIcuAvailable(String(selected.icu.available));
              setVentAvailable(String(selected.ventilators.available));
              setOxygenAvailable(String(selected.oxygen.available));
              setBedsAvailable(String(selected.beds.available));
              setErrors({});
            }
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
//  Custom Recharts Tooltip
// ──────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--neutral-800)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', padding: '12px 16px', boxShadow: 'var(--shadow-xl)',
    }}>
      <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginBottom: '8px' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ fontSize: '13px', color: entry.color, marginBottom: '4px', fontWeight: 600 }}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
//  Analytics Section
// ──────────────────────────────────────────────

function AnalyticsSection({ historicalData, hospitals }) {
  const typeData = getTypeDistribution(hospitals);
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

  return (
    <section className="analytics-section" aria-labelledby="analytics-title">
      <div className="section-header">
        <div>
          <h2 className="section-title" id="analytics-title">City-Wide Analytics</h2>
          <p className="section-subtitle">Real-time resource utilization trends across all hospitals</p>
        </div>
        <div className="tab-buttons" role="tablist" aria-label="Time range">
          <button className="tab-btn active" role="tab" aria-selected="true">24 Hours</button>
          <button className="tab-btn" role="tab" aria-selected="false">7 Days</button>
          <button className="tab-btn" role="tab" aria-selected="false">30 Days</button>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-title">ICU &amp; Ventilator Availability</span>
            <span className="chart-card-badge">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="icuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ventGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="time" stroke="var(--neutral-500)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--neutral-500)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="icuAvailable" name="ICU Beds" stroke="#3b82f6" fill="url(#icuGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="ventAvailable" name="Ventilators" stroke="#22c55e" fill="url(#ventGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-title">Admissions vs Discharges</span>
            <span className="chart-card-badge">Trending</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="time" stroke="var(--neutral-500)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--neutral-500)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="admissions" name="Admissions" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="discharges" name="Discharges" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-title">Oxygen Supply Levels</span>
            <span className="chart-card-badge">Critical Metric</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="time" stroke="var(--neutral-500)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--neutral-500)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="oxygenAvailable" name="O₂ Cylinders" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-title">Hospital Network Distribution</span>
            <span className="chart-card-badge">{hospitals.length} Hospitals</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={typeData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {typeData.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '3px', background: COLORS[i % COLORS.length] }} aria-hidden="true" />
                  <span style={{ fontSize: '13px', color: 'var(--neutral-300)' }}>{item.name} ({item.value})</span>
                </div>
              ))}
              <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', fontSize: '12px', color: 'var(--primary-400)', fontWeight: 600 }}>
                <Building2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                {hospitals.length} Total Facilities
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
//  Main App Component
// ──────────────────────────────────────────────

export default function App() {
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEmergency, setShowEmergency] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [historicalData] = useState(generateHistoricalData);
  const [updateCount, setUpdateCount] = useState(0);

  // Simulated real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHospitals((prev) => {
        const updated = simulateUpdate(prev);
        updated.forEach((h, i) => {
          if (h.icu.available !== prev[i].icu.available) {
            if (h.icu.available === 0 && prev[i].icu.available > 0) {
              addToast({ type: 'error', title: 'ICU Full', message: `${h.name} has no ICU beds available.` });
            } else if (h.icu.available > 0 && prev[i].icu.available === 0) {
              addToast({ type: 'success', title: 'ICU Available', message: `${h.name} now has ${h.icu.available} ICU bed(s) available.` });
            }
          }
        });
        setUpdateCount((c) => c + 1);
        return updated;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Toast management
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Filtered & sorted hospitals
  const filteredHospitals = useMemo(() => {
    let result = hospitals;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((h) =>
        h.name.toLowerCase().includes(q) ||
        h.type.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.specialties.some((s) => s.toLowerCase().includes(q)),
      );
    }

    if (activeFilter !== 'all') {
      result = result.filter((h) => {
        const status = getHospitalStatus(h);
        if (activeFilter === 'available') return status === 'available';
        if (activeFilter === 'limited') return status === 'limited';
        if (activeFilter === 'critical') return status === 'full';
        if (activeFilter === 'government') return h.type.includes('Government');
        if (activeFilter === 'private') return h.type.includes('Private');
        return true;
      });
    }

    // Sort by distance (nearest first) — fast for emergencies
    return [...result].sort((a, b) => {
      const distA = parseFloat(calculateDistance(28.6139, 77.2090, a.lat, a.lng));
      const distB = parseFloat(calculateDistance(28.6139, 77.2090, b.lat, b.lng));
      return distA - distB;
    });
  }, [hospitals, searchQuery, activeFilter]);

  // Aggregated stats
  const stats = useMemo(() => getAggregatedStats(hospitals), [hospitals]);

  // Stat changes (simulated delta)
  const changes = useMemo(() => ({
    icu: Math.floor(Math.random() * 6) - 2,
    vent: Math.floor(Math.random() * 4) - 1,
    oxygen: Math.floor(Math.random() * 10) - 3,
    beds: Math.floor(Math.random() * 20) - 5,
  }), [updateCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterOptions = useMemo(() => [
    { key: 'all',        label: 'All Hospitals', icon: <Building2 size={14} aria-hidden="true" /> },
    { key: 'available',  label: 'Available',     icon: <CheckCircle size={14} aria-hidden="true" /> },
    { key: 'limited',    label: 'Limited',       icon: <AlertTriangle size={14} aria-hidden="true" /> },
    { key: 'critical',   label: 'Critical',      icon: <XCircle size={14} aria-hidden="true" /> },
    { key: 'government', label: 'Govt.',         icon: <Shield size={14} aria-hidden="true" /> },
    { key: 'private',    label: 'Private',       icon: <Building2 size={14} aria-hidden="true" /> },
  ], []);

  return (
    <div className="app-container">
      {/* Skip Navigation — Accessibility */}
      <a href="#main-content" className="skip-nav">Skip to main content</a>

      {/* Navbar */}
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <div className="navbar-logo" aria-hidden="true">
              <Activity />
            </div>
            <div>
              <div className="navbar-title">MedAlert</div>
              <div className="navbar-subtitle">Real-Time Resource Tracker</div>
            </div>
          </div>

          <div className="navbar-nav" role="tablist" aria-label="Main views">
            {[
              { key: 'dashboard', icon: <MapPin size={18} aria-hidden="true" />, label: 'Dashboard' },
              { key: 'analytics', icon: <BarChart3 size={18} aria-hidden="true" />, label: 'Analytics' },
              { key: 'admin',     icon: <Settings size={18} aria-hidden="true" />, label: 'Admin Panel' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`panel-${tab.key}`}
                id={`tab-${tab.key}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <button className="nav-btn notification-badge" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="live-indicator" aria-label="System is live and receiving updates">
              <span className="live-dot" aria-hidden="true" />
              Live
            </div>
            <button
              className="emergency-btn"
              onClick={() => setShowEmergency(true)}
              aria-label="Open emergency contacts"
              id="emergency-trigger-btn"
            >
              <Phone size={18} aria-hidden="true" />
              Emergency
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content" id="main-content">
        <h1 className="sr-only">MedAlert — Real-Time Hospital Resource Dashboard</h1>

        {/* Stats Strip */}
        <div className="stats-strip" role="region" aria-label="City-wide resource summary">
          <StatCard icon={<Bed />} label="ICU Beds Available" value={stats.availableICU} total={stats.totalICU} change={changes.icu} colorClass="blue" />
          <StatCard icon={<Wind />} label="Ventilators Available" value={stats.availableVentilators} total={stats.totalVentilators} change={changes.vent} colorClass="green" />
          <StatCard icon={<Droplets />} label="Oxygen Cylinders" value={stats.availableOxygen} total={stats.totalOxygen} change={changes.oxygen} colorClass="amber" />
          <StatCard icon={<Stethoscope />} label="General Beds Available" value={stats.availableBeds} total={stats.totalBeds} change={changes.beds} colorClass="red" />
        </div>

        {activeTab === 'dashboard' && (
          <div role="tabpanel" id="panel-dashboard" aria-labelledby="tab-dashboard">
            {/* Filter Bar */}
            <div className="filter-bar" style={{ marginBottom: 'var(--space-5)' }} role="toolbar" aria-label="Hospital filters">
              <div className="map-search" style={{ maxWidth: 360, flex: 'unset' }}>
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search hospitals, specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search hospitals by name, specialty, or address"
                  id="hospital-search"
                />
              </div>
              {filterOptions.map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${activeFilter === f.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(f.key)}
                  aria-pressed={activeFilter === f.key}
                  id={`filter-${f.key}`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Map + Hospital List */}
            <div className="content-grid">
              <div className="map-section">
                <MapView
                  hospitals={filteredHospitals}
                  selectedHospital={selectedHospital}
                  onSelectHospital={setSelectedHospital}
                />
              </div>

              <div className="hospital-sidebar" aria-label="Hospital listing">
                <div className="sidebar-header">
                  <h2 className="sidebar-title">Nearby Hospitals</h2>
                  <span className="sidebar-count" aria-live="polite">{filteredHospitals.length} found</span>
                </div>
                <div className="hospital-list" role="list" aria-label="Hospitals sorted by distance">
                  {filteredHospitals.map((h) => (
                    <div role="listitem" key={h.id}>
                      <HospitalCard hospital={h} onSelect={setSelectedHospital} />
                    </div>
                  ))}
                  {filteredHospitals.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--neutral-500)' }} role="status">
                      <Search size={32} style={{ margin: '0 auto var(--space-3)', opacity: 0.5 }} aria-hidden="true" />
                      <p>No hospitals match your search.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics">
            <AnalyticsSection historicalData={historicalData} hospitals={hospitals} />
          </div>
        )}

        {activeTab === 'admin' && (
          <div role="tabpanel" id="panel-admin" aria-labelledby="tab-admin">
            <AdminPanel hospitals={hospitals} onUpdate={setHospitals} addToast={addToast} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer" role="contentinfo">
        <div className="footer-inner">
          <span className="footer-text">© 2026 MedAlert — Built for saving lives. Real-time hospital resource tracking.</span>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      {showEmergency && <EmergencyModal onClose={() => setShowEmergency(false)} />}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
