// Generated team crests — a monogram in a deterministic gradient shield, keyed
// off the team name. No external logo CDN: always renders, always on-brand.

const STOPWORDS = new Set(['fc', 'sc', 'afc', 'the', 'club', 'city', 'united', 'town']);

const PALETTE = [
  ['#D6B77A', '#B58A3A'],
  ['#5FB98A', '#2E7D57'],
  ['#E0A532', '#B57A17'],
  ['#7FA8D6', '#3F6FA8'],
  ['#E0796B', '#B0463D'],
  ['#B48AD6', '#7A4FB0'],
  ['#6FC7C2', '#2E8A85'],
  ['#C9A24B', '#8A6E22'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function teamAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const pool = words.length ? words : name.trim().split(/\s+/);
  if (pool.length === 1) return pool[0].slice(0, 3).toUpperCase();
  return pool.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

export function TeamBadge({ name, size = 34 }: { name: string; size?: number }) {
  const [c1, c2] = PALETTE[hash(name) % PALETTE.length];
  const abbr = teamAbbr(name);
  const id = `tb-${hash(name).toString(36)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={name} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <path d="M20 2 L36 8 V21 C36 30 29 36 20 39 C11 36 4 30 4 21 V8 Z" fill={`url(#${id})`} opacity="0.9" />
      <path d="M20 2 L36 8 V21 C36 30 29 36 20 39 C11 36 4 30 4 21 V8 Z" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        fontFamily="'Bricolage Grotesque', Georgia, serif"
        fontWeight="700"
        fontSize={abbr.length > 2 ? 10 : 13}
        fill="#1B1511"
      >
        {abbr}
      </text>
    </svg>
  );
}

export function MatchupBadges({ home, away, size = 34 }: { home: string; away: string; size?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <TeamBadge name={home} size={size} />
      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>vs</span>
      <TeamBadge name={away} size={size} />
    </div>
  );
}
