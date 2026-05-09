import { useState } from 'react';
import { Shield, Upload, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUS_CONFIG = {
  Verified: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '✓' },
  Pending:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: '⏳' },
  Failed:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: '✗' },
};

export default function NIRAVerification({ addressId, userEmail, onVerified }) {
  const [existing, setExisting] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState('intro'); // intro | form | uploading | result
  const [form, setForm] = useState({ nira_nin: '', full_name: '', dob: '', district: '' });
  const [ninCard, setNinCard] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [showNin, setShowNin] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load existing verification on mount
  useState(() => {
    (async () => {
      const records = await base44.entities.NIRAVerification.filter({ sentinel_address_id: addressId }, '-created_date', 1);
      if (records.length) setExisting(records[0]);
      setLoaded(true);
    })();
  });

  if (!loaded) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
    </div>
  );

  // Already verified
  if (existing?.verification_status === 'Verified') {
    return (
      <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-400">NIRA Identity Verified</p>
            <p className="text-xs text-slate-500">NIN: ••••••••••{existing.nira_nin?.slice(-4)} · {existing.full_name_on_card}</p>
            <p className="text-xs text-slate-600 mt-0.5">Confidence: {existing.match_confidence}% · Verified {new Date(existing.verified_at).toLocaleDateString()}</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-bold">KYC ✓</span>
          </div>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleSubmit = async () => {
    if (!form.nira_nin || !form.full_name || !ninCard || !selfie) return;
    setLoading(true);
    setStep('uploading');

    const ninUrl = await handleFileUpload(ninCard);
    const selfieUrl = await handleFileUpload(selfie);

    // AI face + document match
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a KYC document verifier. Compare these two images:
1. A Uganda NIRA NIN card image
2. A selfie photo of the person

Also verify that the name "${form.full_name}" and NIN "${form.nira_nin}" are consistent with what is visible on the card.

Return a JSON with:
- match: boolean (true if face on card matches selfie)
- confidence: number 0-100 (face match confidence)
- name_match: boolean (name visible on card matches provided name)
- nin_visible: boolean (NIN number is visible on card)
- reason: string (brief explanation)`,
      file_urls: [ninUrl, selfieUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          match: { type: 'boolean' },
          confidence: { type: 'number' },
          name_match: { type: 'boolean' },
          nin_visible: { type: 'boolean' },
          reason: { type: 'string' },
        },
      },
    });

    const status = aiResult.match && aiResult.confidence >= 70 ? 'Verified' : 'Failed';

    const record = await base44.entities.NIRAVerification.create({
      user_email: userEmail,
      sentinel_address_id: addressId,
      nira_nin: form.nira_nin.toUpperCase(),
      full_name_on_card: form.full_name,
      date_of_birth: form.dob,
      district_of_origin: form.district,
      verification_status: status,
      verified_at: status === 'Verified' ? new Date().toISOString() : null,
      nin_card_image_url: ninUrl,
      selfie_image_url: selfieUrl,
      match_confidence: aiResult.confidence || 0,
      failure_reason: status === 'Failed' ? aiResult.reason : null,
    });

    setResult({ status, confidence: aiResult.confidence, reason: aiResult.reason });
    setExisting(record);
    setLoading(false);
    setStep('result');
    if (status === 'Verified' && onVerified) onVerified();
  };

  if (step === 'intro') return (
    <div className="p-5 rounded-2xl border border-blue-900/40 bg-blue-950/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">NIRA Identity Verification</p>
          <p className="text-xs text-slate-400 mt-0.5">Link your Uganda National ID (NIN) to this address for full KYC compliance — accepted by banks, insurers, and lenders.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { icon: '🏦', label: 'Bank KYC Ready' },
          { icon: '🔒', label: 'AI Face Match' },
          { icon: '📋', label: 'NIN Validation' },
          { icon: '⚡', label: 'Instant Result' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/30">
            <span className="text-base">{icon}</span>
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
      {existing?.verification_status === 'Failed' && (
        <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 font-semibold">Previous attempt failed</p>
          <p className="text-xs text-slate-500 mt-0.5">{existing.failure_reason}</p>
        </div>
      )}
      <button onClick={() => setStep('form')}
        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
        <Shield className="w-4 h-4" /> Verify with NIRA NIN
      </button>
    </div>
  );

  if (step === 'form') return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-blue-400" />
        <p className="text-sm font-semibold text-white">Enter Your NIN Details</p>
      </div>

      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">National Identification Number (NIN)</label>
        <div className="relative">
          <input
            type={showNin ? 'text' : 'password'}
            placeholder="CM9000123456ABCD"
            value={form.nira_nin}
            onChange={e => setForm(p => ({ ...p, nira_nin: e.target.value.toUpperCase() }))}
            maxLength={16}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600 font-mono pr-10"
          />
          <button onClick={() => setShowNin(s => !s)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
            {showNin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Full Name (as on card)</label>
          <input type="text" placeholder="FIRSTNAME LASTNAME"
            value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value.toUpperCase() }))}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">District of Origin</label>
          <input type="text" placeholder="e.g. Kampala"
            value={form.district}
            onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600"
          />
        </div>
      </div>

      {/* NIN Card Upload */}
      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">NIN Card Photo</label>
        <label className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          ninCard ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/50 hover:border-blue-500/30 bg-slate-900/40'
        }`}>
          <Upload className={`w-5 h-5 ${ninCard ? 'text-blue-400' : 'text-slate-600'}`} />
          <span className="text-xs text-slate-400">{ninCard ? ninCard.name : 'Tap to upload NIN card photo'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={e => setNinCard(e.target.files[0])} />
        </label>
      </div>

      {/* Selfie Upload */}
      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Selfie Photo</label>
        <label className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          selfie ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/50 hover:border-blue-500/30 bg-slate-900/40'
        }`}>
          <Upload className={`w-5 h-5 ${selfie ? 'text-blue-400' : 'text-slate-600'}`} />
          <span className="text-xs text-slate-400">{selfie ? selfie.name : 'Tap to upload a clear selfie'}</span>
          <input type="file" accept="image/*" capture="user" className="hidden" onChange={e => setSelfie(e.target.files[0])} />
        </label>
      </div>

      <p className="text-xs text-slate-600 text-center">🔒 Images are processed securely by AI and never shared.</p>

      <div className="flex gap-3">
        <button onClick={() => setStep('intro')} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-all">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!form.nira_nin || !form.full_name || !ninCard || !selfie || loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><Shield className="w-4 h-4" /> Submit</>}
        </button>
      </div>
    </div>
  );

  if (step === 'uploading') return (
    <div className="flex flex-col items-center py-8 gap-3">
      <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-white font-semibold">Verifying your identity…</p>
      <p className="text-xs text-slate-500">AI is matching your face and NIN card. This takes ~10 seconds.</p>
    </div>
  );

  if (step === 'result') return (
    <div className={`p-5 rounded-2xl border ${result.status === 'Verified' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
      <div className="flex items-center gap-3 mb-3">
        {result.status === 'Verified'
          ? <CheckCircle className="w-7 h-7 text-emerald-400" />
          : <AlertCircle className="w-7 h-7 text-red-400" />}
        <div>
          <p className={`font-bold text-sm ${result.status === 'Verified' ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.status === 'Verified' ? 'Identity Verified — Full KYC Unlocked' : 'Verification Failed'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {result.status === 'Verified'
              ? `Match confidence: ${result.confidence}%`
              : result.reason}
          </p>
        </div>
      </div>
      {result.status === 'Failed' && (
        <button onClick={() => { setStep('form'); setResult(null); }}
          className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-all">
          Try Again
        </button>
      )}
    </div>
  );

  return null;
}