/**
 * @fileoverview MapView — Interactive Leaflet map showing hospital locations.
 *
 * Renders colour-coded markers (green/amber/red) based on ICU availability,
 * dark CARTO basemap, and popups with resource counts + action links.
 *
 * @module MapView
 */

import React, { useEffect, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getHospitalStatus, getResourceLevel, getResourceColor } from './data.js';

// ──────────────────────────────────────────────
//  Marker Icon Cache (Efficiency)
// ──────────────────────────────────────────────

/**
 * Cache created icons so we don't instantiate a new L.divIcon on every render.
 * Pure CSS markers — no innerHTML / no XSS vector.
 * @type {Record<string, L.DivIcon>}
 */
const iconCache = {};

/**
 * Return a cached Leaflet DivIcon for the given hospital status.
 * Uses a CSS-only teardrop shape instead of injecting HTML strings.
 *
 * @param {'available' | 'limited' | 'full'} status
 * @returns {L.DivIcon}
 */
function getMarkerIcon(status) {
  if (iconCache[status]) return iconCache[status];

  const colorMap = {
    available: { bg: '#16a34a', border: '#22c55e' },
    limited:   { bg: '#d97706', border: '#fbbf24' },
    full:      { bg: '#dc2626', border: '#f87171' },
  };
  const c = colorMap[status] || colorMap.available;

  // Using a CSS-only approach: a styled div with no user-controlled content.
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-pin marker-pin--${status}" style="background:${c.bg};border-color:${c.border};" aria-hidden="true"><span class="marker-pin__icon">+</span></div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });

  iconCache[status] = icon;
  return icon;
}

// ──────────────────────────────────────────────
//  FlyToSelected — map animation on selection
// ──────────────────────────────────────────────

/** @param {{ hospital: import('./data.js').Hospital | null }} props */
function FlyToSelected({ hospital }) {
  const map = useMap();
  useEffect(() => {
    if (hospital) {
      map.flyTo([hospital.lat, hospital.lng], 14, { duration: 1 });
    }
  }, [hospital, map]);
  return null;
}

// ──────────────────────────────────────────────
//  ResourceColor helper for popup
// ──────────────────────────────────────────────

/** Small inline component for a popup resource cell. */
function PopupResource({ available, total, label }) {
  const level = getResourceLevel(available, total);
  return (
    <div className="popup-resource">
      <div className="popup-resource-value" style={{ color: getResourceColor(level) }}>
        {available}
      </div>
      <div className="popup-resource-label">{label}</div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  MapView Component
// ──────────────────────────────────────────────

/**
 * Interactive map showing all hospitals as colour-coded markers.
 *
 * @param {Object} props
 * @param {import('./data.js').Hospital[]} props.hospitals
 * @param {import('./data.js').Hospital | null} props.selectedHospital
 * @param {(h: import('./data.js').Hospital) => void} props.onSelectHospital
 */
function MapView({ hospitals, selectedHospital, onSelectHospital }) {
  const center = useMemo(() => [28.5800, 77.2100], []);

  return (
    <div
      className="map-container"
      role="region"
      aria-label="Map of hospitals with real-time resource availability"
    >
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        <FlyToSelected hospital={selectedHospital} />

        {hospitals.map((hospital) => {
          const status = getHospitalStatus(hospital);
          return (
            <Marker
              key={hospital.id}
              position={[hospital.lat, hospital.lng]}
              icon={getMarkerIcon(status)}
              eventHandlers={{
                click: () => onSelectHospital(hospital),
              }}
              alt={`${hospital.name} — ${status}`}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div className="popup-name">{hospital.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--neutral-400)', marginBottom: '8px' }}>
                    {hospital.type}
                  </div>

                  <div className="popup-resource-grid">
                    <PopupResource available={hospital.icu.available} total={hospital.icu.total} label="ICU" />
                    <PopupResource available={hospital.ventilators.available} total={hospital.ventilators.total} label="Vent." />
                    <PopupResource available={hospital.oxygen.available} total={hospital.oxygen.total} label="O₂" />
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a
                      href={`tel:${hospital.phone}`}
                      aria-label={`Call ${hospital.name}`}
                      style={{ fontSize: '12px', color: 'var(--primary-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      📞 Call Now
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Get directions to ${hospital.name}`}
                      style={{ fontSize: '12px', color: 'var(--success-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      🗺️ Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default memo(MapView);
