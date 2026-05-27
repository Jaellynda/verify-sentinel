import { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react';

/**
 * Renders a QR code for a given Sentinel ID using the qrcode CDN library.
 * The QR encodes the sentinel_id directly for scanning by QRVouchScanner.
 */
export default function SentinelQRDisplay({ sentinelId, size = 140 }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sentinelId) return;

    const generate = () => {
      if (!window.QRCode) return;
      if (!canvasRef.current) return;
      const qr = new window.QRCode(canvasRef.current, {
        text: sentinelId,
        width: size,
        height: size,
        colorDark: '#ffffff',
        colorLight: '#18181b',
        correctLevel: window.QRCode.CorrectLevel.H,
      });
      setReady(true);
    };

    if (window.QRCode) {
      generate();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.onload = generate;
      document.head.appendChild(script);
    }
  }, [sentinelId, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-xl overflow-hidden border border-slate-700/40 p-2"
        style={{ background: '#18181b', width: size + 16, height: size + 16 }}
      >
        {!ready && (
          <div className="flex items-center justify-center" style={{ width: size, height: size }}>
            <QrCode className="w-8 h-8 text-slate-600" />
          </div>
        )}
        <div ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
      </div>
      <p className="text-xs text-slate-600">Scan to vouch</p>
    </div>
  );
}