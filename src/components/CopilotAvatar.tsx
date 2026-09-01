/**
 * The Copilot's face — a calm, geometric analyst rendered in the terminal's
 * champagne palette. Not the app logo: this is a character. `state` nudges the
 * expression so the assistant feels present while it works.
 */
export function CopilotAvatar({
  size = 32,
  state = 'idle',
}: {
  size?: number;
  state?: 'idle' | 'thinking' | 'speaking';
}) {
  const blink = state === 'speaking';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Copilot"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="cpFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0DFC0" />
          <stop offset="100%" stopColor="#D6B77A" />
        </linearGradient>
        <linearGradient id="cpRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D6B77A" />
          <stop offset="100%" stopColor="#B58A3A" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="#241C15" stroke="url(#cpRing)" strokeWidth="2" />

      {/* head */}
      <rect x="17" y="15" width="30" height="30" rx="12" fill="url(#cpFace)" />

      {/* eyes */}
      <g fill="#241C15">
        {blink ? (
          <>
            <rect x="23" y="28" width="6" height="2" rx="1" />
            <rect x="35" y="28" width="6" height="2" rx="1" />
          </>
        ) : (
          <>
            <circle cx="26" cy="29" r="2.6" />
            <circle cx="38" cy="29" r="2.6" />
          </>
        )}
      </g>

      {/* mouth */}
      {state === 'thinking' ? (
        <circle cx="32" cy="38" r="1.6" fill="#241C15" />
      ) : (
        <path d="M26 37 Q32 41 38 37" stroke="#241C15" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}

      {/* antenna / signal */}
      <line x1="32" y1="15" x2="32" y2="9" stroke="url(#cpRing)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="7" r="2.5" fill="#D6B77A">
        {state === 'thinking' && (
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}
