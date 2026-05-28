import { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle, Loader2, Heart } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import SentinelQRDisplay from './SentinelQRDisplay';
import QRVouchScanner from './QRVouchScanner';

export default function VouchingSystem({ addressId, sentinelId, h3Index, vouchCount, onVouchAdded }) {
  const [vouches, setVouches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ target_sentinel_id: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { loadVouches(); }, [addressId]);

  const loadVouches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vouches')
      .select('*')
      .eq('target_address_id', addressId)
      .order('created_at', { ascending: false })
      .limit(10);
    setVouches(data || []);
    setLoading(false);
  };

  const handleVouchNeighbor = async () => {
    if (!form.target_sentinel_id.trim()) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: targets } = await supabase
      .from('sentinel_addresses')
      .select('*')
      .eq('sentinel_id', form.target_sentinel_id.trim())
      .limit(1);

    if (!targets?.length) {
      setSubmitting(false);
      alert('Sentinel ID not found. Check the ID and try again.');
      return;
    }
    const target = targets[0];

    await supabase.from('vouches').insert({
      voucher_id: user.id,
      voucher_email: user.email,
      target_sentinel_id: form.target_sentinel_id,
      target_h3_index: target.h3_index,
      target_address_id: target.id,
      message: form.message,
      status: 'Confirmed',
    });

    const newVouches = (target.vouches_count || 0) + 1;
    const newScore = Math.min(100, (target.trust_score || 30) + 5);

    await supabase
      .from('sentinel_addresses')
      .update({ vouches_count: newVouches, trust_score: newScore })
      .eq('id', target.id);

    await supabase.from('trust_score_history').insert({
      sentinel_address_id: target.id,
      user_id: target.user_id,
      user_email: target.user_email,
      score: newScore,
      event: 'vouch_received',
      notes: `Vouched by ${user.email}`,
    });

    setDone(true);
    setSubmitting(false);
    setTimeout(() => {
      setDone(false);
      setShowForm(false);
      setForm({ target_sentinel_id: '', message: '' });
    }, 2500);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-semibold text-white">Vouching System</h3>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <Heart className="w-3 h-3 text-green-400" />
          <span className="text-xs text-green-400 font-bold">{vouchCount} vouch{vouchCount !== 1 ? 'es' : ''} received</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Each vouch from a neighbor adds <span className="text-green-400 font-semibold">+5 trust points</span> to their address (max 20pts from vouching).
        Vouch for a neighbor by entering their Sentinel ID.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 mb-4">
        <SentinelQRDisplay sentinelId={sentinelId} size={120} />
        <div>
          <p className="text-xs font-semibold text-white mb-1">Your QR Code</p>
          <p className="text-xs text-slate-500">Show this to a Resident-tier neighbor so they can scan and vouch for you instantly.</p>
          <p className="text-xs font-mono text-slate-600 mt-2">{sentinelId}</p>
        </div>
      </div>

      <QRVouchScanner onVouchComplete={onVouchAdded} />

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-green-400 animate-spin" /></div>
      ) : vouches.length > 0 ? (
        <div className="space-y-2 mb-4">
          {vouches.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-slate-700/30">
              <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <Heart className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 font-medium truncate">{v.voucher_name || v.voucher_email}</p>
                {v.message && <p className="text-xs text-slate-600 truncate">"{v.message}"</p>}
              </div>
              <span className="text-xs text-green-400 font-mono">+5pts</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/20 text-center mb-4">
          <p className="text-xs text-slate-600">No vouches yet. Share your Sentinel ID with neighbors to get vouched.</p>
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all">
          <Plus className="w-4 h-4" /> Vouch for a Neighbor
        </button>
      ) : (
        <div className="space-y-3 p-4 rounded-xl bg-slate-900/50 border border-green-500/20">
          <p className="text-xs text-slate-400 font-semibold">Enter your neighbor's Sentinel ID to vouch for them:</p>
          <input type="text" placeholder="e.g. 8921-F3A2-B100-9E7"
            value={form.target_sentinel_id}
            onChange={e => setForm(p => ({ ...p, target_sentinel_id: e.target.value }))}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/60 placeholder-slate-600 font-mono" />
          <input type="text" placeholder="Optional: 'I know this person lives here'"
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/60 placeholder-slate-600" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl border border-slate-700/50 text-slate-500 text-sm hover:text-slate-300 transition-all">
              Cancel
            </button>
            <button onClick={handleVouchNeighbor} disabled={!form.target_sentinel_id || submitting}
              className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {done ? <><CheckCircle className="w-4 h-4" /> Vouched!</> : submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Confirm Vouch'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
