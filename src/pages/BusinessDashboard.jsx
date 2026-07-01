import { useState, useEffect } from 'react';
import { supabase } from '@/api/base44Client';
import {
  Search, Shield, CheckCircle, Clock, XCircle, MapPin, Copy,
  TrendingUp, Users, FileText, Key, Eye, EyeOff, Download,
  AlertTriangle, ChevronRight, Building2, Zap, Globe, Lock,
  BarChart2, RefreshCw, ExternalLink, Info
} from 'lucide-react';
import HexBackground from '../components/HexBackground';
import TrustArc from '../components/TrustArc';

// ─── TRUST SCORE RING ────────────────────────────────────────────────────────
function TrustRing({ score }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#3B82F6' : '#F59E0B';
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg viewBox="0 0 88 88" className="w-24 h-24 -rotate-90 absolute">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1E293B" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div className="text-center z-10">
        <p className="text-xl font-black" style={{ color }}>{score}</p>
        <p className="text-xs text-slate-500 leading-none">/ 100</p>
      </div>
    </div>
  );
}

// ─── TIER BADGE ──────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const config = {
    'Visitor':           { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: '👤', label: 'Visitor' },
    'Resident':          { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: '🏠', label: 'Resident' },
    'Sentinel Permanent':{ color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '🛡️', label: 'Sentinel Permanent' },
  };
  const c = config[tier] || config['Visitor'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.color}`}>
      <span>{c.icon}</span>{c.label}
    </span>
  );
}

// ─── RISK SIGNAL ─────────────────────────────────────────────────────────────
function RiskSignal({ score, nights, vouches }) {
  const risk = score >= 70 && nights >= 3 ? 'LOW'
    : score >= 50 ? 'MEDIUM' : 'HIGH';
  const config = {
    LOW:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Low Risk' },
    MEDIUM: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   label: 'Medium Risk' },
    HIGH:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     label: 'High Risk' },
  };
  const c = config[risk];
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${c.bg} ${c.border}`}>
      <div className={`w-2 h-2 rounded-full ${risk === 'LOW' ? 'bg-emerald-400' : risk === 'MEDIUM' ? 'bg-amber-400' : 'bg-red-400'}`} />
      <span className={`text-xs font-bold ${c.color}`}>{c.label}</span>
    </div>
  );
}

// ─── VERIFICATION RESULT CARD ─────────────────────────────────────────────────
function VerificationCard({ result, landmarks, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-blue-500/20 overflow-hidden"
      style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>

      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Verification Result</p>
            <p className="text-white font-mono font-bold text-sm">{result.sentinel_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskSignal score={result.trust_score} nights={result.persistence_nights} vouches={result.vouches_count} />
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xs">
            Clear
          </button>
        </div>
      </div>

      <div className="p-6 grid md:grid-cols-3 gap-6">

        {/* Trust Score */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <TrustRing score={result.trust_score || 30} />
          <p className="text-xs text-slate-500 mt-2 text-center">Trust Score</p>
          <TierBadge tier={result.status} />
        </div>

        {/* Identity Signals */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Identity Signals</p>

          {[
            { label: 'Check-ins', value: `${result.persistence_nights || 0} nights`, icon: '🌙',
              note: result.persistence_nights >= 3 ? 'Residency confirmed' : 'Building residency' },
            { label: 'Neighbor Vouches', value: `${result.vouches_count || 0}`, icon: '🤝',
              note: result.vouches_count >= 2 ? 'Community verified' : 'Limited social proof' },
            { label: 'Residency Type', value: result.residency_type || 'Owner', icon: '🏗️', note: '' },
            { label: 'Country', value: result.country || '—', icon: '🌍', note: '' },
          ].map(({ label, value, icon, note }) => (
            <div key={label} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <span className="text-base w-6 text-center">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-white font-medium">{value}</p>
                {note && <p className="text-xs text-slate-600">{note}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Location Data */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Location Data</p>

          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">H3 Hex Index</p>
              <button onClick={() => handleCopy(result.h3_index)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-white font-mono break-all">{result.h3_index}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={result.google_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all">
              <ExternalLink className="w-3 h-3" /> Google Maps
            </a>
            <a href={result.apple_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 text-xs font-medium hover:text-white transition-all">
              <ExternalLink className="w-3 h-3" /> Apple Maps
            </a>
          </div>

          {result.last_checkin && (
            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <p className="text-xs text-slate-500">Last Check-in</p>
              <p className="text-sm text-white">{new Date(result.last_checkin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          )}
        </div>
      </div>

      {/* Last-mile blueprint */}
      {landmarks.length > 0 && (
        <div className="px-6 pb-6">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Last-Mile Delivery Blueprint</p>
              <span className="ml-auto text-xs text-slate-600">{landmarks.length} anchor{landmarks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {landmarks.map((lm, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/60">
                  <span className="text-base mt-0.5">
                    {lm.landmark_type === 'Kiosk' ? '🏪' : lm.landmark_type === 'School' ? '🏫' :
                     lm.landmark_type === 'Church/Mosque' ? '🕌' : lm.landmark_type === 'Market' ? '🛒' :
                     lm.landmark_type === 'Petrol Station' ? '⛽' : '📍'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{lm.ai_normalized || lm.description_text}</p>
                    <p className="text-xs text-slate-500">{lm.direction} of {lm.landmark_type}{lm.distance_meters ? ` · ~${lm.distance_meters}m` : ''}</p>
                    {lm.is_primary && <span className="text-xs text-blue-400">Primary anchor</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Decision footer */}
      <div className="px-6 pb-6">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/40">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">KYC Decision Support</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Address Proof', pass: (result.persistence_nights || 0) >= 1 },
              { label: 'Residency Confirmed', pass: (result.persistence_nights || 0) >= 3 },
              { label: 'Community Verified', pass: (result.vouches_count || 0) >= 1 },
            ].map(({ label, pass }) => (
              <div key={label} className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                pass ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/40 border-slate-700/30'
              }`}>
                {pass
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  : <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />}
                <span className={`text-xs font-medium ${pass ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BusinessDashboard({ lang }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copied, setCopied] = useState('');
  const [stats, setStats] = useState({ total: 0, verified: 0, residents: 0, permanent: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [orgName, setOrgName] = useState('Your Organization');

  const DEMO_API_KEY = 'vs_live_sk_ug_7f3a9b2c1e4d8f6a0b5c3d7e2f1a9b4c';

  useEffect(() => {
    loadStats();
    loadHistory();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    const { data } = await supabase.from('sentinel_addresses').select('status');
    if (data) {
      setStats({
        total: data.length,
        verified: data.filter(a => a.status !== 'Visitor').length,
        residents: data.filter(a => a.status === 'Resident').length,
        permanent: data.filter(a => a.status === 'Sentinel Permanent').length,
      });
    }
    setLoadingStats(false);
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('vs_search_history');
    if (saved) {
      try { setSearchHistory(JSON.parse(saved)); } catch {}
    }
  };

  const handleSearch = async () => {
    const cleaned = query.trim().toUpperCase();
    if (!cleaned) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    setLandmarks([]);

    const { data: records } = await supabase
      .from('sentinel_addresses')
      .select('*')
      .eq('sentinel_id', cleaned)
      .limit(1);

    if (!records?.length) {
      setNotFound(true);
    } else {
      const addr = records[0];
      setResult(addr);

      const { data: lms } = await supabase
        .from('landmark_descriptions')
        .select('*')
        .eq('h3_index', addr.h3_index);
      setLandmarks(lms || []);

      const entry = { id: cleaned, status: addr.status, score: addr.trust_score, time: new Date().toISOString() };
      const newHistory = [entry, ...searchHistory.filter(h => h.id !== cleaned)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('vs_search_history', JSON.stringify(newHistory));
    }
    setSearching(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleInput = (e) => {
    let val = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (val.length > 15) val = val.slice(0, 15);
    const parts = [val.slice(0,4), val.slice(4,8), val.slice(8,12), val.slice(12,15)].filter(Boolean);
    setQuery(parts.join('-'));
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.04} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Enterprise Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold text-white">KYC Verification Console</h1>
            <p className="text-slate-500 text-sm mt-0.5">Powered by Verify Sentinel — TEGU Systems</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">API Connected</span>
            </div>
            <button onClick={loadStats} className="p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total IDs on Network', value: loadingStats ? '—' : stats.total.toLocaleString(), icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'Verified Residents', value: loadingStats ? '—' : stats.verified.toLocaleString(), icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Sentinel Permanent', value: loadingStats ? '—' : stats.permanent.toLocaleString(), icon: Shield, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { label: 'Lookups This Session', value: searchHistory.length.toString(), icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`p-4 rounded-xl border ${border} ${bg}`}
              style={{ background: 'rgba(10,15,30,0.8)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-start justify-between mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Main Search */}
        <div className="rounded-2xl border border-slate-800/60 overflow-hidden"
          style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(20px)' }}>

          <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-3">
            <Search className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Identity Verification Search</span>
            <span className="ml-auto text-xs text-slate-600 font-mono">Enter Sentinel ID to verify</span>
          </div>

          <div className="p-6">
            <div className="flex gap-3 mb-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX-XXXX-XXX"
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white text-base outline-none focus:border-blue-500/60 placeholder-slate-600 font-mono tracking-widest"
                  maxLength={19}
                />
                <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 font-mono">{query.replace(/-/g,'').length}/15</span>
                </div>
              </div>
              <button onClick={handleSearch} disabled={searching || query.length < 4}
                className="px-8 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                {searching
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                  : <><Zap className="w-4 h-4" /> Verify</>}
              </button>
            </div>
            <p className="text-xs text-slate-600 font-mono">Format: XXXX-XXXX-XXXX-XXX</p>
          </div>

          {notFound && (
            <div className="px-6 pb-6">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Sentinel ID Not Found</p>
                  <p className="text-xs text-slate-500 mt-0.5">No verified address found for this ID. The customer may not have registered yet.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verification Result */}
        {result && (
          <VerificationCard
            result={result}
            landmarks={landmarks}
            onClose={() => { setResult(null); setLandmarks([]); setQuery(''); }}
          />
        )}

        {/* Bottom grid: History + API */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Search History */}
          <div className="rounded-2xl border border-slate-800/60 overflow-hidden"
            style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(20px)' }}>
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-white">Recent Lookups</span>
              <span className="ml-auto text-xs text-slate-600">{searchHistory.length} this session</span>
            </div>
            <div className="divide-y divide-slate-800/40">
              {searchHistory.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Search className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No lookups yet this session.</p>
                  <p className="text-xs text-slate-700 mt-1">Search a Sentinel ID above to begin.</p>
                </div>
              ) : (
                searchHistory.map((h) => (
                  <button key={h.id} onClick={() => { setQuery(h.id); }}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors text-left">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      h.status === 'Sentinel Permanent' ? 'bg-emerald-400'
                      : h.status === 'Resident' ? 'bg-blue-400' : 'bg-amber-400'
                    }`} />
                    <span className="text-sm font-mono text-white flex-1">{h.id}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-600">{new Date(h.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`text-xs font-bold font-mono ${
                        h.score >= 70 ? 'text-emerald-400' : h.score >= 50 ? 'text-blue-400' : 'text-amber-400'
                      }`}>{h.score}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            {searchHistory.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-800/40">
                <button onClick={() => { setSearchHistory([]); localStorage.removeItem('vs_search_history'); }}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Clear session history
                </button>
              </div>
            )}
          </div>

          {/* API Access */}
          <div className="rounded-2xl border border-slate-800/60 overflow-hidden"
            style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(20px)' }}>
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-white">API Integration</span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">Pro Plan</span>
            </div>
            <div className="p-5 space-y-4">

              {/* API Key */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Live API Key</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <code className="text-xs text-slate-300 flex-1 font-mono truncate">
                    {apiKeyVisible ? DEMO_API_KEY : DEMO_API_KEY.replace(/vs_live_sk_ug_(.+)/, 'vs_live_sk_ug_' + '•'.repeat(32))}
                  </code>
                  <button onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                    {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleCopy(DEMO_API_KEY, 'apikey')}
                    className="text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0">
                    {copied === 'apikey' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick integration example */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Quick Integration</p>
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800/60">
                  <pre className="text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`GET /v1/verify/{sentinel_id}
Authorization: Bearer vs_live_sk_ug_...

{
  "sentinel_id": "XXXX-XXXX-XXXX-XXX",
  "trust_score": 82,
  "status": "Resident",
  "risk_level": "LOW",
  "last_mile_blueprint": [...],
  "google_maps_link": "https://..."
}`}
                  </pre>
                </div>
              </div>

              {/* Plan details */}
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 space-y-2">
                <p className="text-xs text-blue-400 font-semibold">Current Plan: Pro</p>
                {[
                  '10,000 API calls / month included',
                  '$0.25 per call after limit',
                  'SLA: 99.9% uptime guaranteed',
                  'Priority support via email',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-slate-400">{item}</span>
                  </div>
                ))}
              </div>

              <a href="https://tegusystems.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition-all">
                <FileText className="w-3.5 h-3.5" /> View API Documentation
              </a>
            </div>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="p-4 rounded-xl border border-slate-800/40 flex items-start gap-3"
          style={{ background: 'rgba(10,15,30,0.6)' }}>
          <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-semibold">Data Protection: </span>
              Verify Sentinel does not store or transmit National ID numbers through this dashboard. All verification queries are logged for your compliance audit trail. Data is processed in accordance with Uganda's Data Protection and Privacy Act 2019 and equivalent legislation in supported territories.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
