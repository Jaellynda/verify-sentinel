import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight, Zap, Globe, Lock, Users, ArrowRight } from 'lucide-react';
import HexBackground from '../components/HexBackground';
import { translate } from '../lib/i18n';

export default function Landing({ lang = 'en' }) {
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const observerRef = useRef(null);

  const tr = (key) => translate(lang, key);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) setVisibleSections(prev => ({ ...prev, [e.target.id]: true }));
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('[data-animate]').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const features = [
    { title: 'Precision Location Identity', desc: 'Stable location zones that do not change when you move a few steps. Your address stays yours.' },
    { title: '100% Offline Generation', desc: 'Sentinel ID computed entirely on-device from your GPS signal. Zero data or internet needed.' },
    { title: 'Anti-Fraud Persistence', desc: '3-consecutive-night detection algorithm prevents fake address claims. Trust score builds over time.' },
    { title: 'East African First', desc: 'Built for Uganda, Kenya, Rwanda, DRC with open architecture for all East and Central African nations. Supports English, Luganda, Swahili, and French.' },
    { title: 'Last-Mile Delivery', desc: 'Deep links to Google Maps and Apple Maps from any Sentinel ID. Delivery drivers arrive first time.' },
    { title: 'Bank-Grade Verification', desc: 'Trust Score integrates neighbor vouching and persistence data for credit-ready location identity.' },
  ];

  const stats = [
    { value: '100%', label: 'Offline Capable' },
    { value: '<2min', label: 'ID Generation Time' },
    { value: '4+', label: 'Countries Supported' },
    { value: 'KYC', label: 'Bank-Grade Trust Score' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <HexBackground scrollY={scrollY} opacity={0.12} />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="absolute top-24 right-4 md:right-8 flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-green-400 font-medium">{tr('forge_offline_safe')}</span>
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium uppercase tracking-widest mb-8">
            <Shield className="w-3.5 h-3.5" />
            Digital Addressing Solution
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6"
            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.03em' }}>
            {tr('hero_headline').split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'text-green-400 block' : 'block'}>{line}</span>
            ))}
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            {tr('hero_sub')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/get-id"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-semibold text-base transition-all duration-300 shadow-[0_0_30px_rgba(74,222,128,0.3)] hover:shadow-[0_0_40px_rgba(74,222,128,0.5)] w-full sm:w-auto justify-center">
              <Shield className="w-5 h-5" />
              {tr('cta_individual')}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/verify"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl border border-green-500/40 text-green-400 hover:bg-green-500/10 font-semibold text-base transition-all duration-300 w-full sm:w-auto justify-center">
              <Zap className="w-5 h-5" />
              {tr('cta_business')}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 px-4 py-8 border-y border-zinc-800"
        style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}>{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Persona Cards */}
      <section id="personas" data-animate className="relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Who Is This For?</h2>
            <p className="text-slate-500">Two use cases, one immutable infrastructure.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="group relative p-8 rounded-3xl border border-green-900/30 overflow-hidden transition-all duration-300 hover:border-green-500/40"
              style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 text-2xl">👤</div>
              <h3 className="text-xl font-bold text-green-400 mb-2">{tr('persona_individual')}</h3>
              <p className="text-slate-400 mb-6">{tr('persona_individual_sub')}</p>
              <ul className="space-y-2 mb-8">
                {['Works 100% offline', 'Shareable with banks and couriers', 'Builds trust over 3 nights', 'Multilingual support'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{f}
                  </li>
                ))}
              </ul>
              <Link to="/get-id" className="flex items-center gap-2 text-green-400 font-semibold text-sm group-hover:gap-3 transition-all">
                Get My Sentinel ID <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="group relative p-8 rounded-3xl border border-zinc-800 overflow-hidden transition-all duration-300 hover:border-green-500/30"
              style={{ background: '#18181b' }}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 text-2xl">🏢</div>
              <h3 className="text-xl font-bold text-green-400 mb-2">{tr('persona_business')}</h3>
              <p className="text-zinc-400 mb-6">{tr('persona_business_sub')}</p>
              <ul className="space-y-2 mb-8">
                {['Instant verification API', 'Trust score integration', 'Last-mile delivery maps', 'Bank KYC ready'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{f}
                  </li>
                ))}
              </ul>
              <Link to="/verify" className="flex items-center gap-2 text-green-400 font-semibold text-sm group-hover:gap-3 transition-all">
                Verify a Client <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-4 py-20 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-green-400 mb-3">The Technology</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Precision spatial identity, computed entirely on-device. Immutable, verifiable, and works without internet.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-zinc-800 hover:border-green-500/30 transition-all group"
                style={{ background: '#18181b' }}>
                <h4 className="text-white font-semibold mb-2 group-hover:text-green-400 transition-colors">{f.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Addressing Challenges Section */}
      <section className="relative z-10 px-4 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium uppercase tracking-widest mb-4">
              The Problem We Solve
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">When There Is No Street Name</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Over 1 billion people live in areas with no formal address. Sentinel IDs give every kiosk, shack, and borehole a permanent, verifiable identity.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              {
                title: 'Kiosks and Shacks',
                problem: 'No house number. No street name. No postal code.',
                solution: 'Your Sentinel ID is the address. A precise location zone uniquely identifies your structure regardless of what surrounds it.',
                color: 'border-amber-500/20',
              },
              {
                title: 'Unnamed Roads',
                problem: '70%+ of roads in Uganda have no official name. Delivery fails.',
                solution: 'Landmark anchors (kiosk, borehole, church) replace street names with real-world reference points that locals actually use.',
                color: 'border-blue-500/20',
              },
              {
                title: 'GPS Drift and Jitter',
                problem: 'A standard pin can jump 20 to 50m, placing deliveries at the wrong compound.',
                solution: 'Our anti-drift system locks your position to a stable zone. GPS jitter cannot move you to a neighbour\'s address.',
                color: 'border-green-500/20',
              },
            ].map((c, i) => (
              <div key={i} className={`p-6 rounded-2xl border ${c.color} bg-zinc-900`}>
                <h4 className="text-white font-semibold mb-3">{c.title}</h4>
                <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 leading-relaxed">{c.problem}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 leading-relaxed">{c.solution}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-3xl border border-zinc-700"
            style={{ background: '#18181b' }}>
            <h3 className="text-lg font-bold text-white text-center mb-6">Pin Drop vs. Sentinel ID — Last-Mile Delivery</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-red-900/40 bg-red-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-red-400 font-semibold text-sm">Standard Pin Drop</span>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Coordinates jump 20 to 50m with GPS jitter',
                    'No proof the person lives there',
                    'Driver still lost without street context',
                    'Anyone can drop a fake pin',
                    'No trust signal for banks or couriers',
                    'Address changes silently with no audit trail',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">x</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-2xl border border-green-900/40 bg-green-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-400 font-semibold text-sm">Sentinel ID</span>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Stable location zone. GPS drift cannot change your ID',
                    '3-night check-in proves habitation, not just presence',
                    'Landmark anchors guide drivers to the exact compound',
                    'Anti-fraud: location boundary enforcement and time lock',
                    'Trust score is a verifiable signal for KYC and credit',
                    'Immutable address history trail when you move',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Northern Corridor Section */}
      <section className="relative z-10 px-4 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-3xl border border-green-500/20" style={{ background: '#18181b' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 text-xs font-semibold uppercase tracking-widest">Cross-Border Infrastructure</p>
                <h2 className="text-xl font-bold text-white">Crossing the Northern Corridor</h2>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Sentinel IDs are <span className="text-green-400 font-semibold">cross-border compatible</span>, unlocking <span className="text-white font-bold">$100B in regional trade potential</span> between Mombasa, Kampala, and Goma. A driver in Mombasa can navigate to a Sentinel address in Goma with zero data. The location system is universal.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Mombasa Port', 'Kampala Hub', 'Goma Gateway', 'Kigali Corridor'].map(c => (
                <span key={c} className="px-3 py-1.5 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400 font-medium">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800 px-4 py-10"
        style={{ background: '#0a0a0a' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              <span className="font-bold text-white">VerifySentinel</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {['Uganda', 'Kenya', 'Rwanda', 'DRC'].map(c => (
                <span key={c} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">{c}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-zinc-800"
            style={{ background: '#18181b' }}>
            {[
              { label: 'ID Generation', value: 'Offline' },
              { label: 'Countries Supported', value: '4+' },
              { label: 'EA Regional Satellites', value: 'Active' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-xs text-slate-600 mb-0.5">{item.label}</div>
                <div className="text-sm font-mono text-green-400">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center text-xs text-slate-700">
            2025 Verify Sentinel · Digital Identity Layer for East Africa
          </div>
        </div>
      </footer>
    </div>
  );
}
