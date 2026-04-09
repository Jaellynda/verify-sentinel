import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Search, Shield, CheckCircle, Clock, AlertCircle, ExternalLink, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getHexBoundary, getHexNeighbors } from '../lib/h3core';
import { translate } from '../lib/i18n';
import HexBackground from '../components/HexBackground';
import TrustArc from '../components/TrustArc';

/**
 * VERIFICATION SHIELD component.
 * Displays a pulsing shield with verification status.
 */
function VerificationShield({ status, score }) {
  const isVerified = status === 'Verified';
  const isPartial = status === 'Partial';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings */}
      {isVerified && (
        <>
          <div className="absolute w-32 h-32 rounded-full border border-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-24 h-24 rounded-full border border-emerald-500/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        </>
      )}
      {/* Shield */}
      <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center border-2 transition-all ${
        isVerified
          ? 'bg-emerald-500/20 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.4)]'
          : isPartial
          ? 'bg-blue-500/20 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
          : 'bg-amber-500/15 border-amber-500/30'
      }`}>
        <Shield className={`w-10 h-10 ${isVerified ? 'text-emerald-400' : isPartial ? 'text-blue-400' : 'text-amber-400'}`} />
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

export default function Verify({ lang = 'en' }) {
  const tr = (key) => translate(lang, key);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleVerify = async () => {
    const cleaned = query.trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setLandmarks([]);

    const records = await base44.entities.SentinelAddress.filter({ sentinel_id: cleaned });

    if (records.length === 0) {
      setNotFound(true);
    } else {
      const addr = records[0];
      setResult(addr);
      const lms = await base44.entities.LandmarkDescription.filter({ h3_index: addr.h3_index });
      setLandmarks(lms);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify();
  };

  // Auto-format input as user types: XXXX-XXXX-XXXX-XXX
  const handleInput = (e) => {
    let val = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (val.length > 15) val = val.slice(0, 15);
    const parts = [val.slice(0,4), val.slice(4,8), val.slice(8,12), val.slice(12,15)].filter(Boolean);
    setQuery(parts.join('-'));
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.08} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium uppercase tracking-widest mb-4">
            <Zap className="w-3 h-3" />
            Business & Delivery
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{tr('verify_title')}</h1>
          <p className="text-slate-500 text-sm">{tr('verify_sub')}</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent rounded-t-2xl" />
          <div className="flex gap-3 p-4 rounded-2xl border border-blue-900/40"
            style={{ background: 'rgba(13,31,60,0.9)', backdropFilter: 'blur(20px)' }}>
            <input
              type="text"
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={tr('verify_placeholder')}
              className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-base tracking-widest"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
              maxLength={19}
            />
            <button onClick={handleVerify} disabled={loading || query.length < 4}
              className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              {tr('verify_search')}
            </button>
          </div>
          {/* Format hint */}
          <p className="text-xs text-slate-700 text-center mt-2 font-mono">Format: XXXX-XXXX-XXXX-XXX</p>
        </div>

        {/* Not Found */}
        {notFound && (
          <div className="p-6 rounded-2xl border border-red-900/30 bg-red-900/10 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-white font-semibold">{tr('verify_not_found')}</p>
            <p className="text-slate-500 text-sm mt-1">No Sentinel Address found for this ID. Check the format and try again.</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-5">
            {/* Verification Shield */}
            <div className="p-8 rounded-3xl border text-center"
              style={{
                background: 'rgba(13,31,60,0.9)',
                backdropFilter: 'blur(20px)',
                borderColor: result.status === 'Verified' ? 'rgba(16,185,129,0.3)' : result.status === 'Partial' ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)',
              }}>
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
                style={{ background: result.status === 'Verified' ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)' : 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }} />

              <VerificationShield status={result.status} score={result.trust_score} />

              <div className="mt-5 mb-3">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                  result.status === 'Verified'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : result.status === 'Partial'
                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                  {result.status === 'Verified' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {result.status === 'Verified' ? tr('verify_verified') : result.status === 'Partial' ? 'PARTIAL VERIFICATION' : tr('verify_pending')}
                </div>
              </div>

              <p
                className="text-xl font-bold text-white tracking-widest mb-1 cursor-pointer transition-all"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
              >
                {hovering
                  ? Array.from(result.sentinel_id).map((c, i) =>
                      c === '-' ? '-' : String.fromCharCode(48 + Math.floor(Math.random() * 22))
                    ).join('')
                  : result.sentinel_id}
              </p>
              <p className="text-xs text-slate-600 font-mono mb-4">{result.h3_index}</p>

              {/* Trust Arc */}
              <TrustArc score={result.trust_score || 30} nights={result.persistence_nights || 0} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Country', value: result.country || '—' },
                { label: 'Persistence Nights', value: `${result.persistence_nights || 0}/3` },
                { label: 'Vouches', value: result.vouches_count || 0 },
                { label: 'Last Verified', value: result.last_checkin ? new Date(result.last_checkin).toLocaleDateString() : 'Not yet' },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-2xl border border-slate-700/30 bg-slate-900/40">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-white font-semibold font-mono">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Last-Mile Blueprint: Physical Anchors */}
            {landmarks.length > 0 && (
              <div className="p-6 rounded-3xl border border-blue-900/40"
                style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
                <h3 className="text-sm font-semibold text-white mb-1">{tr('verify_blueprint')}</h3>
                <p className="text-xs text-slate-500 mb-4">Physical anchors for last-mile navigation</p>
                <div className="space-y-3">
                  {landmarks.map((lm, i) => (
                    <div key={lm.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-lg flex-shrink-0">
                        {LANDMARK_ICONS[lm.landmark_type] || '📍'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-blue-400 uppercase">{lm.landmark_type}</span>
                          <span className="text-xs text-slate-600">·</span>
                          <span className="text-xs text-slate-500">{lm.direction}</span>
                          {lm.distance_meters && <span className="text-xs text-slate-600">· ~{lm.distance_meters}m</span>}
                        </div>
                        <p className="text-sm text-slate-300">{lm.ai_normalized || lm.description_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deep Link */}
            <a href={result.google_maps_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-400 font-medium text-sm hover:bg-green-500/20 transition-all">
              <ExternalLink className="w-4 h-4" /> Open in Google Maps
            </a>
          </div>
        )}

        {/* Empty state with instructions */}
        {!result && !notFound && !loading && (
          <div className="p-8 rounded-3xl border border-slate-800/60 text-center"
            style={{ background: 'rgba(13,31,60,0.5)', backdropFilter: 'blur(10px)' }}>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Enter a Sentinel ID above to verify a client's location identity.</p>
            <div className="mt-4 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 text-left">
              <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Use Cases</p>
              {['Bank KYC verification', 'Delivery driver last-mile routing', 'Loan collateral address proof', 'Insurance location confirmation'].map(u => (
                <div key={u} className="flex items-center gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                  <span className="text-xs text-slate-500">{u}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}