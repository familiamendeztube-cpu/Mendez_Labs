import { useEffect, useRef } from 'react';

interface Props {
  intensity?: number;
  reducedMotion?: boolean;
}

const GLYPHS = '0123456789';
const SYMBOLS = ['SPX', 'NDX', 'BTC', 'EUR', 'M1', 'EV', 'p', 'σ', 'μ', 'λ', 'Δ', 'UTC', 'v1.4', '+150', '-110', 'O/U', 'ML', '0x'];

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  fontSize: number;
  baseAlpha: number;
  isSymbol: boolean;
  emeraldHead: boolean;
}

export function DataRainBackground({ intensity = 0.5, reducedMotion = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const columnsRef = useRef<Column[]>([]);
  const intensityRef = useRef(intensity);
  const reducedRef = useRef(reducedMotion);

  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { reducedRef.current = reducedMotion; }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initColumns();
    }

    function initColumns() {
      const colWidth = 22;
      const numCols = Math.floor(width / colWidth);
      const cols: Column[] = [];
      for (let i = 0; i < numCols; i++) {
        if (Math.random() > 0.45) continue;
        const isSymbol = Math.random() > 0.82;
        const emeraldHead = Math.random() > 0.92;
        cols.push({
          x: i * colWidth + colWidth / 2,
          y: Math.random() * -height,
          speed: 0.25 + Math.random() * 0.6,
          fontSize: isSymbol ? 10 : 11,
          baseAlpha: 0.04 + Math.random() * 0.10,
          isSymbol,
          emeraldHead,
          chars: Array.from({ length: 6 + Math.floor(Math.random() * 10) }, () =>
            isSymbol ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          ),
        });
      }
      columnsRef.current = cols;
    }

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(3, 4, 3, 0.12)';
      ctx.fillRect(0, 0, width, height);

      const effIntensity = reducedRef.current ? 0 : intensityRef.current;
      if (effIntensity <= 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const cols = columnsRef.current;
      for (const col of cols) {
        col.y += col.speed * effIntensity;
        if (col.y > height + col.chars.length * col.fontSize) {
          col.y = -col.chars.length * col.fontSize;
          col.speed = 0.25 + Math.random() * 0.6;
        }
        ctx.font = `${col.fontSize}px "JetBrains Mono", monospace`;
        for (let j = 0; j < col.chars.length; j++) {
          const charY = col.y - j * col.fontSize;
          if (charY < 0 || charY > height) continue;
          const fade = 1 - j / col.chars.length;
          const a = col.baseAlpha * fade;
          if (col.emeraldHead && j === 0) {
            ctx.fillStyle = `rgba(54, 214, 126, ${Math.min(0.14, a * 1.5)})`;
          } else if (col.emeraldHead && j < 3) {
            ctx.fillStyle = `rgba(54, 214, 126, ${a * 0.6})`;
          } else {
            const silverVal = Math.floor(160 + Math.random() * 30);
            ctx.fillStyle = `rgba(${silverVal}, ${silverVal + 3}, ${silverVal}, ${a})`;
          }
          ctx.fillText(col.chars[j], col.x, charY);
        }
        if (Math.random() < 0.015) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = col.isSymbol
            ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(draw);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="matrix-overlay" />
      <div className="matrix-grid" />
      {!reducedMotion && <div className="matrix-scanline" />}
    </div>
  );
}
