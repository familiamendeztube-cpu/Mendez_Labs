import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ArrowUp, Loader2, Trash2, ImagePlus, Mic } from 'lucide-react';
import { askCopilot, type CopilotMessage, type CopilotImage } from '@/services/copilot';
import { useTerminalContext } from '@/lib/useTerminalContext';
import { CopilotAvatar } from '@/components/CopilotAvatar';
import { tv, accentAlpha, mutedAlpha } from '@/lib/themeVars';

const THREAD_KEY = 'mlabs-copilot-thread';

const STARTERS = [
  'How are the trades doing today?',
  "Any bets you'd recommend today?",
  "What's my day P/L and biggest mover?",
  'Explain how the Elo model qualifies a pick',
];

function loadThread(): CopilotMessage[] {
  try {
    const raw = localStorage.getItem(THREAD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

/** Lightweight **bold** + line-break rendering — no markdown dependency. */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
            seg.startsWith('**') && seg.endsWith('**') ? (
              <strong key={j} style={{ color: tv.textPrimary }}>{seg.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{seg}</span>
            ),
          )}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// Browser speech recognition (Chrome/Safari). Undefined elsewhere — the mic
// button just hides.
type SpeechRec = { start: () => void; stop: () => void; onresult: ((e: unknown) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };
function getSpeechRecognition(): (new () => SpeechRec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function Copilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>(loadThread);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ preview: string; payload: CopilotImage } | null>(null);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const getContext = useTerminalContext();

  useEffect(() => {
    try { localStorage.setItem(THREAD_KEY, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, busy]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || busy) return;
    setError(null);
    setInput('');
    const attached = image;
    setImage(null);
    const userContent = trimmed || (attached ? '(image attached)' : '');
    const next: CopilotMessage[] = [...messages, { role: 'user', content: userContent }];
    setMessages(next);
    setBusy(true);
    try {
      const reply = await askCopilot(next, getContext(), attached?.payload ?? null);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'The assistant is unavailable.';
      const low = msg.toLowerCase();
      setError(
        msg.includes('ANTHROPIC_API_KEY')
          ? 'The assistant needs the ANTHROPIC_API_KEY secret set on the ai-copilot function.'
          : low.includes('401') || low.includes('unauthorized')
            ? 'Session expired — reload and sign back in with your code.'
            : low.includes('failed to fetch') || low.includes('networkerror')
              ? "Can't reach the assistant — the ai-copilot function isn't deployed yet."
              : msg,
      );
    } finally {
      setBusy(false);
    }
  }, [messages, busy, image, getContext]);

  const pickImage = (file: File | undefined) => {
    if (!file || !/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return;
    if (file.size > 5_000_000) { setError('Image is too large (5 MB max).'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const data = result.split(',')[1] ?? '';
      setImage({ preview: result, payload: { media_type: file.type === 'image/jpg' ? 'image/jpeg' : file.type, data } });
    };
    reader.readAsDataURL(file);
  };

  const toggleMic = () => {
    const Rec = getSpeechRecognition();
    if (!Rec) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Rec();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: unknown) => {
      const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      let t = '';
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      setInput(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const clear = () => {
    setMessages([]);
    setError(null);
    setImage(null);
    try { localStorage.removeItem(THREAD_KEY); } catch { /* ignore */ }
  };

  const micAvailable = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Copilot"
          className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
          style={{ background: tv.bgElevated, border: `1px solid ${accentAlpha(0.4)}`, boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
        >
          <CopilotAvatar size={40} />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-[65] lg:hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-[70] flex flex-col overflow-hidden rounded-2xl border shadow-2xl inset-x-3 bottom-3 top-16 lg:inset-x-auto lg:top-auto lg:bottom-6 lg:right-6 lg:h-[620px] lg:w-[400px]"
            style={{ background: tv.bgSurface, borderColor: tv.borderBase, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: tv.borderBase }}>
              <div className="flex items-center gap-2.5">
                <CopilotAvatar size={34} state={busy ? 'thinking' : 'idle'} />
                <div className="leading-tight">
                  <div className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Copilot</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: tv.textMuted }}>advice only · sees your live numbers</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={clear} aria-label="Clear conversation" className="rounded p-1.5" style={{ color: tv.textMuted }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Close Copilot" className="rounded p-1.5" style={{ color: tv.textMuted }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CopilotAvatar size={30} />
                    <p className="text-sm leading-relaxed" style={{ color: tv.textSecondary }}>
                      I can see your live Alpaca account, today's picks, and your bankroll. Ask me anything — or drop in a screenshot and I'll read it.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-lg px-3 py-2 text-left text-sm transition-colors"
                        style={{ background: accentAlpha(0.08), color: tv.accent, border: `1px solid ${accentAlpha(0.18)}` }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && <CopilotAvatar size={24} />}
                  <div
                    className="max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={
                      m.role === 'user'
                        ? { background: tv.accent, color: tv.bgOverlay }
                        : { background: tv.bgElevated, color: tv.textSecondary, border: `1px solid ${tv.borderBase}` }
                    }
                  >
                    <RichText text={m.content} />
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-2">
                  <CopilotAvatar size={24} state="thinking" />
                  <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: tv.bgElevated, border: `1px solid ${tv.borderBase}` }}>
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: tv.accent }} />
                    <span className="text-xs" style={{ color: tv.textMuted }}>Thinking…</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: mutedAlpha(0.08), color: tv.statusAmber, border: `1px solid ${mutedAlpha(0.15)}` }}>
                  {error}
                </div>
              )}
            </div>

            {/* Attachment preview */}
            {image && (
              <div className="flex items-center gap-2 border-t px-3 py-2" style={{ borderColor: tv.borderBase }}>
                <img src={image.preview} alt="attachment" className="h-10 w-10 rounded object-cover" />
                <span className="flex-1 text-xs" style={{ color: tv.textMuted }}>Image attached</span>
                <button onClick={() => setImage(null)} aria-label="Remove image" className="rounded p-1" style={{ color: tv.textMuted }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2 border-t p-3"
              style={{ borderColor: tv.borderBase }}
            >
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach image"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ color: tv.textMuted, border: `1px solid ${tv.borderBase}` }}
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              {micAvailable && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={listening ? 'Stop voice input' : 'Voice input'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={listening
                    ? { color: tv.bgOverlay, background: tv.statusRed }
                    : { color: tv.textMuted, border: `1px solid ${tv.borderBase}` }}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                placeholder={listening ? 'Listening…' : 'Ask about your trades or bets…'}
                aria-label="Message the Copilot"
                className="max-h-28 flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: tv.bgOverlay, color: tv.textPrimary, border: `1px solid ${tv.borderBase}` }}
              />
              <button
                type="submit"
                disabled={(!input.trim() && !image) || busy}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
                style={{ background: tv.accent, color: tv.bgOverlay }}
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
