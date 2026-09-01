import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic motion backdrop for the hero. If /assets/hero-loop.mp4 exists it
 * plays as a muted background video; otherwise an ambient canvas renders slow
 * drifting market-lines in champagne tones. Reduced motion: static gradient.
 */
export function HeroBackdrop({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    if (reduced || videoOk) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    }
    resize();
    window.addEventListener('resize', resize);

    // Three slow-drifting lines, each a layered sine "price path".
    const LINES = [
      { amp: 0.05, speed: 0.00022, y: 0.62, alpha: 0.16, width: 1.6 },
      { amp: 0.08, speed: 0.00013, y: 0.72, alpha: 0.10, width: 1.2 },
      { amp: 0.035, speed: 0.00031, y: 0.5, alpha: 0.07, width: 1.0 },
    ];

    function draw() {
      if (!canvas || !ctx) return;
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      t += 16;
      for (const line of LINES) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6 * dpr) {
          const p = x / w;
          const y =
            h * line.y +
            Math.sin(p * 7 + t * line.speed) * h * line.amp +
            Math.sin(p * 19 + t * line.speed * 2.3) * h * line.amp * 0.35;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(214, 183, 122, ${line.alpha})`;
        ctx.lineWidth = line.width * dpr;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced, videoOk]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {!reduced && videoOk && (
        <video
          autoPlay
          muted
          loop
          playsInline
          src="/assets/hero-loop.mp4"
          onError={() => setVideoOk(false)}
          className="h-full w-full object-cover opacity-40"
        />
      )}
      {!reduced && !videoOk && (
        <canvas ref={canvasRef} className="h-full w-full" />
      )}
      {/* Vignette keeps the dial and type readable over any backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(27,21,17,0.85) 78%)' }}
      />
    </div>
  );
}
