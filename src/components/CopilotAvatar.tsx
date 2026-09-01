import { useState } from 'react';

// Drop a photo at  public/copilot-face.jpg  and it becomes the Copilot's face
// everywhere. Until then, the geometric character below is used.
const FACE_SRC = `${import.meta.env.BASE_URL}copilot-face.jpg`;

// Once any instance fails to load the photo, every other instance skips
// straight to the SVG — no repeated 404s.
let faceMissing = false;

/**
 * The Copilot's face. Uses a photo from public/copilot-face.jpg when present,
 * otherwise a calm geometric analyst in the terminal's champagne palette.
 * `state` nudges the expression so the assistant feels present while it works.
 */
export function CopilotAvatar({
  size = 32,
  state = 'idle',
}: {
  size?: number;
  state?: 'idle' | 'thinking' | 'speaking';
}) {
  const [useFace, setUseFace] = useState(!faceMissing);

  if (useFace) {
    return (
      <img
        src={FACE_SRC}
        alt="Copilot"
        width={size}
        height={size}
        onError={() => { faceMissing = true; setUseFace(false); }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1.5px solid var(--accent, #D6B77A)',
          filter: state === 'thinking' ? 'saturate(0.6) brightness(0.9)' : 'none',
          transition: 'filter 0.3s ease',
        }}
      />
    );
  }

  const blink = state === 'speaking';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Copilot" style={{ display: 'block', flexShrink: 0 }}>
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
      <rect x="17" y="15" width="30" height="30" rx="12" fill="url(#cpFace)" />
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
      {state === 'thinking' ? (
        <circle cx="32" cy="38" r="1.6" fill="#241C15" />
      ) : (
        <path d="M26 37 Q32 41 38 37" stroke="#241C15" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      <line x1="32" y1="15" x2="32" y2="9" stroke="url(#cpRing)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="7" r="2.5" fill="#D6B77A">
        {state === 'thinking' && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
      </circle>
    </svg>
  );
}
