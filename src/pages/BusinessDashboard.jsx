import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { supabase } from '@/api/base44Client';
import {
  Shield, Users, TrendingUp, MapPin, RefreshCw, CheckCircle,
  Star, Layers, Activity, Globe,
} from 'lucide-react';
import HexBackground from '../components/HexBackground';

const TIER_COLORS = { 'Visitor': '#f59e0b', 'Resident': '#3b82f6', 'Sentinel Permanent': '#4ade80' };
const COUNTRY_COLORS = { Uganda: '#4ade80', Kenya: '#3b82f6', Rwanda: '#a855f7', DRC: '#f59e0b', Other: '#64748b' };
const COUNTRIES = ['Uganda', 'Kenya', 'Rwanda', 'DRC', 'Other'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl border border-slate-700/50 text-xs" style={{ background: '#0f0f0f' }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
};

function StatCard({ label, value, icon: IconComp, color, trend }) {
  const Icon = IconComp;
  return (
    <div className="p-5 rounded-2xl border border-slate-800/60"
      style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        {trend != null && (
          <span className={`text-xs font-mono ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function BusinessDashboard({ lang }) {
  const [addresses, setAddresses] = useState([]);
  const [history, setHistory] = useState([]);
  const [vouches, setVouches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCountry, setActiveCountry] = useState('All');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: addrs }, { data: hist }, { data: vs }] = await Promise.all([
      supabase.from('sentinel_addresses').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('trust_score_history').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('vouches').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    setAddresses(addrs || []);
    setHistory(hist || []);
    setVouches(vs || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060606' }}>
      <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
    </div>
  );

  const filtered = activeCountry === 'All' ? addresses : addresses.filter(a => a.country === activeCountry);
  const totalIDs = filtered.length;
  const permanentCount = filtered.filter(a => a.status === 'Sentinel Permanent').length;
  const residentCount = filtered.filter(a => a.status === 'Resident').length;
  const avgTrust = filtered.length
    ? Math.round(filtered.reduce((s, a) => s + (a.trust_score || 30), 0) / filtered.length) : 0;
  const verificationRate = totalIDs ? Math.round(((residentCount + permanentCount) / totalIDs) * 100) : 0;

  const tierData = ['Visitor', 'Resident', 'Sentinel Permanent'].map(t => ({
    name: t === 'Sentinel Permanent' ? 'Permanent' : t,
    value: filtered.filter(a => a.status === t).length,
  }));

  const countryData = COUNTRIES.map(c => ({
    country: c,
    total: addresses.filter(a => a.country === c).length,
    verified: addresses.filter(a => a.country === c && (a.status === 'Resident' || a.status === 'Sentinel Permanent')).length,
    permanent: addresses.filter(a => a.country === c && a.status === 'Sentinel Permanent').length,
  })).filter(d => d.total > 0);

  const trustBuckets = [
    { range: '0–30', min: 0, max: 30 },
    { range: '31–50', min: 31, max: 50 },
    { range: '51–70', min: 51, max: 70 },
    { range: '71–90', min: 71, max: 90 },
    { range: '91–100', min: 91, max: 100 },
  ].map(b => ({
    range: b.range,
    count: filtered.filter(a => (a.trust_score || 30) >= b.min && (a.trust_score || 30) <= b.max).length,
  }));

  const now = Date.now();
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
    const weekStart = now - (7 - i) * 7 * 86400000;
    const weekEnd = weekStart + 7 * 86400000;
    const label = new Date(weekStart).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    const newIDs = addresses.filter(a => {
      const d = new Date(a.created_at).getTime();
      return d >= weekStart && d < weekEnd;
    }).length;
    const vouchCount = vouches.filter(v => {
      const d = new Date(v.created_at).getTime();
      return d >= weekStart && d < weekEnd;
    }).length;
    return { week: label, 'New IDs': newIDs, Vouches: vouchCount };
  });

  const districtMap = {};
  filtered.forEach(a => {
    if (a.h3_index_res6) districtMap[a.h3_index_res6] = (districtMap[a.h3_index_res6] || 0) + 1;
  });
  const topDistricts = Object.entries(districtMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([hex, count]) => ({ hex: hex.slice(0, 8) + '…', count }));

  const avgTrustByCountry = COUNTRIES.map(c => {
    const group = addresses.filter(a => a.country === c);
    return {
      country: c,
      avgTrust: group.length ? Math.round(group.reduce((s, a) => s + (a.trust_score || 30), 0) / group.length) : 0,
      count: group.length,
    };
  }).filter(d => d.count > 0);

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060606' }}>
      <HexBackground opacity={0.04} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Business Intelligence</h1>
            <p className="text-slate-500 text-sm mt-0.5">Trust scores · Verification trends · Regional coverage across East Africa</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {['All', ...COUNTRIES].map(c => (
                <button key={c} onClick={() => setActiveCountry(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    activeCountry === c ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'border-slate-700/40 text-slate-500 hover:text-slate-300'
                  }`}>{c}</button>
              ))}
            </div>
            <button onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Sentinel IDs" value={totalIDs} icon={Shield} color="text-green-400" />
          <StatCard label="Verification Rate" value={`${verificationRate}%`} icon={CheckCircle} color="text-emerald-400" />
          <StatCard label="Avg Trust Score" value={avgTrust} icon={Star} color="text-amber-400" />
          <StatCard label="Sentinel Permanent" value={permanentCount} icon={Activity} color="text-blue-400" />
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2 p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Weekly Verification Trend</h3>
            <p className="text-xs text-slate-600 mb-5">New IDs registered vs vouches issued — last 8 weeks</p>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={weeklyTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="gNewIDs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gVouches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                <Area type="monotone" dataKey="New IDs" stroke="#4ade80" strokeWidth={2} fill="url(#gNewIDs)" dot={false} />
                <Area type="monotone" dataKey="Vouches" stroke="#3b82f6" strokeWidth={2} fill="url(#gVouches)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold text-white mb-5">Residency Tier Distribution</h3>
            <div className="space-y-4">
              {tierData.map((t) => {
                const pct = totalIDs ? Math.round((t.value / totalIDs) * 100) : 0;
                const fullName = t.name === 'Permanent' ? 'Sentinel Permanent' : t.name;
                const color = TIER_COLORS[fullName] || '#64748b';
                return (
                  <div key={t.name}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{t.name}</span>
                      <span className="font-mono" style={{ color }}>{t.value} <span className="text-slate-600">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}50` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col items-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#1e293b" strokeWidth="10" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#4ade80" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 38 * verificationRate / 100} ${2 * Math.PI * 38}`}
                    strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px #4ade80)' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-white font-mono">{verificationRate}%</span>
                  <span className="text-xs text-slate-600">verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Regional Coverage</h3>
            <p className="text-xs text-slate-600 mb-5">Total vs verified Sentinel IDs per country</p>
            {countryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={countryData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="country" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                  <Bar dataKey="total" name="Total" radius={[3, 3, 0, 0]}>
                    {countryData.map((d) => <Cell key={d.country} fill={COUNTRY_COLORS[d.country] || '#64748b'} fillOpacity={0.4} />)}
                  </Bar>
                  <Bar dataKey="verified" name="Verified" radius={[3, 3, 0, 0]}>
                    {countryData.map((d) => <Cell key={d.country} fill={COUNTRY_COLORS[d.country] || '#64748b'} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <Globe className="w-10 h-10 mb-2" />
                <p className="text-sm">No geographic data yet</p>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Trust Score Distribution</h3>
            <p className="text-xs text-slate-600 mb-5">How users are spread across trust bands</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trustBuckets} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Users" radius={[3, 3, 0, 0]}>
                  {trustBuckets.map((b, i) => {
                    const colors = ['#64748b', '#3b82f6', '#60a5fa', '#4ade80', '#22c55e'];
                    return <Cell key={b.range} fill={colors[i]} fillOpacity={0.85} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold text-white mb-5">Average Trust Score by Country</h3>
            <div className="space-y-3">
              {avgTrustByCountry.length > 0 ? avgTrustByCountry.map(({ country, avgTrust: avg, count }) => (
                <div key={country}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{country}</span>
                    <span className="font-mono" style={{ color: COUNTRY_COLORS[country] || '#64748b' }}>
                      {avg} pts <span className="text-slate-600">({count} IDs)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${avg}%`, background: COUNTRY_COLORS[country] || '#64748b' }} />
                  </div>
                </div>
              )) : <p className="text-slate-600 text-sm text-center py-6">No data yet</p>}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/60"
            style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Top Density Zones</h3>
            <p className="text-xs text-slate-600 mb-5">H3 district-level hexagon clusters with most registrations</p>
            {topDistricts.length > 0 ? (
              <div className="space-y-2">
                {topDistricts.map(({ hex, count }, i) => (
                  <div key={hex} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/20">
                    <span className="text-xs font-bold text-slate-600 w-5 text-right">#{i + 1}</span>
                    <span className="text-xs font-mono text-slate-400 flex-1">{hex}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1 rounded-full bg-green-500/20 overflow-hidden" style={{ width: 60 }}>
                        <div className="h-full rounded-full bg-green-500"
                          style={{ width: `${Math.round((count / (topDistricts[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-green-400">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <Layers className="w-10 h-10 mb-2" />
                <p className="text-sm">No zone data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
