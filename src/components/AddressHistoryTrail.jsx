import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const REASON_COLORS = {
  Relocated:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Evicted:        'text-red-400 bg-red-500/10 border-red-500/20',
  'Property Sold':'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Seasonal Move':'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Other:          'text-slate-400 bg-slate-700/20 border-slate-600/20',
};

const TIER_ICON = {
  'Visitor': '👤', 'Resident': '🏠',
  'Sentinel Permanent': '🛡️', 'Deprecated': '📦',
};

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-slate-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold font-mono ${score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-slate-500'}`}>
        {score}
      </span>
    </div>
  );
}

function HistoryRow({ record, index }) {
  const [open, setOpen] = useState(false);
  const reasonClass = REASON_COLORS[record.reason] || REASON_COLORS.Other;
  return (
    <div className="relative">
      {index > 0 && <div className="absolute left-[18px] -top-3 w-px h-3 bg-slate-700/60" />}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-all">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-base flex-shrink-0">
            {TIER_ICON[record.status_at_deprecation] || '📍'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-white truncate">{record.sentinel_id}</p>
            <p className="text-xs text-slate-500 mt-0.5">{record.region || record.country} · {new Date(record.deprecated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${reasonClass} font-medium`}>{record.reason}</span>
            {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t border-slate-800/60 pt-3 space-y-3">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Trust Score at Deprecation</p>
              <ScoreBar score={record.trust_score_at_deprecation ?? 0} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Check-ins', value: record.nights_at_deprecation ?? '—', icon: '🌙' },
                { label: 'Vouches',   value: record.vouches_at_deprecation ?? '—', icon: '🤝' },
                { label: 'Status',   value: record.status_at_deprecation ?? '—',   icon: '🏷️' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                  <p className="text-sm mb-0.5">{icon}</p>
                  <p className="text-xs font-bold text-white font-mono">{value}</p>
                  <p className="text-xs text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/5 border border-green-500/10">
              <Info className="w-3 h-3 text-green-500/60 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This address record is <span className="text-slate-400 font-medium">permanently archived</span>. Banks can verify your residency history including trust score earned while living here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddressHistoryTrail({ userEmail, currentScore }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('address_history')
        .select('*')
        .eq('user_id', user.id)
        .order('deprecated_at', { ascending: false })
        .limit(20);
      setHistory(data || []);
      setLoading(false);
    })();
  }, [userEmail]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-semibold text-white">Address History Trail</h3>
        <span className="ml-auto text-xs text-slate-600">{history.length} previous {history.length === 1 ? 'address' : 'addresses'}</span>
      </div>
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 mb-4">
        <Info className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-amber-400/80 font-medium">Why does my score reset?</span> Each address builds its own trust score from scratch — this prevents score "portability" fraud. Your previous scores are permanently on record for banks to audit.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-4 h-4 border-2 border-slate-700 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="py-5 text-center rounded-xl border border-slate-800/40 bg-slate-900/20">
          <p className="text-xs text-slate-600">No previous addresses on record.</p>
          <p className="text-xs text-slate-700 mt-1">When you move and deprecate this address, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((r, i) => <HistoryRow key={r.id} record={r} index={i} />)}
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-green-500/20 bg-green-500/5">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-green-400 font-medium">Current Active Address</p>
          <p className="text-xs text-slate-600">Trust score: <span className="text-green-400 font-mono font-bold">{currentScore}</span> — actively building</p>
        </div>
      </div>
    </div>
  );
}
