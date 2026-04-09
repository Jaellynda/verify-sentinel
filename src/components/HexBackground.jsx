import { useEffect, useRef } from 'react';

/**
 * HexBackground — Animated H3-style hexagonal grid canvas.
 * Renders a parallax hex grid that shifts on scroll, simulating
 * a satellite view moving overhead. All rendering is on-device,
 * zero external dependencies beyond React.
 */
export default function HexBackground({ scrollY = 0, opacity = 0.15 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const HEX_SIZE = 48;
    const HEX_H = HEX_SIZE * Math.sqrt(3);
    const HEX_W = HEX_SIZE * 2;

    function drawHex(x, y, size, alpha, glowing = false) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();

      if (glowing) {
        ctx.strokeStyle = `rgba(59,130,246,${alpha * 3})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#3B82F6';
      } else {
        ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
    }

    function drawScanLine(t) {
      const y = ((t * 0.4) % (canvas.height + 100)) - 50;
      const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      grad.addColorStop(0, 'rgba(59,130,246,0)');
      grad.addColorStop(0.5, 'rgba(59,130,246,0.08)');
      grad.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 40, canvas.width, 80);
    }

    let lastTime = 0;
    function animate(time) {
      const dt = time - lastTime;
      lastTime = time;
      timeRef.current += dt;
      const t = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Parallax offset from scroll
      const parallaxX = scrollY * 0.1;
      const parallaxY = scrollY * 0.15;
      const rotateOffset = scrollY * 0.0002;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotateOffset);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const cols = Math.ceil(canvas.width / (HEX_W * 0.75)) + 4;
      const rows = Math.ceil(canvas.height / HEX_H) + 4;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const x = col * HEX_W * 0.75 + parallaxX % HEX_W;
          const y = row * HEX_H + (col % 2) * (HEX_H / 2) + parallaxY % HEX_H;

          // Pulse certain hexagons based on time
          const pulseKey = (col * 7 + row * 13) % 40;
          const pulsePhase = (t / 3000 + pulseKey / 40) % 1;
          const isPulsing = pulsePhase < 0.05;
          const pulseAlpha = isPulsing ? 0.6 + Math.sin(pulsePhase * Math.PI * 40) * 0.4 : opacity;

          drawHex(x, y, HEX_SIZE - 2, pulseAlpha, isPulsing);
        }
      }

      ctx.restore();

      // Scan line effect
      drawScanLine(t);

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [scrollY, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity }}
    />
  );
}