import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Copy, CheckCircle, AlertCircle, Navigation, MapPin, Target, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import {
  generateSentinelID, getHierarchy, getHexCenter, getHexBoundary,
  generateGoogleMapsLink, generateAppleMapsLink,
  detectCountry, formatCoordinates, RESOLUTION
} from '../lib/h3core';
import { translate } from '../lib/i18n';
import LandmarkMapper from '../components/LandmarkMapper';
import HexBackground from '../components/HexBackground';
import { latLngToCell, cellToBoundary } from 'h3-js';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * GPS ACCURACY → H3 RESOLUTION MAPPING
 * ─────────────────────────────────────────────────────────────
 * accuracy > 200m  → Res-7  "Ghost Hexagon" (~5km²)  — orientation only
 * accuracy 50–200m → Res-8  "Refining"      (~0.7km²) — parish level
 * accuracy < 50m   → Res-9  "Locked"        (~174m²)  — Sentinel ID
 * Manual override  → Res-9  "Confirmed"     (~174m²)  — user-placed pin
 * Save unlocks at: accuracy ≤ 10m OR manual confirm
 * ─────────────────────────────────────────────────────────────
 */
function getResolutionForAccuracy(accuracy) {
  if (accuracy > 200) return { res: 7, label: 'Ghost', phase: 'ghost' };
  if (accuracy > 50)  return { res: 8, label: 'Refining', phase: 'refining' };
  return { res: 9, label: 'Locked', phase: 'locked' };
}

const STATUS_STAGES = [
  { phase: 'idle',      text: 'Ready to acquire GPS signal', color: 'text-slate-500' },
  { phase: 'searching', text: 'Searching for satellites...', color: 'text-amber-400' },
  { phase: 'ghost',     text: 'Satellite found — rendering Ghost Hexagon (Res-7)...', color: 'text-blue-400' },
  { phase: 'refining',  text: 'Refining location — upgrading to Res-8...', color: 'text-blue-400' },
  { phase: 'locked',    text: '✓ Sentinel ID Locked at Res-9', color: 'text-emerald-400' },
  { phase: 'manual',    text: '✓ Manual location confirmed — Sentinel ID ready', color: 'text-emerald-400' },
  { phase: 'error',     text: 'GPS unavailable — use manual map placement', color: 'text-red-400' },
];

/** Map click handler for manual override */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

/** Animated hex polygon on the map */
function HexPolygon({ h3Index, phase }) {
  if (!h3Index) return null;
  const boundary = cellToBoundary(h3Index); // [[lat,lng],...]
  const positions = boundary.map(([lat, lng]) => [lat, lng]);

  const colorMap = {
    ghost:    { color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 1.5, dashArray: '6,4' },
    refining: { color: '#60A5FA', fillColor: '#3B82F6', fillOpacity: 0.15, weight: 2, dashArray: '3,2' },
    locked:   { color: '#10B981', fillColor: '#10B981', fillOpacity: 0.20, weight: 2.5, dashArray: null },
    manual:   { color: '#10B981', fillColor: '#10B981', fillOpacity: 0.22, weight: 2.5, dashArray: null },
  };

  const style = colorMap[phase] || colorMap.ghost;
  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        weight: style.weight,
        dashArray: style.dashArray,
      }}
    />
  );
}

/** HexLock animation — collapses from Res-7 to Res-9 */
function HexLockAnimation({ phase }) {
  const rings = [
    { scale: 3.2, show: ['ghost', 'refining', 'locked', 'manual'] },
    { scale: 2.0, show: ['refining', 'locked', 'manual'] },
    { scale: 1.0, show: ['locked', 'manual'] },
  ];

  const colors = { ghost: '#3B82F6', refining: '#60A5FA', locked: '#10B981', manual: '#10B981' };
  const c = colors[phase] || '#3B82F6';

  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
      {rings.map(({ scale, show }, i) => (
        <div key={i} className="absolute transition-all duration-700"
          style={{ transform: `scale(${show.includes(phase) ? scale : 4})`, opacity: show.includes(phase) ? (i === 0 ? 0.25 : i === 1 ? 0.5 : 1) : 0 }}>
          <svg viewBox="0 0 80 80" width="72" height="72">
            <polygon points="40,4 76,22 76,58 40,76 4,58 4,22"
              fill="none" stroke={c} strokeWidth={i === 2 ? 2.5 : 1.5}
              style={{ filter: `drop-shadow(0 0 ${i === 2 ? 8 : 3}px ${c})` }} />
          </svg>
        </div>
      ))}
      <div className={`absolute w-3 h-3 rounded-full transition-all duration-500 ${
        phase === 'locked' || phase === 'manual'
          ? 'bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.8)]'
          : phase === 'searching' || phase === 'ghost' || phase === 'refining'
          ? 'bg-blue-400 animate-ping'
          : 'bg-slate-600'
      }`} />
    </div>
  );
}

const STEPS = ['locate', 'anchor', 'certify'];

export default function GetMyID({ lang = 'en' }) {
  const navigate = useNavigate();
  const tr = (key) => translate(lang, key);
  const watchRef = useRef(null);
  const mapRef = useRef(null);

  const [step, setStep] = useState(0);
  const [residencyType, setResidencyType] = useState('Owner');
  const [phase, setPhase] = useState('idle');
  const [currentH3, setCurrentH3] = useState(null);
  const [currentRes, setCurrentRes] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [coords, setCoords] = useState(null);
  const [sentinelData, setSentinelData] = useState(null);
  const [manualPin, setManualPin] = useState(null);
  const [savedAddress, setSavedAddress] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Derived: can the user save?
  const canSave = phase === 'locked' && accuracy !== null && accuracy <= 10
    || phase === 'manual';

  const statusStage = STATUS_STAGES.find(s => s.phase === phase) || STATUS_STAGES[0];

  /** STEP 1: Immediate low-accuracy fix for Ghost Hexagon */
  const acquireGPS = useCallback(() => {
    setPhase('searching');
    setShowMap(true);

    // Pass 1: Low accuracy, cached ok — gets a fix in ~1–2 seconds
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const { res, phase: p } = getResolutionForAccuracy(acc);
        const h3 = latLngToCell(latitude, longitude, res);
        const center = getHexCenter(h3);

        setCoords({ latitude, longitude });
        setAccuracy(Math.round(acc));
        setCurrentH3(h3);
        setCurrentRes(res);
        setPhase(p);

        // Pan map to location
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], res === 7 ? 13 : res === 8 ? 15 : 17);
        }

        if (res === 9) {
          finalizeSentinel(latitude, longitude, h3);
        }
      },
      () => { setPhase('error'); },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
    );

    // Pass 2: High accuracy watch — refines progressively
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const { res, phase: p } = getResolutionForAccuracy(acc);
        const h3 = latLngToCell(latitude, longitude, res);

        setCoords({ latitude, longitude });
        setAccuracy(Math.round(acc));
        setCurrentH3(h3);
        setCurrentRes(res);
        setPhase(p);

        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], res === 9 ? 17 : res === 8 ? 15 : 13);
        }

        if (p === 'locked') {
          finalizeSentinel(latitude, longitude, h3);
          navigator.geolocation.clearWatch(watchRef.current);
        }
      },
      () => { setPhase('error'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
  }, []);

  function finalizeSentinel(lat, lng, h3Index) {
    const hierarchy = getHierarchy(h3Index);
    const center = getHexCenter(h3Index);
    const country = detectCountry(lat, lng);
    const result = generateSentinelID(lat, lng, RESOLUTION.SENTINEL);
    setSentinelData({ ...result, h3_index: h3Index, hierarchy, center, country });
  }

  /** Manual map override */
  const handleMapClick = useCallback((lat, lng) => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    const h3 = latLngToCell(lat, lng, RESOLUTION.SENTINEL);
    setManualPin({ lat, lng });
    setCurrentH3(h3);
    setCurrentRes(9);
    setPhase('manual');
    setAccuracy(null);
    finalizeSentinel(lat, lng, h3);
  }, []);

  useEffect(() => {
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  const handleSaveAddress = async (landmarks = []) => {
    if (!sentinelData || !canSave) return;
    setSaving(true);
    const user = await base44.auth.me();
    const googleLink = generateGoogleMapsLink(sentinelData.center.lat, sentinelData.center.lng);
    const appleLink = generateAppleMapsLink(sentinelData.center.lat, sentinelData.center.lng);

    const addressRecord = await base44.entities.SentinelAddress.create({
      user_id: user.id,
      user_email: user.email,
      residency_type: residencyType,
      sentinel_id: sentinelData.sentinel_id,
      h3_index: sentinelData.h3_index,
      h3_index_res6: sentinelData.hierarchy.district,
      h3_index_res8: sentinelData.hierarchy.parish,
      latitude: coords?.latitude || manualPin?.lat,
      longitude: coords?.longitude || manualPin?.lng,
      hex_center_lat: sentinelData.center.lat,
      hex_center_lng: sentinelData.center.lng,
      country: sentinelData.country,
      status: 'Pending',
      trust_score: 30,
      persistence_nights: 0,
      google_maps_link: googleLink,
      apple_maps_link: appleLink,
      language: lang,
    });

    for (const lm of landmarks) {
      await base44.entities.LandmarkDescription.create({
        sentinel_address_id: addressRecord.id,
        h3_index: sentinelData.h3_index,
        landmark_type: lm.type,
        direction: lm.direction,
        distance_meters: lm.distance ? parseFloat(lm.distance) : null,
        description_text: lm.description,
        ai_normalized: lm.ai_normalized,
        language: lang,
        is_primary: lm.is_primary,
      });
    }

    setSavedAddress(addressRecord);
    setSaving(false);
    setStep(2);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sentinelData?.sentinel_id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Resolution badge color
  const resBadge = {
    7: { bg: 'bg-slate-700/60', text: 'text-slate-400', label: 'Res-7 Ghost' },
    8: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Res-8 Refining' },
    9: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Res-9 Locked' },
  };
  const badge = resBadge[currentRes] || resBadge[7];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#0a0a0a' }}>
      <HexBackground opacity={0.06} />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">{tr('forge_title')}</h1>
          <p className="text-slate-500 text-sm">{tr('forge_sub')}</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                i < step ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                : i === step ? 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-600'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs capitalize hidden sm:block ${i === step ? 'text-white' : 'text-slate-600'}`}>
                {tr(`forge_step${i + 1}`)}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        {/* ── STEP 0: GPS Acquisition ── */}
        {step === 0 && (
          <div className="rounded-3xl border border-zinc-800 overflow-hidden"
            style={{ background: '#18181b' }}>
            <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

            {/* Map — shown once GPS starts */}
            {showMap && (
              <div className="relative" style={{ height: 240 }}>
                <MapContainer
                  center={coords ? [coords.latitude, coords.longitude] : [-1.286389, 36.817223]}
                  zoom={13}
                  style={{ height: '100%', width: '100%', background: '#060B13' }}
                  ref={mapRef}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution=""
                    maxZoom={19}
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {currentH3 && <HexPolygon h3Index={currentH3} phase={phase} />}
                  {manualPin && (
                    <Marker position={[manualPin.lat, manualPin.lng]} />
                  )}
                </MapContainer>

                {/* Map overlay hint */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <MapPin className="w-3 h-3 text-blue-400" />
                  <span className="text-slate-400">Tap anywhere on map to manually place your location</span>
                </div>

                {/* Resolution badge */}
                {currentRes && (
                  <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}
                    style={{ backdropFilter: 'blur(8px)', border: '1px solid currentColor', opacity: 0.9 }}>
                    {badge.label}
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              {/* Hex Lock Animation */}
              <div className="flex justify-center mb-4">
                <HexLockAnimation phase={phase} />
              </div>

              {/* Status Bar */}
              <div className="flex items-center gap-2 justify-center mb-4">
                {(phase === 'searching' || phase === 'ghost' || phase === 'refining') && (
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}
                {(phase === 'locked' || phase === 'manual') && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
                {phase === 'error' && (
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                )}
                <span className={`text-sm font-medium ${statusStage.color}`}>{statusStage.text}</span>
              </div>

              {/* Accuracy progress bar */}
              {accuracy !== null && phase !== 'manual' && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>GPS Accuracy</span>
                    <span className={accuracy <= 10 ? 'text-emerald-400 font-bold' : accuracy <= 50 ? 'text-blue-400' : 'text-amber-400'}>
                      ±{accuracy}m {accuracy <= 10 ? '✓ Save enabled' : accuracy <= 50 ? '— refining…' : '— searching…'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(5, Math.min(100, (1 - Math.min(accuracy, 200) / 200) * 100))}%`,
                        background: accuracy <= 10 ? '#10B981' : accuracy <= 50 ? '#3B82F6' : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Sentinel ID preview */}
              {sentinelData && (
                <div className={`p-3 rounded-2xl border mb-4 transition-all ${
                  phase === 'locked' || phase === 'manual'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-slate-700/40 bg-slate-900/40'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider mb-0.5">
                        {phase === 'ghost' ? 'Approximate ID (Res-7)' : phase === 'refining' ? 'Draft ID (Res-8)' : 'Sentinel ID (Res-9)'}
                      </p>
                      <p className={`text-lg font-bold tracking-wider transition-all ${
                        phase === 'locked' || phase === 'manual' ? 'text-white' : 'text-slate-500'
                      }`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {sentinelData.sentinel_id}
                      </p>
                    </div>
                    {coords && (
                      <div className="text-right">
                        <p className="text-xs text-slate-600 font-mono">{coords.latitude.toFixed(5)}</p>
                        <p className="text-xs text-slate-600 font-mono">{coords.longitude.toFixed(5)}</p>
                      </div>
                    )}
                    {manualPin && (
                      <div className="text-right">
                        <p className="text-xs text-slate-600 font-mono">{manualPin.lat.toFixed(5)}</p>
                        <p className="text-xs text-slate-600 font-mono">{manualPin.lng.toFixed(5)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {phase === 'idle' || phase === 'error' ? (
                <button onClick={acquireGPS}
                  className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(74,222,128,0.25)]">
                  <Navigation className="w-5 h-5" />
                  {phase === 'error' ? 'Retry GPS — or tap map to place manually' : 'Acquire GPS Signal'}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Save button — gated on accuracy ≤ 10m or manual */}
                  <button
                    onClick={() => setStep(1)}
                    disabled={!canSave}
                    className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      canSave
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                        : 'bg-slate-800/60 border border-slate-700/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {canSave ? (
                      <><CheckCircle className="w-5 h-5" /> Continue — Add Landmarks →</>
                    ) : (
                      <><Crosshair className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                        {accuracy !== null
                          ? `Waiting for ≤10m accuracy (currently ±${accuracy}m)…`
                          : 'Acquiring high-accuracy fix…'}
                      </>
                    )}
                  </button>

                  {/* Manual override hint */}
                  {phase !== 'manual' && !canSave && (
                    <p className="text-center text-xs text-slate-600">
                      GPS taking too long? <span className="text-blue-500">Tap your roof on the map above</span> to place manually.
                    </p>
                  )}
                </div>
              )}

              {/* Residency Type selector — shown when GPS is acquired */}
              {phase !== 'idle' && phase !== 'error' && (
                <div className="mt-4 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Residency Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{v:'Owner',icon:'🏗️',note:'Full tiers'},{v:'Tenant',icon:'🔑',note:'Full tiers'},{v:'Guest',icon:'🧳',note:'Max: Resident'}].map(({v,icon,note}) => (
                      <button key={v} onClick={() => setResidencyType(v)}
                        className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                          residencyType === v
                            ? v === 'Guest' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : 'bg-slate-800/60 border-slate-700/40 text-slate-500 hover:border-slate-600'
                        }`}>
                        <span className="text-base">{icon}</span>
                        <span>{v}</span>
                        <span className="text-slate-600 text-xs">{note}</span>
                      </button>
                    ))}
                  </div>
                  {residencyType === 'Guest' && (
                    <p className="text-xs text-amber-500/70 mt-2">⚠ Guest addresses are capped at Resident tier and cannot reach Sentinel Permanent.</p>
                  )}
                </div>
              )}

              {/* Offline safety pill */}
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-600">{tr('forge_offline_safe')} — H3 math runs entirely on-device</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Landmark Mapper ── */}
        {step === 1 && (
          <div className="p-8 rounded-3xl border border-zinc-800"
            style={{ background: '#18181b' }}>
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold text-white">{tr('landmark_title')}</h2>
                <p className="text-xs text-slate-500">{tr('landmark_sub')}</p>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 font-mono">{sentinelData?.sentinel_id}</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                {phase === 'manual' ? 'Manual' : `±${accuracy}m`}
              </span>
            </div>
            <LandmarkMapper
              sentinelAddressId={null}
              h3Index={sentinelData?.h3_index}
              onComplete={(landmarks) => handleSaveAddress(landmarks)}
            />
            {saving && (
              <div className="flex items-center justify-center gap-2 mt-4 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">Saving your Sentinel Address...</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Certification ── */}
        {step === 2 && savedAddress && (
          <div className="space-y-5">
            <div className="p-8 rounded-3xl border border-green-500/30 text-center"
              style={{ background: '#18181b' }}>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Sentinel Address Created</h2>
              <p className="text-slate-500 text-sm mb-6">Check in for 3 consecutive nights to build your full trust score.</p>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Sentinel ID</p>
                <p className="text-2xl font-bold text-white tracking-wider mb-3"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}>{savedAddress.sentinel_id}</p>
                <button onClick={handleCopy}
                  className="flex items-center gap-2 mx-auto text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : tr('dash_copy_id')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <a href={savedAddress.google_maps_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all">
                  🗺️ Google Maps
                </a>
                <a href={savedAddress.apple_maps_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700/50 bg-slate-800/60 text-slate-400 text-sm font-medium hover:text-white transition-all">
                  🍎 Apple Maps
                </a>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                <p className="text-xs text-amber-400 font-semibold mb-0.5">Status: Pending</p>
                <p className="text-xs text-slate-500">Check in from this location for 3 consecutive nights to achieve Verified status.</p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all shadow-[0_0_25px_rgba(74,222,128,0.25)]">
              Go to My Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}