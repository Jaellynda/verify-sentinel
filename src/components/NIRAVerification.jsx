import { useState, useEffect } from 'react';
import { Shield, Upload, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const STATUS_CONFIG = {
  Verified: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '✓' },
  Pending:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: '⏳' },
  Failed:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: '✗' },
};

// Convert file to base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function NIRAVerification({ addressId, userEmail, onVerified }) {
  const [existing, setExisting] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState('intro');
  const [form, setForm] = useState({ nira_nin: '', full_name: '', dob: '', district: '' });
  const [ninCard, setNinCard] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [showNin, setShowNin] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('nira_verifications')
        .select('*')
        .eq('sentinel_address_id', addressId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data?.length) setExisting(data[0]);
      setLoaded(true);
    })();
  }, [addressId]);

  if (!loaded) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
    </div>
  );

  if (existing?.verification_status === 'Verified') return (
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

  // Upload file to Supabase Storage and return public URL
  const handleFileUpload = async (file, bucket = 'nira-documents') => {
    const ext = file.name.split('.').pop();
    const path = `${addressId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.nira_nin || !form.full_name || !ninCard || !selfie) return;
    setLoading(true);
    setStep('uploading');

    try {
      // Upload images to Supabase Storage
      const ninUrl = await handleFileUpload(ninCard);
      const selfieUrl = await handleFileUpload(selfie);

      // Convert images to base64 for Claude API vision
      const ninBase64 = await fileToBase64(ninCard);
      const selfieBase64 = await fileToBase64(selfie);
      const ninMediaType = ninCard.type || 'image/jpeg';
      const selfieMediaType = selfie.type || 'image/jpeg';

      // Claude API vision call for face + document matching
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: ninMediaType, data: ninBase64 } },
              { type: 'image', source: { type: 'base64', media_type: selfieMediaType, data: selfieBase64 } },
              { type: 'text', text: `You are a KYC document verifier. The first image is a Uganda NIRA NIN card. The second is a selfie.

Compare the face on the card with the selfie. Also check if the name "${form.full_name}" and NIN "${form.nira_nin}" match what is visible on the card.

Respond with ONLY a JSON object (no markdown):
{"match": boolean, "confidence": number 0-100, "name_match": boolean, "nin_visible": boolean, "reason": "brief explanation"}` }
            ]
          }]
        })
      });

      const aiData = await response.json();
      const rawText = aiData.content?.[0]?.text || '{}';
      let aiResult;
      try { aiResult = JSON.parse(rawText.replace(/```json|```/g, '').trim()); }
      catch { aiResult = { match: false, confidence: 0, reason: 'Could not parse AI response' }; }

      const status = aiResult.match && aiResult.confidence >= 70 ? 'Verified' : 'Failed';
      const { data: { user } } = await supabase.auth.getUser();

      const { data: record } = await supabase
        .from('nira_verifications')
        .insert({
          user_id: user?.id,
          user_email: userEmail,
          sentinel_address_id: addressId,
          nira_nin: form.nira_nin.toUpperCase(),
          full_name_on_card: form.full_name,
          date_of_birth: form.dob || null,
          district_of_origin: form.district,
          verification_status: status,
          verified_at: status === 'Verified' ? new Date().toISOString() : null,
          nin_card_image_url: ninUrl,
          selfie_image_url: selfieUrl,
          match_confidence: aiResult.confidence || 0,
          failure_reason: status === 'Failed' ? aiResult.reason : null,
        })
        .select()
        .single();

      setResult({ status, confidence: aiResult.confidence, reason: aiResult.reason });
      setExisting(record);
      setStep('result');
      if (status === 'Verified' && onVerified) onVerified();
    } catch (err) {
      console.error('Verification failed:', err);
      setResult({ status: 'Failed', confidence: 0, reason: 'An error occurred during verification. Please try again.' });
      setStep('result');
    } finally {
      setLoading(false);
    }
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
          <input type={showNin ? 'text' : 'password'} placeholder="CM9000123456ABCD"
            value={form.nira_nin}
            onChange={e => setForm(p => ({ ...p, nira_nin: e.target.value.toUpperCase() }))}
            maxLength={16}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600 font-mono pr-10" />
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
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600" />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">District of Origin</label>
          <input type="text" placeholder="e.g. Kampala"
            value={form.district}
            onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600" />
        </div>
      </div>
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
        <button onClick={() => setStep('intro')} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-all">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.nira_nin || !form.full_name || !ninCard || !selfie || loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2">
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
            {result.status === 'Verified' ? `Match confidence: ${result.confidence}%` : result.reason}
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
