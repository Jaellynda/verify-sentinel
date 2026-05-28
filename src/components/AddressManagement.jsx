import { useState, useEffect } from 'react';
import { History, MapPin, ArrowRight, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const TIER_ICON = { Visitor: '👤', Resident: '🏠', 'Sentinel Permanent': '🛡️', Pending: '⏳' };
const REASON_OPTIONS = ['Relocated', 'Evicted', 'Property Sold', 'Seasonal Move', 'Other'];

function AddressHistoryCard({ record }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-3 rounded-xl border border-slate-700/40 bg-slate-900/40">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 text-left">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">
          {TIER_ICON[record.status_at_deprecation] || '📍'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-slate-300 truncate">{record.sentinel_id}</p>
          <p className="text-xs text-slate-500">{record.country} · {record.reason} · {new Date(record.deprecated_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-green-400 font-mono font-bold">{record.trust_score_at_deprecation}</span>
          {open ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
        </div>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-3 gap-2">
          {[
            { label: 'Trust Score', value: record.trust_score_at_deprecation },
            { label: 'Vouches', value: record.vouches_at_deprecation },
            { label: 'Check-ins', value: record.nights_at_deprecation },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-base font-bold text-green-400 font-mono">{value ?? '—'}</p>
              <p className="text-xs text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddressManagement({ address, onDeprecated }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showDeprecate, setShowDeprecate] = useState(false);
  const [reason, setReason] = useState('Relocated');
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deprecating, setDeprecating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('address_history')
        .select('*')
        .eq('user_id', user.id)
        .order('deprecated_at', { ascending: false })
        .limit(20);
      setHistory(data || []);
      setLoadingHistory(false);
    })();
  }, [address.user_email]);

  const handleDeprecate = async () => {
    if (confirmText !== 'MOVE') return;
    setDeprecating(true);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('address_history').insert({
      user_id: user?.id,
      user_email: address.user_email,
      sentinel_address_id: address.id,
      sentinel_id: address.sentinel_id,
      h3_index: address.h3_index,
      country: address.country,
      region: address.region,
      trust_score_at_deprecation: address.trust_score,
      vouches_at_deprecation: address.vouches_count,
      nights_at_deprecation: address.persistence_nights,
      status_at_deprecation: address.status,
      reason,
      deprecated_at: new Date().toISOString(),
    });

    await supabase
      .from('sentinel_addresses')
      .update({ status: 'Deprecated' })
      .eq('id', address.id);

    setDeprecating(false);
    if (onDeprecated) onDeprecated();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">Address History</h3>
          <span className="text-xs text-slate-600 ml-auto">{history.length} previous address{history.length !== 1 ? 'es' : ''}</span>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/20 text-center">
            <p className="text-xs text-slate-600">No previous addresses on record. Your address history will appear here when you move.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(r => <AddressHistoryCard key={r.id} record={r} />)}
          </div>
        )}
      </div>

      {address.status !== 'Deprecated' && (
        <div>
          {!showDeprecate ? (
            <button onClick={() => setShowDeprecate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm font-medium hover:bg-amber-500/10 transition-all">
              <ArrowRight className="w-4 h-4" /> I'm Moving — Deprecate This Address
            </button>
          ) : !confirming ? (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-400">Deprecate This Address</p>
                  <p className="text-xs text-slate-400 mt-0.5">This will archive your current address and its trust history. You can then generate a new Sentinel ID at your new location.</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Reason for Moving</label>
                <select value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/40 appearance-none cursor-pointer">
                  {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDeprecate(false)} className="flex-1 py-2 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-all">Cancel</button>
                <button onClick={() => setConfirming(true)} className="flex-1 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition-all">
                  Continue →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
              <p className="text-sm font-semibold text-red-400">⚠ Confirm Address Deprecation</p>
              <p className="text-xs text-slate-400">Type <span className="font-mono font-bold text-white">MOVE</span> to confirm. Your trust score and history will be archived — not deleted.</p>
              <input type="text" placeholder="Type MOVE to confirm"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-red-500/40 placeholder-slate-600 font-mono" />
              <div className="flex gap-2">
                <button onClick={() => { setConfirming(false); setConfirmText(''); }}
                  className="flex-1 py-2 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-all">Cancel</button>
                <button onClick={handleDeprecate} disabled={confirmText !== 'MOVE' || deprecating}
                  className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all">
                  {deprecating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Archiving...</> : 'Confirm & Archive'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {address.status === 'Deprecated' && (
        <div className="p-3 rounded-xl border border-slate-700/40 bg-slate-900/40 text-center">
          <p className="text-xs text-slate-500">This address has been deprecated. <a href="/get-id" className="text-green-400 hover:underline">Generate a new Sentinel ID →</a></p>
        </div>
      )}
    </div>
  );
}
