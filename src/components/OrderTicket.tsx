import { useState } from 'react';
import { AlertTriangle, Check, Send, X } from 'lucide-react';
import { alpaca, type AlpacaOrder, type TradingEnv } from '@/services/alpaca';
import { tv, accentAlpha, amberAlpha, redAlpha, mutedAlpha } from '@/lib/themeVars';

interface Props {
  env: TradingEnv;
  connected: boolean;
  onPlaced: () => void;
  /** Venue name shown in the confirm dialog (e.g. "Kraken"). */
  brokerName?: string;
}

/**
 * Order ticket — the owner places their own orders on their own Alpaca
 * account. Two-step: Review opens a confirmation summary; nothing is sent
 * until the owner explicitly confirms. Live orders additionally require the
 * venue's server-side orders-enabled secret.
 */
export function OrderTicket({ env, connected, onPlaced, brokerName = 'your broker' }: Props) {
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [tif, setTif] = useState<'day' | 'gtc'>('day');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<AlpacaOrder | null>(null);

  const isLive = env === 'live';
  const qtyNum = parseFloat(qty);
  const limitNum = parseFloat(limitPrice);
  const valid =
    /^[A-Za-z.]{1,6}$/.test(symbol.trim()) &&
    Number.isFinite(qtyNum) && qtyNum > 0 &&
    (type === 'market' || (Number.isFinite(limitNum) && limitNum > 0));

  async function place() {
    setSubmitting(true);
    setError('');
    try {
      const order = await alpaca.submitOrder({
        symbol: symbol.trim().toUpperCase(),
        qty: qtyNum,
        side,
        type,
        time_in_force: tif,
        ...(type === 'limit' ? { limit_price: limitNum } : {}),
      });
      setPlaced(order);
      setReviewing(false);
      onPlaced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${tv.borderBase}`,
    color: tv.textPrimary,
  } as const;

  return (
    <div className="panel-img rounded-2xl p-4" style={{ background: tv.bgSurface, border: `1px solid ${isLive ? amberAlpha(0.35) : tv.borderBase}` }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>Order Ticket</h3>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest"
          style={isLive
            ? { background: amberAlpha(0.15), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.3)}` }
            : { background: accentAlpha(0.12), color: tv.accent, border: `1px solid ${accentAlpha(0.2)}` }}
        >
          {isLive ? 'REAL MONEY' : 'SIMULATED'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          value={symbol}
          onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setPlaced(null); setError(''); }}
          placeholder="Symbol"
          aria-label="Symbol"
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <input
          value={qty}
          onChange={(e) => { setQty(e.target.value); setPlaced(null); setError(''); }}
          placeholder="Qty"
          aria-label="Quantity"
          inputMode="decimal"
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')} aria-label="Side"
          className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as 'market' | 'limit')} aria-label="Order type"
          className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
        {type === 'limit' && (
          <input
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder="Limit price"
            aria-label="Limit price"
            inputMode="decimal"
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        )}
        <select value={tif} onChange={(e) => setTif(e.target.value as 'day' | 'gtc')} aria-label="Time in force"
          className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
          <option value="day">Day</option>
          <option value="gtc">GTC</option>
        </select>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-xs" style={{ color: tv.statusRed }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      {placed && (
        <p className="mt-3 flex items-center gap-2 text-xs" style={{ color: tv.accent }}>
          <Check className="h-3.5 w-3.5 shrink-0" />
          Order {placed.status}: {placed.side.toUpperCase()} {placed.qty} {placed.symbol} ({placed.type})
        </p>
      )}

      <button
        onClick={() => setReviewing(true)}
        disabled={!valid || !connected}
        className="mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: accentAlpha(0.12), color: tv.accent, border: `1px solid ${accentAlpha(0.2)}` }}
      >
        <Send className="h-3.5 w-3.5" /> Review order
      </button>
      {!connected && (
        <p className="mt-2 text-xs" style={{ color: tv.textMuted }}>Connect {brokerName} to place orders.</p>
      )}

      {/* Confirmation — nothing is sent until this explicit confirm */}
      {reviewing && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: 'rgba(3,6,5,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setReviewing(false)}>
          <div className="panel-img w-full max-w-sm rounded-2xl p-5" style={{ background: tv.bgSurface, border: `1px solid ${isLive ? amberAlpha(0.4) : tv.borderBase}` }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold" style={{ color: tv.textPrimary }}>Confirm order</h4>
              <button onClick={() => setReviewing(false)} aria-label="Cancel"><X className="h-4 w-4" style={{ color: tv.textMuted }} /></button>
            </div>
            {isLive && (
              <div className="mb-4 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: redAlpha(0.08), border: `1px solid ${redAlpha(0.25)}`, color: tv.statusRed }}>
                REAL MONEY — this order executes on your live {brokerName} account.
              </div>
            )}
            <div className="space-y-1.5 text-sm" style={{ color: tv.textPrimary }}>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Action</span><span className="font-bold">{side.toUpperCase()} {qty} {symbol.trim().toUpperCase()}</span></div>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Type</span><span>{type}{type === 'limit' ? ` @ $${limitPrice}` : ''}</span></div>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Time in force</span><span>{tif.toUpperCase()}</span></div>
              <div className="flex justify-between"><span style={{ color: tv.textMuted }}>Environment</span><span className="font-bold" style={{ color: isLive ? tv.statusAmber : tv.accent }}>{env.toUpperCase()}</span></div>
            </div>
            <button
              onClick={place}
              disabled={submitting}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
              style={isLive
                ? { background: amberAlpha(0.2), color: tv.statusAmber, border: `1px solid ${amberAlpha(0.4)}` }
                : { background: accentAlpha(0.15), color: tv.accent, border: `1px solid ${accentAlpha(0.3)}` }}
            >
              {submitting ? 'Placing…' : `Place ${isLive ? 'real' : 'simulated'} order`}
            </button>
            <button onClick={() => setReviewing(false)} className="mt-2 w-full rounded-lg py-2 text-xs" style={{ color: tv.textMuted, background: mutedAlpha(0.06) }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
