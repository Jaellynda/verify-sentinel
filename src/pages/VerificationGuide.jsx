import { Shield, CheckCircle, Clock, FileText, Camera, User, ChevronRight, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import HexBackground from '../components/HexBackground';

const STEPS = [
  {
    num: '01',
    icon: <Shield className="w-5 h-5 text-green-400" />,
    title: 'Generate Your Sentinel ID',
    time: '2 min',
    status: 'Free & Instant',
    statusColor: 'text-green-400 bg-green-500/10 border-green-500/20',
    desc: 'Your phone\'s GPS locks onto a Res-9 H3 hexagon (~174m²) — completely offline. No data needed.',
    items: [
      { ready: true,  label: 'A smartphone with GPS' },
      { ready: true,  label: 'Stand inside or near your home' },
      { ready: false, label: 'No internet required for ID generation' },
    ],
    result: 'Trust Score starts at 30. Status: Visitor.',
  },
  {
    num: '02',
    icon: <Clock className="w-5 h-5 text-blue-400" />,
    title: '3-Night Persistence Check-in',
    time: '3 days',
    status: 'Required for Resident',
    statusColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    desc: 'Check in from your hex on 3 separate days to prove you actually sleep there — not just visiting.',
    items: [
      { ready: true,  label: 'Open the app each day from home' },
      { ready: true,  label: 'GPS must confirm you\'re inside your hexagon' },
      { ready: false, label: 'Works offline — syncs when reconnected' },
    ],
    result: 'Trust Score reaches 65. Status: Resident.',
  },
  {
    num: '03',
    icon: <User className="w-5 h-5 text-purple-400" />,
    title: 'NIRA Identity Verification',
    time: '10 sec',
    status: 'Boosts score to 95+',
    statusColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    desc: 'Link your Uganda National ID (NIN) to your address. AI verifies your face matches the card.',
    items: [
      { ready: true, label: 'Your Uganda NIN card (physical or photo)' },
      { ready: true, label: 'A clear selfie photo taken now' },
      { ready: true, label: 'Your NIN number (format: CM9000XXXXXXXX)' },
      { ready: true, label: 'Name and district of origin as on card' },
    ],
    result: 'Trust Score jumps to 90–100. Status: Full KYC.',
    highlight: true,
  },
  {
    num: '04',
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    title: 'Neighbor Vouching',
    time: 'Optional',
    status: '+5 pts per vouch',
    statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    desc: 'Ask neighbors with Sentinel IDs to vouch for your address. Each vouch adds social proof.',
    items: [
      { ready: true,  label: 'A neighbor\'s Sentinel ID' },
      { ready: false, label: 'Up to 4 vouches count (+20 pts max)' },
    ],
    result: 'Max bonus: +20 Trust Score from vouching.',
  },
];

const DOCS = [
  {
    icon: '🪪',
    title: 'NIN Card',
    desc: 'Uganda National Identification Number card. Must show your photo, name, NIN number, and district of origin.',
    tips: ['Photo must be clear and unobstructed', 'All four corners visible', 'No flash glare covering text'],
    required: true,
  },
  {
    icon: '🤳',
    title: 'Selfie Photo',
    desc: 'A live selfie taken at the time of verification. Our AI compares it to the photo on your NIN card.',
    tips: ['Face clearly lit, no sunglasses', 'Neutral expression preferred', 'Plain background works best'],
    required: true,
  },
];

const SCORE_BREAKDOWN = [
  { label: 'Base score',       points: '30',  color: 'bg-slate-600',   icon: '🌱' },
  { label: '3 check-ins',      points: '+35', color: 'bg-blue-500',    icon: '🌙' },
  { label: 'NIRA verified',    points: '+25', color: 'bg-purple-500',  icon: '🪪' },
  { label: 'Neighbor vouches', points: '+20', color: 'bg-amber-500',   icon: '🤝' },
  { label: 'Weekly pings',     points: 'Tier', color: 'bg-green-500',  icon: '📡' },
];

export default function VerificationGuide() {
  return (
    <div className="min-h-screen pt-16" style={{ background: '#0a0a0a' }}>
      <HexBackground opacity={0.05} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium uppercase tracking-widest mb-4">
            <Shield className="w-3 h-3" /> Verification Guide
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">How to Get a 100 Trust Score</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            From first GPS lock to full KYC — here's exactly what documents you need and what each step does to your trust score.
          </p>
        </div>

        {/* Trust Score Breakdown */}
        <div className="p-5 rounded-2xl border border-zinc-800" style={{ background: '#18181b' }}>
          <h2 className="text-sm font-semibold text-white mb-4">📊 How Trust Score is Calculated</h2>
          <div className="space-y-2">
            {SCORE_BREAKDOWN.map(({ label, points, color, icon }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-base w-6">{icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-mono font-bold">{points}</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`}
                      style={{ width: points.startsWith('+') ? `${parseInt(points) / 1.2}%` : `${parseInt(points) / 1.2}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-500">Maximum possible score</span>
            <span className="text-base font-bold text-green-400 font-mono">100 / 100</span>
          </div>
        </div>

        {/* Step by Step */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Step-by-Step Process</h2>
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className={`rounded-2xl border overflow-hidden ${step.highlight ? 'border-purple-500/30' : 'border-zinc-800'}`}
                style={{ background: step.highlight ? 'rgba(88,28,135,0.08)' : '#18181b' }}>
                {step.highlight && (
                  <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                )}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl font-bold text-slate-800 font-mono flex-shrink-0 w-8">{step.num}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {step.icon}
                        </div>
                        <h3 className="text-sm font-bold text-white">{step.title}</h3>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium ${step.statusColor}`}>
                          {step.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{step.desc}</p>

                      {/* What you need */}
                      <div className="space-y-1.5 mb-3">
                        {step.items.map((item, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.ready ? 'bg-green-500/20 border border-green-500/40' : 'bg-slate-800 border border-slate-700'
                            }`}>
                              {item.ready && <CheckCircle className="w-2.5 h-2.5 text-green-400" />}
                            </div>
                            <span className="text-xs text-slate-400">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Result */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <ArrowRight className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="text-xs text-green-400/80">{step.result}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Requirements */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">📋 Documents for NIRA Verification</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {DOCS.map((doc, i) => (
              <div key={i} className="p-5 rounded-2xl border border-zinc-800" style={{ background: '#18181b' }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{doc.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{doc.title}</h3>
                      {doc.required && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 font-medium">Required</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{doc.desc}</p>
                <div className="space-y-1.5">
                  {doc.tips.map((tip, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className="text-green-400/60 text-xs mt-0.5">→</span>
                      <span className="text-xs text-slate-600">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NIRA Explainer */}
        <div className="p-5 rounded-2xl border border-blue-900/40 bg-blue-950/20">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl">🇺🇬</span>
            <div>
              <h3 className="text-sm font-bold text-white">What is NIRA?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The National Identification and Registration Authority (NIRA) is Uganda's government body responsible for issuing National Identification Numbers (NIN). Every Ugandan citizen and registered alien receives a unique NIN card. By linking your NIN to your Sentinel ID, we create a tamper-proof bridge between your <span className="text-white">physical location</span> and your <span className="text-white">legal identity</span> — the gold standard for bank KYC, microfinance, and insurance.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { icon: '🏦', label: 'Bank KYC' },
              { icon: '📋', label: 'Microfinance' },
              { icon: '🛡️', label: 'Insurance' },
            ].map(({ icon, label }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-blue-900/20 border border-blue-800/30">
                <p className="text-base">{icon}</p>
                <p className="text-xs text-blue-400/70 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="text-slate-400 font-medium">Privacy:</span> Your NIN card and selfie are processed by AI in-memory and never stored in plaintext. Only the verification status and confidence score are saved. Images are encrypted at rest. You can request deletion at any time via support.
          </p>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/get-id"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all shadow-[0_0_20px_rgba(74,222,128,0.25)]">
            <Shield className="w-4 h-4" /> Get My ID
          </Link>
          <Link to="/dashboard"
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700/50 text-slate-300 text-sm font-medium hover:text-white hover:border-slate-600 transition-all">
            <ChevronRight className="w-4 h-4" /> My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}