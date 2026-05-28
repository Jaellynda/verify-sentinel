import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/api/base44Client';

export default function QRVouchScanner({ onVouchComplete }) {
  const [mode, setMode] = useState('idle');
  const [manualId, setManualId] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedId, setScannedId] = useState('');
  const [targetInfo, setTargetInfo] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      document.head.appendChild(script);
    }
    return stopCamera;
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startScanning = async () => {
    setMode('scanning');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      intervalRef.current = setInterval(() => {
        if (!videoRef.current || !window.jsQR) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (!canvas.width) return;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopCamera();
          processScannedData(code.data);
        }
      }, 300);
    } catch {
      stopCamera();
      setMode('manual');
      setErrorMsg('Camera unavailable — enter the Sentinel ID manually below.');
    }
  };

  const processScannedData = async (raw) => {
    stopCamera();
    let sid = raw.trim();
    try { const parsed = JSON.parse(raw); sid = parsed.sentinel_id || sid; } catch {}
    setScannedId(sid);
    setMode('processing');
    await performVouch(sid);
  };

  const performVouch = async (sid) => {
    setMode('processing');
    setErrorMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('You must be logged in to vouch.');
      setMode('error');
      return;
    }

    // Check voucher has an address and is Resident+
    const { data: myAddrs } = await supabase
      .from('sentinel_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!myAddrs?.length) {
      setErrorMsg('You need a Sentinel Address to vouch for others.');
      setMode('error');
      return;
    }
    if (myAddrs[0].status === 'Visitor') {
      setErrorMsg('Only Resident-tier or above can vouch for others. Keep checking in to level up.');
      setMode('error');
      return;
    }

    // Find target address
    const { data: targets } = await supabase
      .from('sentinel_addresses')
      .select('*')
      .eq('sentinel_id', sid)
      .limit(1);

    if (!targets?.length) {
      setErrorMsg(`Sentinel ID "${sid}" not found. Verify the QR code and try again.`);
      setMode('error');
      return;
    }
    const target = targets[0];
    setTargetInfo(target);

    if (target.user_id === user.id) {
      setErrorMsg('You cannot vouch for your own address.');
      setMode('error');
      return;
    }

    // Create vouch record
    await supabase.from('vouches').insert({
      voucher_id: user.id,
      voucher_email: user.email,
      target_sentinel_id: sid,
      target_h3_index: target.h3_index,
      target_address_id: target.id,
      message: message || 'QR vouch scan',
      status: 'Confirmed',
    });

    // Update target trust score
    const newVouches = (target.vouches_count || 0) + 1;
    const newScore = Math.min(100, (target.trust_score || 30) + 5);

    await supabase
      .from('sentinel_addresses')
      .update({ vouches_count: newVouches, trust_score: newScore })
      .eq('id', target.id);

    await supabase.from('trust_score_history').insert({
      sentinel_address_id: target.id,
      user_id: target.user_id,
      user_email: target.user_email,
      score: newScore,
      event: 'vouch_received',
      notes: `QR vouch by ${user.email}`,
    });

    setMode('done');
    if (onVouchComplete) onVouchComplete(target.id, newScore);
  };

  const reset = () => {
    stopCamera();
    setMode('idle');
    setManualId('');
    setMessage('');
    setErrorMsg('');
    setScannedId('');
    setTargetInfo(null);
  };

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/30">
        <QrCode className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-white">QR Vouch Scanner</span>
        <span className="ml-auto text-xs text-slate-500">Residents &amp; above only</span>
      </div>

      <div className="p-4">
        {mode === 'idle' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Scan a neighbor's QR code to instantly vouch for their Sentinel Address.</p>
            <button onClick={startScanning}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition-all">
              <Camera className="w-4 h-4" /> Scan QR Code
            </button>
            <button onClick={() => setMode('manual')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700/40 text-slate-400 text-sm hover:text-white transition-all">
              Enter Sentinel ID Manually
            </button>
          </div>
        )}

        {mode === 'scanning' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ height: 200 }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-blue-400/60 rounded-xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-xs text-blue-300 bg-black/60 px-3 py-1 rounded-full">Point at QR code</span>
              </div>
            </div>
            <button onClick={reset} className="w-full py-2 rounded-xl border border-slate-700/40 text-slate-400 text-sm flex items-center justify-center gap-2 hover:text-white transition-all">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-3">
            {errorMsg && <p className="text-xs text-amber-400">{errorMsg}</p>}
            <input type="text" placeholder="e.g. 8921-F3A2-B100-9E7"
              value={manualId} onChange={e => setManualId(e.target.value.toUpperCase())}
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600 font-mono" />
            <input type="text" placeholder="Optional vouch message"
              value={message} onChange={e => setMessage(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600" />
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-2 rounded-xl border border-slate-700/40 text-slate-400 text-sm hover:text-white transition-all">Cancel</button>
              <button onClick={() => performVouch(manualId)} disabled={!manualId.trim()}
                className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-40">
                Vouch
              </button>
            </div>
          </div>
        )}

        {mode === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400">Verifying and updating trust score…</p>
          </div>
        )}

        {mode === 'done' && targetInfo && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Vouch Confirmed!</p>
              <p className="text-xs text-slate-500 mt-1">Trust score for <span className="text-emerald-400 font-mono">{targetInfo.sentinel_id}</span> updated immediately.</p>
              <p className="text-xs text-slate-600 mt-0.5">+5 trust points added</p>
            </div>
            <button onClick={reset} className="mt-2 px-5 py-2 rounded-xl border border-slate-700/40 text-slate-400 text-sm hover:text-white transition-all">
              Vouch Another
            </button>
          </div>
        )}

        {mode === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button onClick={reset} className="px-5 py-2 rounded-xl border border-slate-700/40 text-slate-400 text-sm hover:text-white transition-all">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
