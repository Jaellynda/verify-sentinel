import { useEffect, useRef } from 'react';

/**
 * TrustArc — Semi-circular gauge that visualizes the Trust Score.
 * Gamifies the 3-night persistence verification period.
 * Score range: 0–100. Visual fill animates from current → target.
 */
export default function TrustArc({ score = 0, nights = 0, maxNights = 3 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size * 0.65;

    const cx = size / 2;
    const cy = size * 0.62;
    const radius = size * 0.38;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    let current = 0;
    const target = (score / 100) * Math.PI;

    function draw(progress) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(59,130,246,0.12)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Track ticks
      for (let i = 0; i <= 10; i++) {
        const angle = startAngle + (i / 10) * Math.PI;
        const inner = radius - 16;
        const outer = radius - 8;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
        ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
        ctx.strokeStyle = 'rgba(59,130,246,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Filled arc
      if (progress > 0) {
        const fillEnd = startAngle + progress;
        const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, '#3B82F6');
        grad.addColorStop(1, '#10B981');
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, fillEnd);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#3B82F6';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Tip dot
        const tipX = cx + radius * Math.cos(fillEnd);
        const tipY = cy + radius * Math.sin(fillEnd);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#10B981';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Score text
      ctx.font = 'bold 36px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(score, cx, cy - 6);

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillText('TRUST SCORE', cx, cy + 14);
    }

    // Animate
    const duration = 1200;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad
      current = eased * target;
      draw(current);
      if (t < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [score, nights]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} style={{ width: 200, height: 130 }} />
      {/* Persistence Nodes */}
      <div className="flex gap-3 mt-2">
        {Array.from({ length: maxNights }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-500 ${
              i < nights
                ? 'bg-emerald-500/20 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-800/60 border-slate-700/50'
            }`}>
              <svg viewBox="0 0 24 24" className={`w-4 h-4 ${i < nights ? 'text-emerald-400' : 'text-slate-600'}`}>
                <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <span className={`text-xs ${i < nights ? 'text-emerald-400' : 'text-slate-600'}`}>
              N{i + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}