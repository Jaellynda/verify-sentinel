import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/base44Client';
import {
  Search, Shield, CheckCircle, Clock, XCircle, MapPin, Copy,
  TrendingUp, Users, FileText, Key, Eye, EyeOff, Download,
  AlertTriangle, ChevronRight, Building2, Zap, Globe, Lock,
  BarChart2, RefreshCw, ExternalLink, Info, Bell, BellOff,
  Upload, UserPlus, Trash2, Plus, ChevronDown, CheckSquare,
  AlertCircle, TrendingDown, Activity, DollarSign, Target,
  Mail, Settings, LogOut, Menu, X, Filter, ArrowUpDown
} from 'lucide-react';
import HexBackground from '../components/HexBackground';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEMO_API_KEY = 'vs_live_sk_ug_7f3a9b2c1e4d8f6a0b5c3d7e2f1a9b4c';
const MANUAL_VISIT_HOURS = 2;
const MANUAL_VISIT_COST_USD = 20;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getRisk(score, nights) {
  if (score >= 70 && nights >= 3) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  return 'HIGH';
}

function getRecommendation(score, nights, vouches, nira) {
  if (score >= 70 && nights >= 3 && nira) return { label: 'APPROVE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '✓' };
  if (score >= 50) return { label: 'REVIEW', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '⚠' };
  return { label: 'DECLINE', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '✗' };
}

function TrustRing({ score, size = 'md' }) {
  const r = size === 'sm' ? 20 : 36;
  const sw = size === 'sm' ? 4 : 7;
  const dim = size === 'sm' ? 56 : 88;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const dash = (pct / 100) * circ;
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#3B82F6' : '#F59E0B';
  const fs = size === 'sm' ? 'text-sm' : 'text-xl';
  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90 absolute" style={{ width: dim, height: dim }}>
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="#1E293B" strokeWidth={sw} />
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
      </svg>
      <div className="text-center z-10">
        <p className={`${fs} font-black leading-none`} style={{ color }}>{score || 0}</p>
        {size !== 'sm' && <p className="text-xs text-slate-500 leading-none">/ 100</p>}
      </div>
    </div>
  );
}

function TierBadge({ tier, size = 'sm' }) {
  const config = {
    'Visitor':            { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: '👤' },
    'Resident':           { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: '🏠' },
    'Sentinel Permanent': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '🛡️' },
  };
  const c = config[tier] || config['Visitor'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.color}`}>
      <span>{c.icon}</span>{tier}
    </span>
  );
}

function RiskBadge({ risk }) {
  const config = {
    LOW:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    MEDIUM: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
    HIGH:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  };
  const c = config[risk] || config.HIGH;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${c.bg} ${c.border} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${risk === 'LOW' ? 'bg-emerald-400' : risk === 'MEDIUM' ? 'bg-amber-400' : 'bg-red-400'}`} />
      {risk}
    </span>
  );
}

// ─── VERIFICATION RESULT CARD ─────────────────────────────────────────────────
function VerificationCard({ result, landmarks, onClose, onAddToPortfolio, alreadyInPortfolio }) {
  const [copied, setCopied] = useState('');
  const [downloading, setDownloading] = useState(false);
  const rec = getRecommendation(result.trust_score, result.persistence_nights, result.vouches_count, result.nira_verified);
  const risk = getRisk(result.trust_score, result.persistence_nights);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, H = 297;
      doc.setFillColor(6, 11, 19);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, W, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('KYC VERIFICATION REPORT', W / 2, 20, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Verify Sentinel — TEGU Systems Ltd | verify-sentinel.tegusystems.com', W / 2, 28, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString('en-GB')} | Confidential — For authorized use only`, W / 2, 34, { align: 'center' });
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.3);
      doc.line(15, 38, W - 15, 38);
      doc.setFillColor(rec.label === 'APPROVE' ? 16 : rec.label === 'REVIEW' ? 245 : 239,
        rec.label === 'APPROVE' ? 185 : rec.label === 'REVIEW' ? 158 : 68,
        rec.label === 'APPROVE' ? 129 : rec.label === 'REVIEW' ? 11 : 68);
      doc.setFontSize(14);
      doc.setTextColor(rec.label === 'APPROVE' ? 16 : rec.label === 'REVIEW' ? 245 : 239,
        rec.label === 'APPROVE' ? 185 : rec.label === 'REVIEW' ? 158 : 68,
        rec.label === 'APPROVE' ? 129 : rec.label === 'REVIEW' ? 11 : 68);
      doc.text(`KYC RECOMMENDATION: ${rec.label}`, W / 2, 50, { align: 'center' });
      const fields = [
        ['Sentinel ID', result.sentinel_id],
        ['Trust Score', `${result.trust_score || 0} / 100`],
        ['Residency Status', result.status || 'Visitor'],
        ['Risk Level', risk],
        ['Residency Type', result.residency_type || '—'],
        ['Country', result.country || '—'],
        ['Check-in Nights', `${result.persistence_nights || 0} nights verified`],
        ['Neighbor Vouches', `${result.vouches_count || 0} attestations`],
        ['NIRA Verified', result.nira_verified ? 'Yes — AI face match confirmed' : 'Not verified'],
        ['H3 Hex Index', result.h3_index || '—'],
        ['Coordinates', result.hex_center_lat ? `${result.hex_center_lat.toFixed(5)}, ${result.hex_center_lng.toFixed(5)}` : '—'],
        ['Verification Date', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
      ];
      let y = 65;
      doc.setFontSize(9);
      fields.forEach(([label, value], i) => {
        if (i % 2 === 0) {
          doc.setFillColor(15, 20, 35);
          doc.rect(15, y - 4, W - 30, 10, 'F');
        }
        doc.setTextColor(100, 116, 139);
        doc.text(label, 20, y);
        doc.setTextColor(220, 230, 240);
        doc.text(String(value), 90, y);
        y += 10;
      });
      if (landmarks.length > 0) {
        y += 5;
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(10);
        doc.text('LAST-MILE DELIVERY BLUEPRINT', 20, y);
        y += 8;
        landmarks.forEach((lm, i) => {
          doc.setTextColor(180, 190, 210);
          doc.setFontSize(8);
          doc.text(`${i + 1}. ${lm.ai_normalized || lm.description_text}`, 20, y);
          doc.setTextColor(100, 116, 139);
          doc.text(`   ${lm.direction} of ${lm.landmark_type}${lm.distance_meters ? ` · ~${lm.distance_meters}m` : ''}`, 20, y + 5);
          y += 12;
        });
      }
      doc.setDrawColor(30, 41, 59);
      doc.line(15, H - 18, W - 15, H - 18);
      doc.setTextColor(60, 70, 90);
      doc.setFontSize(7);
      doc.text('This report is generated by Verify Sentinel (TEGU Systems Ltd) and is intended for authorized KYC use only.', W / 2, H - 12, { align: 'center' });
      doc.text('Data processed under Uganda Data Protection and Privacy Act 2019. verify-sentinel.tegusystems.com', W / 2, H - 7, { align: 'center' });
      doc.save(`KYC-Report-${result.sentinel_id}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-500/20 overflow-hidden"
      style={{ background: 'rgba(6,11,19,0.98)', backdropFilter: 'blur(20px)' }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Verification Result</p>
            <p className="text-white font-mono font-bold">{result.sentinel_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RiskBadge risk={risk} />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${rec.bg} ${rec.border} ${rec.color}`}>
            <span>{rec.icon}</span> {rec.label}
          </div>
          {!alreadyInPortfolio && (
            <button onClick={onAddToPortfolio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all">
              <Plus className="w-3 h-3" /> Add to Portfolio
            </button>
          )}
          {alreadyInPortfolio && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle className="w-3 h-3" /> In Portfolio
            </span>
          )}
          <button onClick={handleDownloadReport} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400 text-xs hover:text-white transition-all disabled:opacity-40">
            <Download className="w-3 h-3" />
            {downloading ? 'Generating...' : 'KYC Report'}
          </button>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xs px-2">
            ✕ Clear
          </button>
        </div>
      </div>

      <div className="p-6 grid md:grid-cols-3 gap-5">

        {/* Trust Score */}
        <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-slate-900/60 border border-slate-800/60 gap-3">
          <TrustRing score={result.trust_score} />
          <TierBadge tier={result.status} />
          <div className="w-full space-y-1.5 mt-1">
            {[
              { label: 'Address Proof', pass: (result.persistence_nights || 0) >= 1 },
              { label: 'Residency Confirmed', pass: (result.persistence_nights || 0) >= 3 },
              { label: 'Community Verified', pass: (result.vouches_count || 0) >= 1 },
              { label: 'NIRA Verified', pass: !!result.nira_verified },
            ].map(({ label, pass }) => (
              <div key={label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                pass ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-slate-800/40 border-slate-700/30 text-slate-600'
              }`}>
                {pass ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <Clock className="w-3 h-3 flex-shrink-0" />}
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Identity Signals */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Identity Signals</p>
          {[
            { label: 'Check-in Nights', value: `${result.persistence_nights || 0} nights`, icon: '🌙', sub: result.persistence_nights >= 3 ? 'Residency confirmed' : 'Building residency' },
            { label: 'Neighbor Vouches', value: `${result.vouches_count || 0}`, icon: '🤝', sub: result.vouches_count >= 2 ? 'Community verified' : 'Limited social proof' },
            { label: 'Residency Type', value: result.residency_type || 'Owner', icon: '🏗️', sub: '' },
            { label: 'Country', value: result.country || '—', icon: '🌍', sub: '' },
            { label: 'NIRA Status', value: result.nira_verified ? 'Verified' : 'Not verified', icon: '🪪', sub: result.nira_verified ? 'AI face-match confirmed' : 'Document upload required' },
          ].map(({ label, value, icon, sub }) => (
            <div key={label} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-white font-medium">{value}</p>
                {sub && <p className="text-xs text-slate-600">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Location Data</p>
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">H3 Hex Index</p>
              <button onClick={() => handleCopy(result.h3_index, 'hex')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                {copied === 'hex' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === 'hex' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-white font-mono break-all">{result.h3_index}</p>
          </div>
          {result.hex_center_lat && (
            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <p className="text-xs text-slate-500 mb-1">Coordinates</p>
              <p className="text-xs text-white font-mono">{result.hex_center_lat.toFixed(5)}, {result.hex_center_lng.toFixed(5)}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {result.google_maps_link && (
              <a href={result.google_maps_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all">
                <ExternalLink className="w-3 h-3" /> Google Maps
              </a>
            )}
            {result.apple_maps_link && (
              <a href={result.apple_maps_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 text-xs font-medium hover:text-white transition-all">
                <ExternalLink className="w-3 h-3" /> Apple Maps
              </a>
            )}
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
        <div className="px-6 pb-5">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Last-Mile Delivery Blueprint</p>
              <span className="ml-auto text-xs text-slate-600">{landmarks.length} anchor{landmarks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {landmarks.map((lm, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/40">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs text-blue-400 font-bold flex-shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{lm.ai_normalized || lm.description_text}</p>
                    <p className="text-xs text-slate-500">{lm.direction} of {lm.landmark_type}{lm.distance_meters ? ` · ~${lm.distance_meters}m` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function BusinessDashboard({ lang }) {
  const [activeTab, setActiveTab] = useState('verify');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, residents: 0, permanent: 0 });
  const [loading, setLoading] = useState(true);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copied, setCopied] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserEmail(user.email || '');

    const [{ data: vData }, { data: pData }, { data: aData }, { data: sData }] = await Promise.all([
      supabase.from('business_verifications').select('*').order('looked_up_at', { ascending: false }).limit(50),
      supabase.from('business_portfolio').select('*').order('added_at', { ascending: false }),
      supabase.from('business_alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('sentinel_addresses').select('status'),
    ]);

    setVerifications(vData || []);
    setPortfolio(pData || []);
    setAlerts(aData || []);
    if (sData) {
      setStats({
        total: sData.length,
        verified: sData.filter(a => a.status !== 'Visitor').length,
        residents: sData.filter(a => a.status === 'Resident').length,
        permanent: sData.filter(a => a.status === 'Sentinel Permanent').length,
      });
    }
    setLoading(false);
  };

  const handleSearch = async (idToSearch) => {
    const cleaned = (idToSearch || query).trim().toUpperCase();
    if (!cleaned) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    setLandmarks([]);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: records } = await supabase
      .from('sentinel_addresses')
      .select('*')
      .eq('sentinel_id', cleaned)
      .limit(1);

    if (!records?.length) {
      setNotFound(true);
      await supabase.from('business_verifications').insert({
        business_user_id: user?.id,
        business_email: user?.email,
        sentinel_id: cleaned,
        trust_score: null,
        status: 'NOT FOUND',
        risk_level: 'UNKNOWN',
        recommendation: 'DECLINE',
      });
    } else {
      const addr = records[0];
      const risk = getRisk(addr.trust_score, addr.persistence_nights);
      const rec = getRecommendation(addr.trust_score, addr.persistence_nights, addr.vouches_count, addr.nira_verified);

      await supabase.from('business_verifications').insert({
        business_user_id: user?.id,
        business_email: user?.email,
        sentinel_id: cleaned,
        trust_score: addr.trust_score,
        status: addr.status,
        country: addr.country,
        persistence_nights: addr.persistence_nights,
        vouches_count: addr.vouches_count || 0,
        nira_verified: addr.nira_verified || false,
        risk_level: risk,
        recommendation: rec.label,
      });

      const { data: lms } = await supabase
        .from('landmark_descriptions')
        .select('*')
        .eq('h3_index', addr.h3_index);

      setResult(addr);
      setLandmarks(lms || []);
      setVerifications(prev => [{
        sentinel_id: cleaned, trust_score: addr.trust_score, status: addr.status,
        risk_level: risk, recommendation: rec.label, looked_up_at: new Date().toISOString()
      }, ...prev].slice(0, 50));
    }
    setSearching(false);
  };

  const handleAddToPortfolio = async () => {
    if (!result) return;
    const { data: { user } } = await supabase.auth.getUser();
    const risk = getRisk(result.trust_score, result.persistence_nights);
    const { error } = await supabase.from('business_portfolio').insert({
      business_user_id: user?.id,
      business_email: user?.email,
      sentinel_id: result.sentinel_id,
      trust_score_at_add: result.trust_score,
      current_trust_score: result.trust_score,
      status_at_add: result.status,
      current_status: result.status,
      nira_verified: result.nira_verified || false,
      risk_level: risk,
      h3_index: result.h3_index,
      country: result.country,
      google_maps_link: result.google_maps_link,
    });
    if (!error) {
      setPortfolio(prev => [{ ...result, risk_level: risk, added_at: new Date().toISOString() }, ...prev]);
    }
  };

  const handleRemoveFromPortfolio = async (sentinelId) => {
    await supabase.from('business_portfolio').delete()
      .eq('sentinel_id', sentinelId).eq('business_email', userEmail);
    setPortfolio(prev => prev.filter(p => p.sentinel_id !== sentinelId));
  };

  const handleBulkVerify = async () => {
    if (!bulkInput.trim()) return;
    setBulkProcessing(true);
    setBulkResults([]);
    const ids = bulkInput.split(/[\n,]/).map(s => s.trim().toUpperCase()).filter(Boolean);
    const results = [];
    for (const id of ids) {
      const { data } = await supabase.from('sentinel_addresses').select('*').eq('sentinel_id', id).limit(1);
      if (data?.length) {
        const addr = data[0];
        const risk = getRisk(addr.trust_score, addr.persistence_nights);
        const rec = getRecommendation(addr.trust_score, addr.persistence_nights, addr.vouches_count, addr.nira_verified);
        results.push({ sentinel_id: id, found: true, trust_score: addr.trust_score, status: addr.status, risk, recommendation: rec.label, country: addr.country });
      } else {
        results.push({ sentinel_id: id, found: false, risk: 'UNKNOWN', recommendation: 'DECLINE' });
      }
    }
    setBulkResults(results);
    setBulkProcessing(false);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBulkInput(ev.target.result.replace(/,/g, '\n'));
    reader.readAsText(file);
  };

  const exportBulkCSV = () => {
    const header = 'Sentinel ID,Found,Trust Score,Status,Risk Level,Recommendation,Country\n';
    const rows = bulkResults.map(r =>
      `${r.sentinel_id},${r.found},${r.trust_score || ''},${r.status || 'NOT FOUND'},${r.risk},${r.recommendation},${r.country || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bulk-verification-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const toggleAlert = async (sentinelId, type) => {
    const existing = alerts.find(a => a.sentinel_id === sentinelId && a.alert_type === type);
    const { data: { user } } = await supabase.auth.getUser();
    if (existing) {
      await supabase.from('business_alerts').delete().eq('id', existing.id);
      setAlerts(prev => prev.filter(a => a.id !== existing.id));
    } else {
      const { data } = await supabase.from('business_alerts').insert({
        business_user_id: user?.id,
        sentinel_id: sentinelId,
        alert_type: type,
        threshold: type === 'score_drop' ? 20 : null,
        enabled: true,
      }).select().single();
      if (data) setAlerts(prev => [...prev, data]);
    }
  };

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

  const isInPortfolio = result && portfolio.some(p => p.sentinel_id === result.sentinel_id);

  const monthVerifications = verifications.filter(v => {
    const d = new Date(v.looked_up_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const timeSavedHours = monthVerifications.length * MANUAL_VISIT_HOURS;
  const costSaved = monthVerifications.length * MANUAL_VISIT_COST_USD;

  const tabs = [
    { id: 'verify', label: 'Verify', icon: Search },
    { id: 'portfolio', label: 'Portfolio', icon: Users, badge: portfolio.length },
    { id: 'history', label: 'Audit Log', icon: Clock, badge: verifications.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'bulk', label: 'Bulk Verify', icon: Upload },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alerts.length },
    { id: 'api', label: 'API Access', icon: Key },
    { id: 'team', label: 'Team', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.03} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Enterprise KYC Console</span>
              <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Live</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-white">Verify Sentinel — Business Dashboard</h1>
            <p className="text-slate-600 text-xs mt-0.5">{userEmail} · Powered by TEGU Systems</p>
          </div>
          <button onClick={loadAll} className="p-2 rounded-lg border border-slate-800 text-slate-600 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Network IDs', value: loading ? '—' : stats.total.toLocaleString(), icon: Globe, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
            { label: 'Verified Residents', value: loading ? '—' : stats.verified.toLocaleString(), icon: CheckCircle, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
            { label: 'This Month Lookups', value: monthVerifications.length.toString(), icon: Activity, color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
            { label: 'Est. Cost Saved', value: `$${costSaved.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
          ].map(({ label, value, icon: Icon, color, border, bg }) => (
            <div key={label} className={`p-4 rounded-xl border ${border} ${bg}`}
              style={{ backdropFilter: 'blur(10px)' }}>
              <Icon className={`w-3.5 h-3.5 ${color} mb-2`} />
              <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === id
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  : 'bg-slate-900/40 border border-slate-800/60 text-slate-500 hover:text-slate-300'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === id ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700 text-slate-400'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: VERIFY ─────────────────────────────────────────────────────── */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800/60 overflow-hidden"
              style={{ background: 'rgba(6,11,19,0.95)', backdropFilter: 'blur(20px)' }}>
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">Identity Verification Search</span>
              </div>
              <div className="p-6">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="text" value={query} onChange={handleInput}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="XXXX-XXXX-XXXX-XXX"
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white text-base outline-none focus:border-blue-500/60 placeholder-slate-600 font-mono tracking-widest"
                      maxLength={19} />
                  </div>
                  <button onClick={() => handleSearch()}
                    disabled={searching || query.length < 4}
                    className="px-8 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                    {searching
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                      : <><Zap className="w-4 h-4" /> Verify</>}
                  </button>
                </div>
                <p className="text-xs text-slate-600 font-mono mt-2">Format: XXXX-XXXX-XXXX-XXX</p>
              </div>
              {notFound && (
                <div className="px-6 pb-6">
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Sentinel ID Not Found</p>
                      <p className="text-xs text-slate-500 mt-0.5">No verified address found. This lookup has been logged to your audit trail.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {result && (
              <VerificationCard
                result={result}
                landmarks={landmarks}
                onClose={() => { setResult(null); setLandmarks([]); setQuery(''); setNotFound(false); }}
                onAddToPortfolio={handleAddToPortfolio}
                alreadyInPortfolio={isInPortfolio}
              />
            )}
          </div>
        )}

        {/* ── TAB: PORTFOLIO ──────────────────────────────────────────────────── */}
        {activeTab === 'portfolio' && (
          <div className="rounded-2xl border border-slate-800/60 overflow-hidden"
            style={{ background: 'rgba(6,11,19,0.95)' }}>
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Customer Portfolio</span>
              <span className="ml-auto text-xs text-slate-500">{portfolio.length} customers monitored</span>
            </div>
            {portfolio.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No customers in portfolio yet</p>
                <p className="text-slate-700 text-xs mt-1">Verify a Sentinel ID and click "Add to Portfolio" to begin monitoring customers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {['Sentinel ID', 'Trust Score', 'Status', 'Risk', 'KYC Rec.', 'NIRA', 'Country', 'Added', 'Alerts', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {portfolio.map((p) => {
                      const rec = getRecommendation(p.current_trust_score, 0, 0, p.nira_verified);
                      const hasScoreAlert = alerts.some(a => a.sentinel_id === p.sentinel_id && a.alert_type === 'score_drop');
                      const hasTierAlert = alerts.some(a => a.sentinel_id === p.sentinel_id && a.alert_type === 'tier_change');
                      return (
                        <tr key={p.sentinel_id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => { setQuery(p.sentinel_id); setActiveTab('verify'); handleSearch(p.sentinel_id); }}
                              className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">{p.sentinel_id}</button>
                          </td>
                          <td className="px-4 py-3"><TrustRing score={p.current_trust_score} size="sm" /></td>
                          <td className="px-4 py-3"><TierBadge tier={p.current_status} /></td>
                          <td className="px-4 py-3"><RiskBadge risk={p.risk_level} /></td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold ${rec.color}`}>{rec.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${p.nira_verified ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {p.nira_verified ? '✓ Verified' : 'Not verified'}
                            </span>
                          </td>
                          <td className="px-4 py-3"><span className="text-xs text-slate-400">{p.country || '—'}</span></td>
                          <td className="px-4 py-3"><span className="text-xs text-slate-600 whitespace-nowrap">{new Date(p.added_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => toggleAlert(p.sentinel_id, 'score_drop')}
                                title="Alert on trust score drop"
                                className={`p-1 rounded transition-colors ${hasScoreAlert ? 'text-amber-400' : 'text-slate-700 hover:text-slate-400'}`}>
                                <TrendingDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => toggleAlert(p.sentinel_id, 'tier_change')}
                                title="Alert on tier change"
                                className={`p-1 rounded transition-colors ${hasTierAlert ? 'text-blue-400' : 'text-slate-700 hover:text-slate-400'}`}>
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleRemoveFromPortfolio(p.sentinel_id)}
                              className="p-1 text-slate-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AUDIT LOG ──────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="rounded-2xl border border-slate-800/60 overflow-hidden"
            style={{ background: 'rgba(6,11,19,0.95)' }}>
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Verification Audit Log</span>
              <span className="ml-auto text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-800">{verifications.length} total lookups</span>
            </div>
            {verifications.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No verifications yet.</p>
                <p className="text-slate-700 text-xs mt-1">Every Sentinel ID lookup is logged here for compliance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {['Sentinel ID', 'Time', 'Trust Score', 'Status', 'Risk', 'Recommendation'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {verifications.map((v, i) => (
                      <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => { setQuery(v.sentinel_id); setActiveTab('verify'); }}
                            className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">{v.sentinel_id}</button>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-500 whitespace-nowrap">{new Date(v.looked_up_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></td>
                        <td className="px-4 py-3"><span className={`text-sm font-bold font-mono ${v.trust_score >= 70 ? 'text-emerald-400' : v.trust_score >= 50 ? 'text-blue-400' : v.trust_score ? 'text-amber-400' : 'text-slate-600'}`}>{v.trust_score || '—'}</span></td>
                        <td className="px-4 py-3">{v.status && v.status !== 'NOT FOUND' ? <TierBadge tier={v.status} /> : <span className="text-xs text-red-400">Not Found</span>}</td>
                        <td className="px-4 py-3">{v.risk_level && v.risk_level !== 'UNKNOWN' ? <RiskBadge risk={v.risk_level} /> : <span className="text-xs text-slate-600">—</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${v.recommendation === 'APPROVE' ? 'text-emerald-400' : v.recommendation === 'REVIEW' ? 'text-amber-400' : 'text-red-400'}`}>
                            {v.recommendation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ANALYTICS ──────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Verifications This Month', value: monthVerifications.length, sub: 'Total KYC lookups', color: 'text-blue-400', icon: Activity },
                { label: 'Hours Saved vs Manual', value: `${timeSavedHours}h`, sub: `At ${MANUAL_VISIT_HOURS}hrs per manual site visit`, color: 'text-emerald-400', icon: Clock },
                { label: 'Cost Saved This Month', value: `$${costSaved.toLocaleString()}`, sub: `At $${MANUAL_VISIT_COST_USD} per manual visit`, color: 'text-amber-400', icon: DollarSign },
              ].map(({ label, value, sub, color, icon: Icon }) => (
                <div key={label} className="p-5 rounded-2xl border border-slate-800/60"
                  style={{ background: 'rgba(6,11,19,0.95)' }}>
                  <Icon className={`w-4 h-4 ${color} mb-3`} />
                  <p className={`text-3xl font-black font-mono ${color}`}>{value}</p>
                  <p className="text-sm font-semibold text-white mt-1">{label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-800/60" style={{ background: 'rgba(6,11,19,0.95)' }}>
                <p className="text-sm font-semibold text-white mb-4">Network Tier Distribution</p>
                {[
                  { label: 'Sentinel Permanent', value: stats.permanent, color: '#10B981' },
                  { label: 'Resident', value: stats.residents, color: '#3B82F6' },
                  { label: 'Visitor', value: stats.total - stats.verified, color: '#F59E0B' },
                ].map(({ label, value, color }) => {
                  const pct = stats.total ? Math.round((value / stats.total) * 100) : 0;
                  return (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-mono font-bold" style={{ color }}>{value} <span className="text-slate-600">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}50` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 rounded-2xl border border-slate-800/60" style={{ background: 'rgba(6,11,19,0.95)' }}>
                <p className="text-sm font-semibold text-white mb-4">Your Verification Outcomes</p>
                {[
                  { label: 'Approved', count: verifications.filter(v => v.recommendation === 'APPROVE').length, color: '#10B981' },
                  { label: 'Review Required', count: verifications.filter(v => v.recommendation === 'REVIEW').length, color: '#F59E0B' },
                  { label: 'Declined / Not Found', count: verifications.filter(v => v.recommendation === 'DECLINE').length, color: '#EF4444' },
                ].map(({ label, count, color }) => {
                  const pct = verifications.length ? Math.round((count / verifications.length) * 100) : 0;
                  return (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-mono font-bold" style={{ color }}>{count} <span className="text-slate-600">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                  <p className="text-xs text-slate-600">Based on {verifications.length} total verifications in audit log</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">ROI Summary</p>
                  <p className="text-xs text-slate-400">
                    Your team ran <span className="text-white font-bold">{monthVerifications.length} verifications</span> this month,
                    saving an estimated <span className="text-emerald-400 font-bold">{timeSavedHours} hours</span> of manual site visits
                    at a value of <span className="text-amber-400 font-bold">${costSaved.toLocaleString()}</span>.
                    At your current Pro Plan rate of $500/month, your ROI this month
                    is <span className="text-emerald-400 font-bold">{costSaved > 500 ? `${Math.round(((costSaved - 500) / 500) * 100)}%` : 'building'}</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: BULK VERIFY ────────────────────────────────────────────────── */}
        {activeTab === 'bulk' && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-slate-800/60" style={{ background: 'rgba(6,11,19,0.95)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-semibold text-white">Bulk Sentinel ID Verification</p>
              </div>
              <p className="text-xs text-slate-500 mb-4">Paste Sentinel IDs below (one per line or comma-separated), or upload a CSV file.</p>
              <div className="flex gap-3 mb-4">
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-xs hover:text-white transition-all">
                  <Upload className="w-3.5 h-3.5" /> Upload CSV
                </button>
                <button onClick={() => { setBulkInput(''); setBulkResults([]); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-xs hover:text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              </div>
              <textarea rows={6} value={bulkInput} onChange={e => setBulkInput(e.target.value)}
                placeholder={"XXXX-XXXX-XXXX-XXX\nXXXX-XXXX-XXXX-XXX\nXXXX-XXXX-XXXX-XXX"}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500/60 placeholder-slate-700 font-mono resize-none mb-4" />
              <button onClick={handleBulkVerify} disabled={bulkProcessing || !bulkInput.trim()}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {bulkProcessing
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  : <><Zap className="w-4 h-4" /> Run Bulk Verification</>}
              </button>
            </div>

            {bulkResults.length > 0 && (
              <div className="rounded-2xl border border-slate-800/60 overflow-hidden" style={{ background: 'rgba(6,11,19,0.95)' }}>
                <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">{bulkResults.length} Results</span>
                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {bulkResults.filter(r => r.recommendation === 'APPROVE').length} approved ·{' '}
                      {bulkResults.filter(r => r.recommendation === 'REVIEW').length} review ·{' '}
                      {bulkResults.filter(r => r.recommendation === 'DECLINE').length} declined
                    </span>
                    <button onClick={exportBulkCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 text-xs hover:text-white transition-all">
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/60">
                        {['Sentinel ID', 'Found', 'Trust Score', 'Status', 'Risk', 'Recommendation', 'Country'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {bulkResults.map((r, i) => (
                        <tr key={i} className="hover:bg-white/[0.01]">
                          <td className="px-4 py-3 font-mono text-xs text-blue-400">{r.sentinel_id}</td>
                          <td className="px-4 py-3">{r.found ? <span className="text-emerald-400 text-xs">✓ Found</span> : <span className="text-red-400 text-xs">✗ Not Found</span>}</td>
                          <td className="px-4 py-3"><span className={`text-sm font-bold font-mono ${r.trust_score >= 70 ? 'text-emerald-400' : r.trust_score >= 50 ? 'text-blue-400' : r.trust_score ? 'text-amber-400' : 'text-slate-600'}`}>{r.trust_score || '—'}</span></td>
                          <td className="px-4 py-3">{r.status ? <TierBadge tier={r.status} /> : <span className="text-xs text-slate-600">—</span>}</td>
                          <td className="px-4 py-3">{r.risk !== 'UNKNOWN' ? <RiskBadge risk={r.risk} /> : <span className="text-xs text-slate-600">—</span>}</td>
                          <td className="px-4 py-3"><span className={`text-xs font-bold ${r.recommendation === 'APPROVE' ? 'text-emerald-400' : r.recommendation === 'REVIEW' ? 'text-amber-400' : 'text-red-400'}`}>{r.recommendation}</span></td>
                          <td className="px-4 py-3"><span className="text-xs text-slate-400">{r.country || '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ALERTS ─────────────────────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <Bell className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-400">Alert System — Activating Q3 2026</p>
                  <p className="text-xs text-slate-400 mt-1">Configure alerts below. Email delivery and real-time notifications will activate in Q3 2026. Alert configurations you save now will be activated automatically.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/60 overflow-hidden" style={{ background: 'rgba(6,11,19,0.95)' }}>
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">Active Alert Configurations</span>
                <span className="ml-auto text-xs text-slate-500">{alerts.length} configured</span>
              </div>
              {alerts.length === 0 ? (
                <div className="p-12 text-center">
                  <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No alerts configured yet.</p>
                  <p className="text-slate-700 text-xs mt-1">Go to Portfolio and click the alert icons on any customer to set up monitoring.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/40">
                  {alerts.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        a.alert_type === 'score_drop' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'
                      }`}>
                        {a.alert_type === 'score_drop' ? <TrendingDown className="w-4 h-4 text-amber-400" /> : <Bell className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono">{a.sentinel_id}</p>
                        <p className="text-xs text-slate-500">
                          {a.alert_type === 'score_drop' ? `Alert when trust score drops by ${a.threshold || 20}+ points` : 'Alert when residency tier changes'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-500">Pending Q3</span>
                        <button onClick={() => toggleAlert(a.sentinel_id, a.alert_type)}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: API ────────────────────────────────────────────────────────── */}
        {activeTab === 'api' && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-slate-800/60" style={{ background: 'rgba(6,11,19,0.95)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Key className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-semibold text-white">API Credentials</p>
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">Pro Plan</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Live API Key</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-black/40 border border-slate-800/60">
                    <code className="text-xs text-slate-300 flex-1 font-mono truncate">
                      {apiKeyVisible ? DEMO_API_KEY : 'vs_live_sk_ug_' + '•'.repeat(32)}
                    </code>
                    <button onClick={() => setApiKeyVisible(!apiKeyVisible)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleCopy(DEMO_API_KEY, 'apikey')} className="text-slate-500 hover:text-blue-400 transition-colors">
                      {copied === 'apikey' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Verify Endpoint</p>
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800/60">
                    <pre className="text-xs text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">{`GET https://api.tegusystems.com/v1/verify/{sentinel_id}
Authorization: Bearer ${DEMO_API_KEY}

// Response
{
  "sentinel_id": "XXXX-XXXX-XXXX-XXX",
  "trust_score": 82,
  "status": "Resident",
  "risk_level": "LOW",
  "recommendation": "APPROVE",
  "persistence_nights": 5,
  "vouches_count": 2,
  "nira_verified": true,
  "country": "Uganda",
  "last_mile_blueprint": [
    {
      "type": "School",
      "direction": "North",
      "distance_meters": 50,
      "description": "North of St. Mary's Primary School, ~50m"
    }
  ],
  "google_maps_link": "https://maps.google.com/...",
  "hex_index": "8a1fb4665867fff"
}`}</pre>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-2">
                    <p className="text-xs text-blue-400 font-semibold mb-3">Pro Plan — Current</p>
                    {['10,000 API calls / month', '$0.25 per call after limit', '99.9% uptime SLA', 'Full audit log access', 'Bulk verification endpoint', 'Priority email support'].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-slate-400">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 space-y-2">
                    <p className="text-xs text-purple-400 font-semibold mb-3">Enterprise Plan — Available</p>
                    {['Unlimited API calls', 'Custom pricing per volume', 'Dedicated account manager', 'SLA: 99.99% uptime', 'Multi-seat team access', 'White-label reporting'].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="text-xs text-slate-400">{item}</span>
                      </div>
                    ))}
                    <a href="mailto:enterprise@tegusystems.com"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-all mt-3">
                      <Mail className="w-3 h-3" /> Contact Sales
                    </a>
                  </div>
                </div>

                <a href="https://tegusystems.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition-all">
                  <FileText className="w-3.5 h-3.5" /> View Full API Documentation
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: TEAM ───────────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-start gap-3">
                <UserPlus className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-400">Multi-Seat Team Access — Launching Q3 2026</p>
                  <p className="text-xs text-slate-400 mt-1">Add loan officers, compliance managers, and admins under your organization account. Each seat can run verifications independently. All lookups are consolidated in the shared audit log.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800/60" style={{ background: 'rgba(6,11,19,0.95)' }}>
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-semibold text-white">Team Members</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">{userEmail?.[0]?.toUpperCase() || 'A'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{userEmail}</p>
                    <p className="text-xs text-slate-500">Account Administrator</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">Admin</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-700/30 border-dashed">
                <div className="flex items-center gap-3 mb-3">
                  <UserPlus className="w-4 h-4 text-slate-600" />
                  <p className="text-sm text-slate-500">Invite Team Member</p>
                </div>
                <div className="flex gap-2">
                  <input type="email" placeholder="colleague@bank.com" disabled
                    className="flex-1 bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-slate-600 text-xs outline-none placeholder-slate-700 cursor-not-allowed" />
                  <select disabled className="bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-slate-600 text-xs outline-none cursor-not-allowed">
                    <option>Loan Officer</option>
                    <option>Compliance Manager</option>
                    <option>Admin</option>
                  </select>
                  <button disabled
                    className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-600 text-xs font-medium cursor-not-allowed">
                    Invite
                  </button>
                </div>
                <p className="text-xs text-slate-700 mt-2">Team invitations activate in Q3 2026. Your seat allocation will be configured at that time.</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { role: 'Loan Officer', desc: 'Run verifications and view results', icon: '🔍' },
                  { role: 'Compliance Manager', desc: 'Full audit log and report access', icon: '📋' },
                  { role: 'Administrator', desc: 'Full access including billing and API keys', icon: '⚙️' },
                ].map(({ role, desc, icon }) => (
                  <div key={role} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40">
                    <span className="text-xl">{icon}</span>
                    <p className="text-xs font-semibold text-white mt-2">{role}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compliance Notice */}
        <div className="p-4 rounded-xl border border-slate-800/40 flex items-start gap-3"
          style={{ background: 'rgba(6,11,19,0.6)' }}>
          <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600">
            <span className="text-slate-500 font-semibold">Data Protection: </span>
            Verify Sentinel does not store National ID numbers. All verification queries are logged for compliance audit purposes.
            Data processed under Uganda's Data Protection and Privacy Act 2019 and equivalent legislation in supported territories.
            Every lookup in your audit log is timestamped and immutable.
          </p>
        </div>

      </div>
    </div>
  );
}
