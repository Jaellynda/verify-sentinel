import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, Copy, CheckCircle, AlertCircle, Loader2, Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  generateSentinelID, getHierarchy, getHexCenter,
  generateGoogleMapsLink, generateAppleMapsLink,
  detectCountry, formatCoordinates, RESOLUTION
} from '../lib/h3core';
import { translate } from '../lib/i18n';
import LandmarkMapper from '../components/LandmarkMapper';
import HexBackground from '../components/HexBackground';

/**
 * HEX-LOCK SEQUENCE animation component.
 * Simulates a hexagon "collapsing" from atmosphere to ground point.
 */
function HexLockAnimation({ phase }) {
  const scales = [3.5, 2.2, 1.4, 1.0];
  const opacities = [0.15, 0.25, 0.5, 1.0];
  const activeIdx = phase === 'acquiring' ? 0 : phase === 'resolving' ? 1 : phase === 'locking' ? 2 : 3;

  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
      {scales.map((scale, i) => (
        <div
          key={i}
          className="absolute transition-all duration-700"
          style={{
            transform: `scale(${i <= activeIdx ? scale : scales[scales.length - 1]})`,
            opacity: i <= activeIdx ? opacities[i] : 0,
          }}
        >
          <svg viewBox="0 0 100 100" width="80" height="80">
            <polygon
              points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
              fill="none"
              stroke={phase === 'locked' ? '#10B981' : '#3B82F6'}
              strokeWidth={phase === 'locked' && i === 3 ? 2.5 : 1.5}
              style={{
                filter: phase === 'locked' && i === 3 ? 'drop-shadow(0 0 8px #10B981)' : 'drop-shadow(0 0 4px #3B82F6)',
              }}
            />
          </svg>
        </div>
      ))}
      {/* Center pulse */}
      <div className={`absolute w-4 h-4 rounded-full transition-all duration-500 ${
        phase === 'locked'
          ? 'bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)]'
          : 'bg-blue-400 animate-ping shadow-[0_0_10px_rgba(59,130,246,0.6)]'
      }`} />
    </div>
  );
}

const STEPS = ['locate', 'anchor', 'certify'];

export default function GetMyID({ lang = 'en' }) {
  const navigate = useNavigate();
  const tr = (key) => translate(lang, key);

  const [step, setStep] = useState(0); // 0=locate, 1=anchor, 2=certify
  const [gpsPhase, setGpsPhase] = useState('idle'); // idle|acquiring|resolving|locking|locked|error
  const [gpsData, setGpsData] = useState(null);
  const [sentinelData, setSentinelData] = useState(null);
  const [savedAddress, setSavedAddress] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const acquireGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsPhase('error');
      return;
    }
    setGpsPhase('acquiring');

    // Simulate hex-lock sequence phases
    setTimeout(() => setGpsPhase('resolving'), 1200);
    setTimeout(() => setGpsPhase('locking'), 2400);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setAccuracy(Math.round(acc));

        const result = generateSentinelID(latitude, longitude, RESOLUTION.SENTINEL);
        const hierarchy = getHierarchy(result.h3_index);
        const center = getHexCenter(result.h3_index);
        const country = detectCountry(latitude, longitude);

        setGpsData({ latitude, longitude, country });
        setSentinelData({ ...result, hierarchy, center, country });
        setTimeout(() => setGpsPhase('locked'), 600);
      },
      (err) => {
        setGpsPhase('error');
        console.error('GPS error:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleSaveAddress = async (landmarks = []) => {
    if (!sentinelData || !gpsData) return;
    setSaving(true);

    const user = await base44.auth.me();
    const googleLink = generateGoogleMapsLink(sentinelData.center.lat, sentinelData.center.lng);
    const appleLink = generateAppleMapsLink(sentinelData.center.lat, sentinelData.center.lng);

    const addressRecord = await base44.entities.SentinelAddress.create({
      user_id: user.id,
      user_email: user.email,
      sentinel_id: sentinelData.sentinel_id,
      h3_index: sentinelData.h3_index,
      h3_index_res6: sentinelData.hierarchy.district,
      h3_index_res8: sentinelData.hierarchy.parish,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      hex_center_lat: sentinelData.center.lat,
      hex_center_lng: sentinelData.center.lng,
      country: gpsData.country,
      status: 'Pending',
      trust_score: 30,
      persistence_nights: 0,
      google_maps_link: googleLink,
      apple_maps_link: appleLink,
      language: lang,
    });

    // Save landmarks
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

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.08} />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">{tr('forge_title')}</h1>
          <p className="text-slate-500 text-sm">{tr('forge_sub')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
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
                {tr(`forge_step${i+1}`)}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < step ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 0: GPS Acquisition */}
        {step === 0 && (
          <div className="p-8 rounded-3xl border border-blue-900/40 text-center"
            style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-t-3xl" />

            <HexLockAnimation phase={gpsPhase} />

            <div className="mt-6 mb-8">
              {gpsPhase === 'idle' && (
                <p className="text-slate-400 text-sm">Press the button to acquire your GPS position and generate your Sentinel ID.</p>
              )}
              {gpsPhase === 'acquiring' && (
                <p className="text-blue-400 text-sm animate-pulse">{tr('forge_acquiring')}</p>
              )}
              {gpsPhase === 'resolving' && (
                <p className="text-blue-400 text-sm animate-pulse">Mapping to H3 icosahedron face...</p>
              )}
              {gpsPhase === 'locking' && (
                <p className="text-blue-400 text-sm animate-pulse">Snapping to Res-9 hexagon...</p>
              )}
              {gpsPhase === 'locked' && sentinelData && (
                <div className="space-y-3">
                  <p className="text-emerald-400 font-semibold">{tr('forge_locked')}</p>
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{tr('forge_your_id')}</p>
                    <p className="text-2xl font-bold text-white tracking-wider"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {sentinelData.sentinel_id}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Accuracy</p>
                      <p className="text-sm font-bold text-blue-400 font-mono">±{accuracy}m</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Resolution</p>
                      <p className="text-sm font-bold text-blue-400 font-mono">R-9</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Country</p>
                      <p className="text-sm font-bold text-blue-400 font-mono">{sentinelData.country}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">
                    {formatCoordinates(gpsData.latitude, gpsData.longitude)}
                  </div>
                </div>
              )}
              {gpsPhase === 'error' && (
                <div className="flex items-center gap-2 justify-center text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{tr('err_gps_denied')}</p>
                </div>
              )}
            </div>

            {gpsPhase === 'idle' || gpsPhase === 'error' ? (
              <button onClick={acquireGPS}
                className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:shadow-[0_0_35px_rgba(59,130,246,0.5)]">
                <Navigation className="w-5 h-5" />
                {gpsPhase === 'error' ? 'Try Again' : 'Acquire GPS Signal'}
              </button>
            ) : gpsPhase === 'locked' ? (
              <button onClick={() => setStep(1)}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                <CheckCircle className="w-5 h-5" />
                Continue — Add Landmarks →
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing satellite data...</span>
              </div>
            )}

            {/* Offline pill */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-500">{tr('forge_offline_safe')} — {tr('forge_offline_sub')}</span>
            </div>
          </div>
        )}

        {/* STEP 1: Landmark Mapper */}
        {step === 1 && (
          <div className="p-8 rounded-3xl border border-blue-900/40"
            style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold text-white">{tr('landmark_title')}</h2>
                <p className="text-xs text-slate-500">{tr('landmark_sub')}</p>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-mono">{sentinelData?.sentinel_id}</span>
            </div>
            <LandmarkMapper
              sentinelAddressId={null}
              h3Index={sentinelData?.h3_index}
              onComplete={(landmarks) => {
                handleSaveAddress(landmarks);
              }}
            />
            {saving && (
              <div className="flex items-center justify-center gap-2 mt-4 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Saving your Sentinel Address...</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Certification */}
        {step === 2 && savedAddress && (
          <div className="space-y-5">
            {/* Success card */}
            <div className="p-8 rounded-3xl border border-emerald-500/30 text-center"
              style={{ background: 'rgba(13,31,60,0.9)', backdropFilter: 'blur(20px)' }}>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Sentinel Address Created</h2>
              <p className="text-slate-500 text-sm mb-6">Your digital identity is now registered. Verify it over 3 nights to build full trust.</p>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Sentinel ID</p>
                <p className="text-2xl font-bold text-white tracking-wider mb-3"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {savedAddress.sentinel_id}
                </p>
                <button onClick={handleCopy}
                  className="flex items-center gap-2 mx-auto text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : tr('dash_copy_id')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <a href={savedAddress.google_maps_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-all">
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
              className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-all shadow-[0_0_25px_rgba(59,130,246,0.3)]">
              Go to My Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}