import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { base44 } from '@/api/base44Client';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl border border-green-500/20 text-xs"
      style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)' }}>
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-green-400 font-bold">Score: {payload[0].value}</p>
      {payload[0].payload.event && (
        <p className="text-slate-500 capitalize">{payload[0].payload.event.replace('_', ' ')}</p>
      )}
    </div>
  );
};

export default function TrustScoreGraph({ addressId, userEmail, currentScore }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!addressId || !userEmail) return;
    (async () => {
      setLoading(true);
      const records = await base44.entities.TrustScoreHistory.filter(
        { sentinel_address_id: addressId },
        'created_date', 20
      );
      // Synthetic seed if no history yet
      if (records.length === 0) {
        setHistory([{ label: 'Start', score: 30, event: 'initial' }]);
      } else {
        const formatted = records.map((r, i) => ({
          label: new Date(r.created_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
          score: r.score,
          event: r.event,
        }));
        setHistory(formatted);
      }
      setLoading(false);
    })();
  }, [addressId, userEmail]);

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-semibold text-white">Trust Score History</h3>
        <span className="ml-auto text-xs text-green-400 font-mono font-bold">{currentScore}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="rgba(74,222,128,0.15)" strokeDasharray="4 4" />
          <Line
            type="monotone" dataKey="score"
            stroke="#4ade80" strokeWidth={2}
            dot={{ fill: '#4ade80', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: '#4ade80', r: 5, strokeWidth: 0, filter: 'drop-shadow(0 0 6px #4ade80)' }}
          />
        </LineChart>
      </ResponsiveContainer>
      {history.length <= 1 && (
        <p className="text-xs text-slate-600 text-center mt-1">Check in more nights to build your history graph.</p>
      )}
    </div>
  );
}