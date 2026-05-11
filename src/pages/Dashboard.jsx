import { useState, useEffect, useCallback } from 'react';
import { Shield, MapPin, Copy, CheckCircle, Clock, ExternalLink, RefreshCw, Navigation, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isInsideHex, calculateTrustScore, formatCoordinates } from '../lib/h3core';
import { translate } from '../lib/i18n';
import {
  queueCheckin, getPendingCheckins, syncOfflineQueue,
  hasPendingCheckins, getTimeLockRemaining, formatTimeRemaining
} from '../lib/offlineQueue';
import TrustArc from '../components/TrustArc';
import TrustScoreGraph from '../components/TrustScoreGraph';
import VouchingSystem from '../components/VouchingSystem';
import HexBackground from '../components/HexBackground';
import NIRAVerification from '../components/NIRAVerification';
import AddressManagement from '../components/AddressManagement';
import AddressHistoryTrail from '../components/AddressHistoryTrail';
import TrustBadge from '../components/TrustBadge';

const TIERS = {
  'Visitor': {
    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
    icon: '👤', description: 'Instant — location registered',
    nextTier: 'Resident', requirement: '3 check-ins over 3 days',
  },
  'Resident': {
    color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
    icon: '🏠', description: 'Verified resident',
    nextTier: 'Sentinel Permanent', requirement: '4 weekly pings',
  },
  'Sentinel Permanent': {
    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
    icon: '🛡️', description: 'Maximum trust — permanent resident',
    nextTier: null, requirement: null,
  },
};

function computeTier(nights, weeklyPings, residencyType) {
  if (weeklyPings >= 4 && residencyType !== 'Guest') return 'Sentinel Permanent';
  if (nights >= 3) return 'Resident';
  return 'Visitor';
}

function TimeLockCountdown({ lastCheckin }) {
  const [remaining, setRemaining] = useState(getTimeLockRemaining(lastCheckin));

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      const r = getTimeLockRemaining(lastCheckin);
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastCheckin]);

  if (remaining <= 0) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-amber-400 font-semibold">Check-in Time Lock Active</p>
        <p className="text-xs text-slate-500">{formatTimeRemaining(remaining)} until next check-in</p>
      </div>
    </div>
  );
}

const LANDMARK_ICONS = {
  'Kiosk': '🏪', 'Petrol Station': '⛽', 'School': '🏫',
  'Church/Mosque': '🕌', 'Borehole': '💧', 'Market': '🛒',
  'Clinic/Hospital': '🏥', 'Bar/Restaurant': '🍺',
  'Road Junction': '🛤️', 'Tree/Natural': '🌳', 'Other': '📍',
};

export default function Dashboard({ lang = 'en' }) {
  const tr = (key) => translate(lang, key);
  const [address, setAddress] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(hasPendingCheckins());
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    loadData();

    const goOnline = async () => {
      setIsOnline(true);
      if (hasPendingCheckins()) {
        setSyncMessage('Syncing offline check-ins...');
        const count = await syncOfflineQueue(processQueuedCheckin);
        if (count > 0) {
          setSyncMessage(`✓ ${count} offline check-in(s) synced`);
          setPendingSync(false);
          await loadData();
          setTimeout(() => setSyncMessage(''), 4000);
        }
      }
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
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

  const processQueuedCheckin = useCallback(async ({ addressId, lat, lng, timestamp }) => {
    const currentAddr = await base44.entities.SentinelAddress.filter({ id: addressId });
    if (!currentAddr.length) return;
    const addr = currentAddr[0];
    await applyCheckin(addr, lat, lng, new Date(timestamp));
  }, []);

  const applyCheckin = async (addr, lat, lng, checkinTime = new Date()) => {
    const inside = isInsideHex(lat, lng, addr.h3_index);
    if (!inside) throw new Error('Outside hexagon');

    const newNights = (addr.persistence_nights || 0) + 1;
    let newWeeklyPings = addr.weekly_pings || 0;
    const lastWeekly = addr.last_weekly_ping ? new Date(addr.last_weekly_ping) : null;
    const daysSinceWeekly = lastWeekly ? (Date.now() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24) : 999;
    if (daysSinceWeekly >= 7) newWeeklyPings += 1;

    const newTier = computeTier(newNights, newWeeklyPings, addr.residency_type);
    const newScore = calculateTrustScore(Math.min(newNights, 3), addr.vouches_count || 0);

    const updateData = {
      persistence_nights: newNights,
      weekly_pings: newWeeklyPings,
      trust_score: newScore,
      status: newTier,
      last_checkin: checkinTime.toISOString(),
    };
    if (daysSinceWeekly >= 7) updateData.last_weekly_ping = checkinTime.toISOString();

    await base44.entities.SentinelAddress.update(addr.id, updateData);
  };

  const handleCheckin = async () => {
    if (!address) return;

    const remaining = getTimeLockRemaining(address.last_checkin);
    if (remaining > 0) {
      setCheckinMessage(`⏱ ${formatTimeRemaining(remaining)} until next check-in is allowed.`);
      return;
    }

    if (address.residency_type === 'Guest' && address.status === 'Resident') {
      setCheckinMessage('ℹ Guest residency cannot advance to Sentinel Permanent.');
      return;
    }

    setCheckingIn(true);
    setCheckinMessage('');

    if (!navigator.onLine) {
      queueCheckin({
        addressId: address.id,
        lat: address.latitude,
        lng: address.longitude,
        timestamp: new Date().toISOString(),
        residencyType: address.residency_type,
      });
      setPendingSync(true);
      setCheckinMessage('📶 Offline — check-in saved locally. Will sync when connected.');
      setAddress(prev => ({ ...prev, last_checkin: new Date().toISOString() }));
      setCheckingIn(false);
      return;
    }

    if (!navigator.geolocation) {
      setCheckinMessage('GPS unavailable.');
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await applyCheckin(address, latitude, longitude);
          await loadData();
          setCheckinMessage('✓ Check-in confirmed. Keep returning to build your tier.');
        } catch {
          setCheckinMessage('⚠ You are outside your registered hexagon. Move closer and try again.');
        }
        setCheckingIn(false);
      },
      () => {
        setCheckinMessage('GPS error. Enable location access and try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060B13' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all">
            <Navigation className="w-4 h-4" /> Generate My Sentinel ID
          </a>
        </div>
      </div>
    );
  }

  const tier = address.status || 'Visitor';
  const tierCfg = TIERS[tier] || TIERS['Visitor'];
  const nights = address.persistence_nights || 0;
  const weeklyPings = address.weekly_pings || 0;
  const timeLockRemaining = getTimeLockRemaining(address.last_checkin);
  const isTimeLocked = timeLockRemaining > 0;
  const isMaxTier = tier === 'Sentinel Permanent';
  const isGuestBlocked = address.residency_type === 'Guest' && tier === 'Resident';

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.07} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-5">

        {/* Offline / Sync Banner */}
        {!isOnline && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-400 font-semibold">Offline Mode Active</p>
              <p className="text-xs text-slate-500">Check-ins will be cached locally and synced when you reconnect.</p>
            </div>
          </div>
        )}
        {syncMessage && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-emerald-400 font-medium">{syncMessage}</p>
          </div>
        )}
        {pendingSync && isOnline && !syncMessage && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <RefreshCw className="w-4 h-4 text-green-400 animate-spin" />
            <p className="text-xs text-green-400">Syncing offline check-ins...</p>
          </div>
        )}

        {/* Header Card + NIRA side-by-side */}
        <div className="grid lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(13,31,60,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent mb-5 -mx-6 px-6" />

          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{tr('dash_title')}</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border ${tierCfg.bg} ${tierCfg.border} ${tierCfg.color}`}>
                <span>{tierCfg.icon}</span>
                <span>{tier}</span>
                {!isMaxTier && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              </div>
              {address.residency_type && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-slate-800/60 border border-slate-700/40 text-slate-500 ml-2">
                  {address.residency_type === 'Owner' ? '🏗️' : address.residency_type === 'Tenant' ? '🔑' : '🧳'}
                  {address.residency_type}
                </div>
              )}
            </div>
            <button onClick={loadData} className="text-slate-600 hover:text-slate-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Tier Progress Path */}
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
            {Object.entries(TIERS).map(([name, cfg], i, arr) => (
              <div key={name} className="flex items-center gap-2 flex-1">
                <div className={`flex flex-col items-center gap-1 flex-1 ${
                  name === tier ? cfg.color : (Object.keys(TIERS).indexOf(name) < Object.keys(TIERS).indexOf(tier) ? 'text-emerald-500' : 'text-slate-700')
                }`}>
                  <span className="text-base">{cfg.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">{name}</span>
                  {name === tier && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                {i < arr.length - 1 && (
                  <div className={`h-px flex-1 ${Object.keys(TIERS).indexOf(tier) > i ? 'bg-emerald-500/40' : 'bg-slate-700/50'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Next requirement */}
          {!isMaxTier && (
            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/20 mb-4">
              <p className="text-xs text-slate-600">
                <span className="text-slate-400">Next tier:</span> {tierCfg.nextTier} — requires {tierCfg.requirement}
                {isGuestBlocked && <span className="text-amber-500"> (Guest type cannot reach Sentinel Permanent)</span>}
              </p>
            </div>
          )}

          {/* Sentinel ID */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/40 mb-4">
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Sentinel ID</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-white tracking-wider"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {address.sentinel_id}
              </span>
              <button onClick={handleCopy}
                className="ml-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-green-400 hover:border-green-500/50 transition-all">
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-mono">{address.h3_index}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-center">
              <p className="text-xl font-bold text-green-400 font-mono">{address.trust_score || 30}</p>
              <p className="text-xs text-slate-600 mt-0.5">{tr('dash_trust')}</p>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                {(address.trust_score || 30) < 50 && (
                  <span className="text-xs text-amber-500/70 leading-tight">↑ builds with check-ins</span>
                )}
                {(address.trust_score || 30) >= 50 && (address.trust_score || 30) < 80 && (
                  <span className="text-xs text-blue-400/70 leading-tight">↑ add vouches to grow</span>
                )}
                {(address.trust_score || 30) >= 80 && (
                  <span className="text-xs text-emerald-400/70 leading-tight">✓ KYC-grade</span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-center">
              <p className="text-xl font-bold text-emerald-400 font-mono">{nights}</p>
              <p className="text-xs text-slate-600 mt-0.5">Check-ins</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-center">
              <p className="text-xl font-bold text-amber-400 font-mono">{weeklyPings}/4</p>
              <p className="text-xs text-slate-600 mt-0.5">Weekly Pings</p>
            </div>
          </div>
        </div>

        {/* NIRA panel — right column on desktop */}
        <div className="p-6 rounded-3xl border border-slate-800/60 flex flex-col"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🇺🇬</span>
            <h3 className="text-sm font-semibold text-white">NIRA Identity Verification</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">Full KYC</span>
          </div>
          <NIRAVerification
            addressId={address.id}
            userEmail={address.user_email}
            onVerified={loadData}
          />
        </div>
        </div>{/* end header+NIRA grid */}

        {/* Trust Arc + Check-in (Persistence) */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">{tr('dash_persistence')}</h3>
          <p className="text-xs text-slate-500 mb-5">{tr('dash_persistence_sub')}</p>
          <TrustArc score={address.trust_score || 30} nights={Math.min(nights, 3)} maxNights={3} />

          {/* Weekly ping nodes */}
          <div className="mt-4 mb-5">
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">Weekly Pings (Sentinel Permanent)</p>
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                  i < weeklyPings ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-slate-800'
                }`} />
              ))}
            </div>
            {isGuestBlocked && (
              <p className="text-xs text-amber-500/70 mt-1.5">🧳 Guest accounts cannot reach Sentinel Permanent</p>
            )}
          </div>

          {isTimeLocked && <div className="mb-4"><TimeLockCountdown lastCheckin={address.last_checkin} /></div>}

          <button
            onClick={handleCheckin}
            disabled={checkingIn || isMaxTier || (isTimeLocked && !checkinMessage)}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isMaxTier
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                : isTimeLocked
                ? 'bg-slate-800/60 border border-slate-700/40 text-slate-600 cursor-not-allowed'
                : !isOnline
                ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                : 'bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(74,222,128,0.3)]'
            }`}
          >
            {checkingIn ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
            ) : isMaxTier ? (
              <><CheckCircle className="w-4 h-4" /> Sentinel Permanent — Maximum Trust</>
            ) : isTimeLocked ? (
              <><Clock className="w-4 h-4" /> Time-Locked</>
            ) : !isOnline ? (
              <><WifiOff className="w-4 h-4" /> Check-in Offline (will sync)</>
            ) : (
              <><Navigation className="w-4 h-4" /> {tr('dash_checkin')}</>
            )}
          </button>

          {checkinMessage && (
            <div className={`mt-3 p-3 rounded-xl text-xs text-center ${
              checkinMessage.startsWith('✓') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : checkinMessage.startsWith('📶') ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              : 'bg-slate-800/60 border border-slate-700/30 text-slate-400'
            }`}>
              {checkinMessage}
            </div>
          )}
        </div>

        {/* Vouching System */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <VouchingSystem
            addressId={address.id}
            sentinelId={address.sentinel_id}
            h3Index={address.h3_index}
            vouchCount={address.vouches_count || 0}
            onVouchAdded={loadData}
          />
        </div>

        {/* Trust Score Graph */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <TrustScoreGraph addressId={address.id} userEmail={address.user_email} currentScore={address.trust_score || 30} />
        </div>

        {/* Address History Trail */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <AddressHistoryTrail
            userEmail={address.user_email}
            currentScore={address.trust_score || 30}
          />
        </div>

        {/* Address Management */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <AddressManagement
            address={address}
            onDeprecated={() => loadData()}
          />
        </div>

        {/* Trust Badge */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
          <TrustBadge address={address} />
        </div>

        {/* Physical Anchors */}
        {landmarks.length > 0 && (
          <div className="p-6 rounded-3xl border border-slate-800/60"
            style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
            <h3 className="text-sm font-semibold text-white mb-4">{tr('dash_anchors')}</h3>
            <div className="space-y-3">
              {landmarks.map((lm) => (
                <div key={lm.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-lg flex-shrink-0">
                    {LANDMARK_ICONS[lm.landmark_type] || '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-green-400 uppercase">{lm.landmark_type}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">{lm.direction}</span>
                      {lm.is_primary && <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">Primary</span>}
                    </div>
                    <p className="text-sm text-slate-300 truncate">{lm.ai_normalized || lm.description_text}</p>
                    {lm.distance_meters && <p className="text-xs text-slate-600 mt-0.5">~{lm.distance_meters}m</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deep Links */}
        <div className="p-6 rounded-3xl border border-slate-800/60"
          style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">{tr('dash_deep_link')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href={address.google_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all">
              <ExternalLink className="w-4 h-4" /> {tr('dash_google_maps')}
            </a>
            <a href={address.apple_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700/50 bg-slate-800/60 text-slate-300 text-sm font-medium hover:text-white transition-all">
              <ExternalLink className="w-4 h-4" /> {tr('dash_apple_maps')}
            </a>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
            <p className="text-xs text-slate-500 font-mono">
              {formatCoordinates(address.hex_center_lat, address.hex_center_lng)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}