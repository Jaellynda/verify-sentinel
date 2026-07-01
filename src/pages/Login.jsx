import { useState } from 'react';
import { supabase } from '@/api/base44Client';
import { Shield, Mail, CheckCircle, Loader2, User, Building2 } from 'lucide-react';
import HexBackground from '../components/HexBackground';

export default function Login() {
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const redirectTo = accountType === 'business'
      ? 'https://verify-sentinel.tegusystems.com/verify'
      : 'https://verify-sentinel.tegusystems.com/get-id';

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      setError(error.message);
    } else {
      // Store account type in localStorage so we can save it after redirect
      localStorage.setItem('pending_account_type', accountType);
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060B13' }}>
      <HexBackground opacity={0.07} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(74,222,128,0.15)]">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify Sentinel</h1>
          <p className="text-slate-400 text-sm">Enter your email to get started. No password needed.</p>
        </div>

        {!sent ? (
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setAccountType('individual')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  accountType === 'individual'
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}>
                <User className="w-5 h-5" />
                <span className="text-xs font-semibold">Individual</span>
                <span className="text-xs text-center leading-tight opacity-70">Get a Sentinel ID for your home</span>
              </button>
              <button type="button" onClick={() => setAccountType('business')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  accountType === 'business'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}>
                <Building2 className="w-5 h-5" />
                <span className="text-xs font-semibold">Business</span>
                <span className="text-xs text-center leading-tight opacity-70">Verify customers and manage KYC</span>
              </button>
            </div>

            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500/60 placeholder-slate-600"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button type="submit" disabled={loading || !email.trim()}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                accountType === 'business'
                  ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_25px_rgba(59,130,246,0.3)]'
                  : 'bg-green-500 hover:bg-green-400 text-black shadow-[0_0_25px_rgba(74,222,128,0.3)]'
              }`}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Magic Link →'}
            </button>

            <p className="text-center text-xs text-slate-600">
              We will email you a secure link. No password required.
            </p>
          </form>
        ) : (
          <div className="p-6 rounded-2xl border border-green-500/30 bg-green-500/5 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Check your email</p>
            <p className="text-slate-400 text-sm">We sent a magic link to <span className="text-green-400">{email}</span>. Click it to sign in.</p>
            <button onClick={() => setSent(false)}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
