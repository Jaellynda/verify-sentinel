import { useState, useEffect } from 'react';
import { Shield, MapPin, Zap, Users, ArrowRight, X, CheckCircle, Building2, User } from 'lucide-react';

const STEPS_INDIVIDUAL = [
  {
    icon: <Shield className="w-8 h-8 text-green-400" />,
    title: 'Welcome to Verify Sentinel',
    body: 'Your permanent digital address — generated offline from GPS coordinates using H3 hexagonal math. No street name required.',
  },
  {
    icon: <MapPin className="w-8 h-8 text-green-400" />,
    title: 'Generate Your Sentinel ID',
    body: 'Head to "Get My ID" and let your phone lock onto your exact hexagon. Works 100% offline — no data needed.',
    highlight: '/get-id',
    highlightLabel: 'Get My ID',
  },
  {
    icon: <Zap className="w-8 h-8 text-green-400" />,
    title: 'Build Your Trust Score',
    body: 'Check in from your location 3 nights in a row to earn Resident status. Your trust score unlocks banking, delivery & more.',
    highlight: '/dashboard',
    highlightLabel: 'Dashboard',
  },
  {
    icon: <Users className="w-8 h-8 text-green-400" />,
    title: 'Get Vouched by Neighbors',
    body: 'Ask nearby Sentinel users to vouch for your address. Each vouch adds +5 trust points — social proof for your location.',
  },
];

const STEPS_BUSINESS = [
  {
    icon: <Shield className="w-8 h-8 text-green-400" />,
    title: 'Welcome to Verify Sentinel',
    body: 'Instantly verify client addresses, trust scores, and location identity — no street names needed across East Africa.',
  },
  {
    icon: <Zap className="w-8 h-8 text-green-400" />,
    title: 'Verify a Client',
    body: 'Enter any Sentinel ID to retrieve trust score, residency tier, persistence history, and last-mile navigation links.',
    highlight: '/verify',
    highlightLabel: 'Verify Page',
  },
  {
    icon: <MapPin className="w-8 h-8 text-green-400" />,
    title: 'Explore the Hex Map',
    body: 'Browse the interactive H3 hexagonal map. Click any hexagon to see claimable areas and existing Sentinel addresses.',
    highlight: '/map',
    highlightLabel: 'Hex Map',
  },
  {
    icon: <Building2 className="w-8 h-8 text-green-400" />,
    title: 'Bank & KYC Ready',
    body: 'Trust Score integrates neighbor vouching + check-in persistence. Ideal for credit scoring, insurance, and last-mile delivery.',
  },
];

export default function OnboardingFlow() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState('survey'); // survey | tour
  const [userType, setUserType] = useState(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem('sentinel_onboarded');
    if (!done) setTimeout(() => setShow(true), 800);
  }, []);

  const handleUserType = (type) => {
    setUserType(type);
    setPhase('tour');
    setStep(0);
  };

  const steps = userType === 'business' ? STEPS_BUSINESS : STEPS_INDIVIDUAL;
  const current = steps[step];

  const handleFinish = () => {
    localStorage.setItem('sentinel_onboarded', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-700/60 overflow-hidden"
        style={{ background: '#111114' }}>
        {/* Top accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-green-500/60 to-transparent" />

        {/* Close */}
        <button onClick={handleFinish}
          className="absolute top-4 right-4 text-slate-600 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* SURVEY PHASE */}
        {phase === 'survey' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
              <Shield className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Verify Sentinel</h2>
            <p className="text-slate-400 text-sm mb-8">Tell us how you plan to use the platform so we can tailor your experience.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleUserType('individual')}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-zinc-700/60 hover:border-green-500/40 hover:bg-green-500/5 transition-all">
                <User className="w-8 h-8 text-slate-400 group-hover:text-green-400 transition-colors" />
                <div>
                  <p className="text-white font-semibold text-sm">Individual</p>
                  <p className="text-slate-500 text-xs mt-0.5">Get my own Sentinel ID</p>
                </div>
              </button>
              <button onClick={() => handleUserType('business')}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-zinc-700/60 hover:border-green-500/40 hover:bg-green-500/5 transition-all">
                <Building2 className="w-8 h-8 text-slate-400 group-hover:text-green-400 transition-colors" />
                <div>
                  <p className="text-white font-semibold text-sm">Business</p>
                  <p className="text-slate-500 text-xs mt-0.5">Verify clients & deliver</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TOUR PHASE */}
        {phase === 'tour' && (
          <div className="p-8">
            {/* Step indicator */}
            <div className="flex gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-green-500' : 'bg-slate-700'
                }`} />
              ))}
            </div>

            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
                {current.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{current.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{current.body}</p>
              {current.highlight && (
                <a href={current.highlight}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1.5 rounded-full hover:bg-green-500/20 transition-all">
                  Go to {current.highlightLabel} <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 text-sm hover:text-white transition-all">
                  Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleFinish}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Get Started
                </button>
              )}
            </div>

            <button onClick={handleFinish} className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Skip tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}