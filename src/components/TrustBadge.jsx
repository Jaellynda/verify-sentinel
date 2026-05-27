import { useState } from 'react';
import { Shield, Copy, CheckCircle, Download, Share2 } from 'lucide-react';

const TIER_CONFIG = {
  'Visitor':           { color: '#F59E0B', glow: 'rgba(245,158,11,0.3)',  icon: '👤', label: 'Visitor' },
  'Resident':          { color: '#60A5FA', glow: 'rgba(96,165,250,0.3)',  icon: '🏠', label: 'Resident' },
  'Sentinel Permanent':{ color: '#10B981', glow: 'rgba(16,185,129,0.35)', icon: '🛡️', label: 'Sentinel Permanent' },
  'Pending':           { color: '#6B7280', glow: 'rgba(107,114,128,0.2)', icon: '⏳', label: 'Pending' },
};

function BadgeCard({ sentinelId, status, trustScore, country, region, niraVerified }) {
  const cfg = TIER_CONFIG[status] || TIER_CONFIG['Visitor'];
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      id="trust-badge-card"
      className="relative overflow-hidden rounded-2xl p-5 select-none"
      style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
        border: `1.5px solid ${cfg.color}40`,
        boxShadow: `0 0 30px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
        width: 320,
      }}
    >
      {/* Hex pattern background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='56'%3E%3Cpolygon points='24,2 46,14 46,38 24,50 2,38 2,14' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '48px 56px',
      }} />

      {/* Top row */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: cfg.color }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: cfg.color }}>VerifySentinel</span>
        </div>
        {niraVerified && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10B981' }}>
            🇺🇬 NIRA ✓
          </span>
        )}
      </div>

      {/* Status tier */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
          {cfg.icon}
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Residency Status</p>
          <p className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
        </div>
      </div>

      {/* Sentinel ID */}
      <div className="relative mb-3 p-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-0.5">Sentinel ID</p>
        <p className="text-base font-bold text-white tracking-wider" style={{ fontFamily: 'monospace' }}>
          {sentinelId}
        </p>
      </div>

      {/* Stats row */}
      <div className="relative grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-sm font-bold" style={{ color: cfg.color }}>{trustScore}</p>
          <p className="text-xs text-slate-600">Trust</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-sm font-bold text-slate-300">{country || '—'}</p>
          <p className="text-xs text-slate-600">Country</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs font-bold text-slate-400 truncate">{region || '—'}</p>
          <p className="text-xs text-slate-600">Region</p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between pt-2 border-t border-white/5">
        <p className="text-xs text-slate-700">Generated {date}</p>
        <p className="text-xs text-slate-700">verify.sentinel.id</p>
      </div>
    </div>
  );
}

export default function TrustBadge({ address, niraVerified = false }) {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!address) return null;

  const shareText = `I have a verified Sentinel ID: ${address.sentinel_id}\nStatus: ${address.status} · Trust Score: ${address.trust_score}/100\nVerify at: verifysentinel.id/verify?id=${address.sentinel_id}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Sentinel ID', text: shareText });
      } catch {
        // Permission denied or cancelled — fall back to clipboard
        handleCopyText();
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Shareable Trust Badge</p>
        <p className="text-xs text-slate-600">Share with landlords, banks, or couriers to prove your verified address.</p>
      </div>

      {/* Badge preview */}
      <div className="flex justify-center">
        <BadgeCard
          sentinelId={address.sentinel_id}
          status={address.status}
          trustScore={address.trust_score || 30}
          country={address.country}
          region={address.region}
          niraVerified={niraVerified}
        />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopyText}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700/50 bg-slate-800/40 text-slate-300 text-sm font-medium hover:border-green-500/40 hover:text-green-400 transition-all"
        >
          {copiedText ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copiedText ? 'Copied!' : 'Copy Text'}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-sm font-semibold transition-all shadow-[0_0_16px_rgba(74,222,128,0.25)]"
        >
          <Share2 className="w-4 h-4" />
          Share Badge
        </button>
      </div>

      {/* Verify link hint */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/20 text-center">
        <p className="text-xs text-slate-600">Anyone can verify this ID at</p>
        <p className="text-xs text-green-400/70 font-mono mt-0.5">/verify?id={address.sentinel_id}</p>
      </div>
    </div>
  );
}