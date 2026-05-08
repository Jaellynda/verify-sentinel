import { useState, useEffect } from 'react';
import { Shield, MapPin, Zap, Users, ArrowRight, X, CheckCircle, Building2, User, Map, Navigation } from 'lucide-react';

const STEPS_INDIVIDUAL = [
  {
    icon: <Shield className="w-8 h-8 text-green-400" />,
    title: 'Welcome to Verify Sentinel',
    body: 'Your permanent digital address — generated offline from GPS coordinates using H3 hexagonal math. No street name required.',
    tag: 'Step 1 of 5',
  },
  {
    icon: <Navigation className="w-8 h-8 text-green-400" />,
    title: 'Step 1 — Generate Your Sentinel ID',
    body: 'Tap "Get My ID" in the top navigation. Allow GPS access and wait for the hexagon to lock at Res-9 precision (~174m²). Or tap your exact location on the map.',
    highlight: '/get-id',
    highlightLabel: 'Go to Get My ID →',
    tag: 'Step 2 of 5',
  },
  {
    icon: <Map className="w-8 h-8 text-green-400" />,
    title: 'Step 2 — Find Yourself on the Hex Map',
    body: 'Visit the Hex Map and search your coordinates or address. Your hexagon will highlight in green — claimed hexagons show trust scores and vouch counts.',
    highlight: '/map',
    highlightLabel: 'Open Hex Map →',
    tag: 'Step 3 of 5',
  },
  {
    icon: <Zap className="w-8 h-8 text-green-400" />,
    title: 'Step 3 — Build Your Trust Score',
    body: 'Check in from your location 3 nights in a row to earn Resident status. Your Dashboard tracks your score, check-in streak, and weekly pings.',
    highlight: '/dashboard',
    highlightLabel: 'Go to Dashboard →',
    tag: 'Step 4 of 5',
  },
  {
    icon: <Users className="w-8 h-8 text-green-400" />,
    title: 'Step 4 — Get Vouched by Neighbors',
    body: 'Share your Sentinel ID with neighbours. Each confirmed vouch adds +5 trust points. 4 vouches = maximum social proof for banks and couriers.',
    tag: 'Step 5 of 5',
  },
];

const STEPS_BUSINESS = [
  {
    icon: <Shield className="w-8 h-8 text-green-400" />,
    title: 'Welcome to Verify Sentinel',
    body: 'Instantly verify client addresses, trust scores, and location identity — no street names needed across East Africa.',
    tag: 'Step 1 of 4',
  },
  {
    icon: <Zap className="w-8 h-8 text-green-400" />,
    title: 'Step 1 — Verify a Client',
    body: 'Go to the Verify page, enter any client\'s Sentinel ID to instantly retrieve their trust score, residency tier, check-in history, and last-mile navigation link.',
    highlight: '/verify',
    highlightLabel: 'Go to Verify →',
    tag: 'Step 2 of 4',
  },
  {
    icon: <Map className="w-8 h-8 text-green-400" />,
    title: 'Step 2 — Explore the Hex Map',
    body: 'Browse the live H3 hexagonal map. Click any claimed hexagon to view trust scores, vouch counts, and residency tiers. Use search to navigate to any address or coordinate.',
    highlight: '/map',
    highlightLabel: 'Open Hex Map →',
    tag: 'Step 3 of 4',
  },
  {
    icon: <Building2 className="w-8 h-8 text-green-400" />,
    title: 'Step 3 — Bank & KYC Ready',
    body: 'Trust Score integrates neighbor vouching + check-in persistence. Ideal for credit scoring, insurance, last-mile delivery, and formal address verification.',
    tag: 'Step 4 of 4',
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
            {/* Tag + step indicator */}
            <div className="flex items-center justify-between mb-3">
              {current.tag && (
                <span className="text-xs text-slate-600 font-mono">{current.tag}</span>
              )}
            </div>
            <div className="flex gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-green-500' : 'bg-slate-700'
                }`} />
              ))}
            </div>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                {current.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{current.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{current.body}</p>
              {current.highlight && (
                <a href={current.highlight}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-green-400 border border-green-500/30 bg-green-500/10 px-4 py-2 rounded-full hover:bg-green-500/20 transition-all font-semibold">
                  {current.highlightLabel} <ArrowRight className="w-3 h-3" />
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