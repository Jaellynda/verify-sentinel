import { useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, Send, CheckCircle, Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import HexBackground from '../components/HexBackground';

const FAQS = [
  {
    category: 'GPS & Accuracy',
    icon: '📡',
    items: [
      {
        q: 'Why does the GPS take so long to get my location?',
        a: 'The system uses a two-pass strategy. A low-accuracy fix (~200m) renders your Ghost Hexagon within 1–2 seconds. A high-accuracy watch then refines it to Res-9 (~10m) in the background. Indoor usage or cloudy skies can slow the second pass — use the Manual Map Override by tapping your roof on the map to skip the wait.',
      },
      {
        q: 'Why is my accuracy showing ±150m even though I\'m outside?',
        a: 'GPS satellites take time to triangulate. Move to an open area away from tall buildings, wait 15–30 seconds, and the accuracy will improve. Ensure Location Services are set to "Always On" or "While Using App" in your device settings.',
      },
      {
        q: 'What is the Manual Map Override?',
        a: 'If GPS accuracy does not reach 10m within a reasonable time, you can tap your exact position on the dark map shown during ID generation. This places your pin at Res-9 precision immediately, enabling the Save button without waiting for satellite convergence.',
      },
      {
        q: 'Will my Sentinel ID change if I move a few steps?',
        a: 'No. H3 Res-9 hexagons are ~174m² each. Moving a few steps within your compound will not change your H3 index. The "Digital Magnet" (IJK Axial Snapping) locks you to the nearest hex center, making your ID stable even with GPS jitter.',
      },
    ],
  },
  {
    category: 'Residency Tiers',
    icon: '🛡️',
    items: [
      {
        q: 'What is the difference between Visitor, Resident, and Sentinel Permanent?',
        a: 'Visitor is instant — anyone who generates an ID starts here. Resident requires 3 check-ins from your hex over 3 separate days (proving you sleep there). Sentinel Permanent requires 4 weekly pings spread across at least 4 weeks — proving long-term continuous residency. Each tier unlocks higher trust scores accepted by banks and couriers.',
      },
      {
        q: 'Why can Guest addresses never reach Sentinel Permanent?',
        a: 'The Airbnb Mitigation rule prevents short-term guests from fraudulently claiming permanent residency. If you selected "Guest" during setup and are actually an Owner or Tenant, contact support to correct your residency type.',
      },
      {
        q: 'How does the 20-hour time lock work?',
        a: 'To prevent fake check-ins (e.g., someone checking in many times from the same couch), the system enforces a minimum 20-hour gap between check-ins. The dashboard shows a live countdown. This ensures each check-in represents a genuine overnight stay.',
      },
      {
        q: 'How do neighbor vouches affect my trust score?',
        a: 'Each confirmed vouch from a neighbor adds +5 points to your trust score, up to a maximum of +20 points from vouching alone. Vouches are social proof that real neighbors recognize your presence — similar to a credit reference but for physical location.',
      },
    ],
  },
  {
    category: 'Offline Usage',
    icon: '📶',
    items: [
      {
        q: 'Can I generate my Sentinel ID without internet?',
        a: 'Yes. The H3 hexagonal math is fully compiled into the app — no server call is ever made for ID generation. As long as your device can receive GPS satellite signals (which are free radio signals, not data), you can generate, view, and share your Sentinel ID with zero mobile data.',
      },
      {
        q: 'What happens if I check in while offline?',
        a: 'The app detects you are offline and queues the check-in locally in your browser\'s storage (localStorage). Your GPS coordinates and timestamp are saved. The moment your device reconnects to the internet, the app automatically syncs the queued data to the database — you will see a "Synced" banner on the dashboard.',
      },
      {
        q: 'What if I close the app before it syncs?',
        a: 'The offline queue persists in localStorage even after closing the browser. The next time you open the app with connectivity, it will detect and sync the pending check-in automatically.',
      },
    ],
  },
];

const SUBJECTS = ['GPS Accuracy Issue', 'Residency Tier Question', 'Offline Sync Problem', 'Vouch Request', 'Account Issue', 'Other'];

export default function HelpSupport({ lang }) {
  const [openCategory, setOpenCategory] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [form, setForm] = useState({ subject: '', message: '', sentinel_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.subject || !form.message.trim()) return;
    setSubmitting(true);
    const user = await base44.auth.me();
    await base44.entities.SupportTicket.create({
      user_email: user.email,
      user_name: user.full_name,
      subject: form.subject,
      message: form.message,
      sentinel_id: form.sentinel_id || null,
      status: 'Open',
    });
    setSubmitted(true);
    setSubmitting(false);
    setForm({ subject: '', message: '', sentinel_id: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen pt-16" style={{ background: '#060606' }}>
      <HexBackground opacity={0.05} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium uppercase tracking-widest mb-4">
            <MessageSquare className="w-3 h-3" /> Help & Support
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">How Can We Help?</h1>
          <p className="text-slate-500 text-sm">Answers to common questions, and a direct line to our team.</p>
        </div>

        {/* FAQ Sections */}
        {FAQS.map((section, si) => (
          <div key={section.category} className="rounded-2xl border border-slate-800/60 overflow-hidden"
            style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)' }}>
            <button
              onClick={() => setOpenCategory(openCategory === si ? null : si)}
              className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.02] transition-all">
              <span className="text-xl">{section.icon}</span>
              <span className="text-white font-semibold flex-1">{section.category}</span>
              <span className="text-xs text-slate-600 mr-2">{section.items.length} articles</span>
              {openCategory === si
                ? <ChevronDown className="w-4 h-4 text-green-400" />
                : <ChevronRight className="w-4 h-4 text-slate-600" />}
            </button>

            {openCategory === si && (
              <div className="border-t border-slate-800/60">
                {section.items.map((item, ii) => {
                  const key = `${si}-${ii}`;
                  const isOpen = openItem === key;
                  return (
                    <div key={ii} className="border-b border-slate-800/40 last:border-0">
                      <button
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-all">
                        <ChevronRight className={`w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <span className="text-sm text-slate-300 font-medium">{item.q}</span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 pl-11">
                          <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Contact Form */}
        <div className="p-6 rounded-2xl border border-green-900/30"
          style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Contact Support</h2>
              <p className="text-xs text-slate-500">Our team typically responds within 24 hours.</p>
            </div>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <p className="text-white font-semibold">Ticket Submitted</p>
              <p className="text-slate-500 text-sm text-center">We've received your query and will respond to your email within 24 hours.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Subject *</label>
                <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500/60 appearance-none cursor-pointer">
                  <option value="">Select a topic...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Your Sentinel ID (optional)</label>
                <input type="text" placeholder="XXXX-XXXX-XXXX-XXX"
                  value={form.sentinel_id}
                  onChange={e => setForm(p => ({ ...p, sentinel_id: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500/60 placeholder-slate-600 font-mono" />
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Describe your issue *</label>
                <textarea rows={4} placeholder="Please describe your issue in detail. Include any error messages or steps you've already tried..."
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-green-500/60 placeholder-slate-600 resize-none" />
              </div>

              <button onClick={handleSubmit}
                disabled={!form.subject || !form.message.trim() || submitting}
                className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Ticket</>}
              </button>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🛡️', label: 'Get My ID', href: '/get-id' },
            { icon: '🔍', label: 'Verify Client', href: '/verify' },
            { icon: '📊', label: 'Dashboard', href: '/dashboard' },
          ].map(({ icon, label, href }) => (
            <a key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:border-green-500/30 hover:bg-green-500/5 transition-all text-center">
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-slate-400">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}