import { useState, useEffect } from 'react';
import { Shield, MapPin, Copy, CheckCircle, Clock, Users, ExternalLink, RefreshCw, Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isInsideHex, calculateTrustScore, formatCoordinates } from '../lib/h3core';
import { translate } from '../lib/i18n';
import TrustArc from '../components/TrustArc';
import HexBackground from '../components/HexBackground';

const STATUS_CONFIG = {
  Pending: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Pending' },
  Partial: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Partial' },
  Verified: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Verified' },
};

export default function Dashboard({ lang = 'en' }) {
  const tr = (key) => translate(lang, key);
  const [address, setAddress] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const addresses = await base44.entities.SentinelAddress.filter({ user_email: user.email }, '-created_date', 1);
    if (addresses.length > 0) {
      const addr = addresses[0];
      setAddress(addr);
      const lms = await base44.entities.LandmarkDescription.filter({ h3_index: addr.h3_index });
      setLandmarks(lms);
    }
    setLoading(false);
  };

  const handleCheckin = async () => {
    if (!address || !navigator.geolocation) return;
    setCheckingIn(true);
    setCheckinMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const inside = isInsideHex(latitude, longitude, address.h3_index);

        if (inside) {
          const newNights = Math.min((address.persistence_nights || 0) + 1, 3);
          const newScore = calculateTrustScore(newNights, address.vouches_count || 0);
          const newStatus = newNights >= 3 ? 'Verified' : newNights >= 1 ? 'Partial' : 'Pending';

          await base44.entities.SentinelAddress.update(address.id, {
            persistence_nights: newNights,
            trust_score: newScore,
            status: newStatus,
            last_checkin: new Date().toISOString(),
          });

          setCheckinMessage(`✓ Night ${newNights}/3 confirmed. Trust Score: ${newScore}`);
          await loadData();
        } else {
          setCheckinMessage('⚠ You are not inside your registered hexagon. Move closer and try again.');
        }
        setCheckingIn(false);
      },
      () => {
        setCheckinMessage('GPS error. Please enable location access.');
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address.sentinel_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const LANDMARK_ICONS = {
    'Kiosk': '🏪', 'Petrol Station': '⛽', 'School': '🏫',
    'Church/Mosque': '🕌', 'Borehole': '💧', 'Market': '🛒',
    'Clinic/Hospital': '🏥', 'Bar/Restaurant': '🍺',
    'Road Junction': '🛤️', 'Tree/Natural': '🌳', 'Other': '📍',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060B13' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading your Sentinel Address...</p>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060B13' }}>
        <HexBackground opacity={0.08} />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Address Found</h2>
          <p className="text-slate-500 text-sm mb-6">{tr('err_no_address')}</p>
          <a href="/get-id"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-all">
            <Navigation className="w-4 h-4" /> Generate My Sentinel ID
          </a>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[address.status] || STATUS_CONFIG.Pending;
  const nights = address.persistence_nights || 0;

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.07} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 space-y-5">
        {/* Header Card */}
        <div className="p-6 rounded-3xl border border-blue-900/40"
          style={{ background: 'rgba(13,31,60,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-t-3xl" />

          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{tr('dash_title')}</p>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} border`}>
                <span className={`w-1.5 h-1.5 rounded-full ${address.status === 'Verified' ? 'bg-emerald-400' : 'bg-current'} ${address.status !== 'Verified' ? 'animate-pulse' : ''}`} />
                {address.status}
              </div>
            </div>
            <button onClick={loadData} className="text-slate-600 hover:text-slate-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Sentinel ID */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/40 mb-4">
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Sentinel ID</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-white tracking-wider"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {address.sentinel_id}
              </span>
              <button onClick={handleCopy}
                className="ml-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all">
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-mono">{address.h3_index}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-center">
              <p className="text-xl font-bold text-blue-400 font-mono">{address.trust_score || 30}</p>
              <p className="text-xs text-slate-600 mt-0.5">{tr('dash_trust')}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-center">
              <p className="text-xl font-bold text-emerald-400 font-mono">{nights}/3</p>
              <p className="text-xs text-slate-600 mt-0.5">{tr('dash_nights')}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-center">
              <p className="text-xl font-bold text-amber-400 font-mono">{address.vouches_count || 0}</p>
              <p className="text-xs text-slate-600 mt-0.5">{tr('dash_vouches')}</p>
            </div>
          </div>
        </div>

        {/* Trust Arc + Persistence */}
        <div className="p-6 rounded-3xl border border-blue-900/40"
          style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">{tr('dash_persistence')}</h3>
          <p className="text-xs text-slate-500 mb-6">{tr('dash_persistence_sub')}</p>

          <TrustArc score={address.trust_score || 30} nights={nights} maxNights={3} />

          <button onClick={handleCheckin} disabled={checkingIn || nights >= 3}
            className="w-full mt-6 py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50
              bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            {checkingIn ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying Location...</>
            ) : nights >= 3 ? (
              <><CheckCircle className="w-4 h-4" /> Fully Verified — 3/3 Nights Complete</>
            ) : (
              <><Navigation className="w-4 h-4" /> {tr('dash_checkin')} (Night {nights + 1}/3)</>
            )}
          </button>

          {checkinMessage && (
            <div className={`mt-3 p-3 rounded-xl text-xs text-center ${
              checkinMessage.startsWith('✓') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>
              {checkinMessage}
            </div>
          )}
        </div>

        {/* Physical Anchors */}
        {landmarks.length > 0 && (
          <div className="p-6 rounded-3xl border border-blue-900/40"
            style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
            <h3 className="text-sm font-semibold text-white mb-4">{tr('dash_anchors')}</h3>
            <div className="space-y-3">
              {landmarks.map((lm, i) => (
                <div key={lm.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-lg flex-shrink-0">
                    {LANDMARK_ICONS[lm.landmark_type] || '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-blue-400 uppercase">{lm.landmark_type}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">{lm.direction}</span>
                      {lm.is_primary && <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">Primary</span>}
                    </div>
                    <p className="text-sm text-slate-300 truncate">{lm.ai_normalized || lm.description_text}</p>
                    {lm.distance_meters && <p className="text-xs text-slate-600 mt-0.5">~{lm.distance_meters}m away</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deep Links */}
        <div className="p-6 rounded-3xl border border-blue-900/40"
          style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">{tr('dash_deep_link')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href={address.google_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-all">
              <ExternalLink className="w-4 h-4" /> {tr('dash_google_maps')}
            </a>
            <a href={address.apple_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700/50 bg-slate-800/60 text-slate-300 text-sm font-medium hover:text-white transition-all">
              <ExternalLink className="w-4 h-4" /> {tr('dash_apple_maps')}
            </a>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
            <p className="text-xs text-slate-500">Hex Center:</p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {formatCoordinates(address.hex_center_lat, address.hex_center_lng)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}