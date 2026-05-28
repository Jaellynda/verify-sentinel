import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/api/base44Client';
import { Shield, Users, CheckCircle, MapPin, RefreshCw, Wifi, MessageSquare, TrendingUp } from 'lucide-react';
import HexBackground from '../components/HexBackground';

const TIER_COLORS = { 'Visitor': '#f59e0b', 'Resident': '#3b82f6', 'Sentinel Permanent': '#4ade80' };
const COUNTRY_COLORS = ['#4ade80', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

export default function AdminAnalytics({ lang }) {
  const [addresses, setAddresses] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') { setLoading(false); return; }
      setIsAdmin(true);

      const [{ data: addrs }, { data: tkts }, { data: hist }] = await Promise.all([
        supabase.from('sentinel_addresses').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('trust_score_history').select('*').order('created_at', { ascending: false }).limit(500),
      ]);

      setAddresses(addrs || []);
      setTickets(tkts || []);
      setHistory(hist || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060606' }}>
      <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060606' }}>
      <div className="text-center">
        <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
        <h2 className="text-white font-bold mb-1">Admin Access Only</h2>
        <p className="text-slate-500 text-sm">This page is restricted to administrators.</p>
      </div>
    </div>
  );

  const totalIDs = addresses.length;
  const tierCounts = ['Visitor', 'Resident', 'Sentinel Permanent'].map(t => ({
    name: t, value: addresses.filter(a => a.status === t).length,
  }));
  const countryCounts = Object.entries(
    addresses.reduce((acc, a) => { acc[a.country || 'Other'] = (acc[a.country || 'Other'] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const now = Date.now();
  const dailyCheckins = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    const count = history.filter(h => {
      const hd = new Date(h.created_at);
      return hd.toDateString() === d.toDateString() && h.event === 'checkin';
    }).length;
    return { label, count };
  });

  const openTickets = tickets.filter(t => t.status === 'Open').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length;
  const ticketsBySubject = Object.entries(
    tickets.reduce((acc, t) => { acc[t.subject] = (acc[t.subject] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const statCards = [
    { label: 'Total Sentinel IDs', value: totalIDs, icon: Shield, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Sentinel Permanent', value: tierCounts.find(t => t.name === 'Sentinel Permanent')?.value || 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Open Support Tickets', value: openTickets, icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: "Today's Check-ins", value: dailyCheckins[6]?.count || 0, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060606' }}>
      <HexBackground opacity={0.05} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Verify Sentinel — Platform Intelligence Dashboard</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`p-5 rounded-2xl border ${border} ${bg}`}
              style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-start justify-between mb-3">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }}>
            <h3 className="text-sm font-semibold text-white mb-5">Residency Tier Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tierCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {tierCounts.map((entry, i) => <Cell key={i} fill={TIER_COLORS[entry.name]} fillOpacity={0.85} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]}
                  contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }} />
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }}>
            <h3 className="text-sm font-semibold text-white mb-5">Daily Check-ins (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyCheckins} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#4ade80' }} />
                <Line type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={2}
                  dot={{ fill: '#4ade80', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#4ade80', r: 5, filter: 'drop-shadow(0 0 4px #4ade80)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }}>
            <h3 className="text-sm font-semibold text-white mb-5">Geographic Distribution</h3>
            {countryCounts.length > 0 ? (
              <div className="space-y-3">
                {countryCounts.map(({ name, value }, i) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{name}</span>
                      <span className="font-mono" style={{ color: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}>{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((value / totalIDs) * 100)}%`, background: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-600 text-sm text-center py-8">No geographic data yet.</p>}
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }}>
            <h3 className="text-sm font-semibold text-white mb-2">Support Tickets</h3>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-lg font-bold text-amber-400 font-mono">{openTickets}</p>
                <p className="text-xs text-slate-600">Open</p>
              </div>
              <div className="flex-1 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-lg font-bold text-green-400 font-mono">{resolvedTickets}</p>
                <p className="text-xs text-slate-600">Resolved</p>
              </div>
            </div>
            <div className="space-y-2">
              {ticketsBySubject.slice(0, 4).map(({ name, value }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 flex-1 truncate">{name}</span>
                  <span className="text-xs font-mono text-green-400">{value}</span>
                </div>
              ))}
              {ticketsBySubject.length === 0 && <p className="text-xs text-slate-600 text-center py-4">No tickets yet.</p>}
            </div>
            {tickets.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/60">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">Recent</p>
                {tickets.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-start gap-2 py-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                      t.status === 'Open' ? 'bg-amber-400' : t.status === 'Resolved' ? 'bg-green-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-xs text-slate-300">{t.subject}</p>
                      <p className="text-xs text-slate-600 truncate">{t.user_email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
