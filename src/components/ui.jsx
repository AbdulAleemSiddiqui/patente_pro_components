// ─── Shared UI primitives ────────────────────────────────────────────────────

import { useState } from 'react';

export const badgeTone = {
  green: 'bg-success-light text-success',
  warn:  'bg-warn-light text-warn',
  red:   'bg-accent-light text-accent',
  blue:  'bg-brand-light text-brand-mid',
  muted: 'bg-gray-100 text-gray-500',
};

export function Badge({ tone = 'blue', children }) {
  return (
    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] ${badgeTone[tone]}`}>
      {children}
    </span>
  );
}

export function Button({ children, primary, small, success, onClick, className = '' }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] transition
        ${small ? 'px-2.5 py-1 text-xs' : ''}
        ${primary
          ? 'border-brand bg-brand text-white hover:border-brand-mid hover:bg-brand-mid'
          : success
            ? 'border-success bg-white text-success hover:bg-success-light'
            : 'border-line bg-white text-ink hover:bg-[#f5f5f5]'
        } ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, onClick }) {
  return (
    <button
      className="inline-grid size-9 place-items-center rounded-md border border-line bg-white text-ink transition hover:bg-[#f5f5f5]"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Pill({ children, active, onClick }) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Card({ title, action, children }) {
  return (
    <section className="mb-3.5 overflow-hidden rounded-[10px] border border-line bg-white">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="text-sm font-medium">{title}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Page({ children }) {
  return <div className="p-5">{children}</div>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function TwoColumnGrid({ children }) {
  return <div className="mb-3.5 grid gap-3.5 xl:grid-cols-2">{children}</div>;
}

export function Field({ label, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-muted">{label}</span>}
      {children}
    </label>
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}

export function ProgressBar({ percent, color, tone }) {
  const toneClass =
    color ||
    (tone === 'good' ? 'bg-success' : tone === 'warn' ? 'bg-warn' : 'bg-brand-mid');
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f5f5f5]">
      <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Stars({ value, onChange, readonly, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          className={`text-base leading-none ${star <= value ? 'text-[#e6a817]' : 'text-line'} ${
            readonly ? 'cursor-default' : 'cursor-pointer'
          }`}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          aria-label={`${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Read-only traffic-light rating (poor / fair / good) — same styling as the Log page.
const SIGNAL_COLORS = {
  poor: { on: 'bg-red-500', glow: '0 0 8px rgba(239, 68, 68, 0.6), 0 0 4px rgba(239, 68, 68, 0.4)' },
  fair: { on: 'bg-[#d4820a]', glow: '0 0 8px rgba(212, 130, 10, 0.6), 0 0 4px rgba(212, 130, 10, 0.4)' },
  good: { on: 'bg-green-500', glow: '0 0 8px rgba(34, 197, 94, 0.6), 0 0 4px rgba(34, 197, 94, 0.4)' },
};

export function SignalLights({ value, size = 24 }) {
  return (
    <div className="traffic-light flex gap-2">
      {['poor', 'fair', 'good'].map((rating) => {
        const active = value === rating;
        const c = SIGNAL_COLORS[rating];
        return (
          <span
            key={rating}
            className={`tl-circle rounded-full transition ${active ? c.on : 'bg-gray-200'}`}
            style={{
              width: size,
              height: size,
              boxShadow: active ? c.glow : '0 0 4px rgba(0, 0, 0, 0.1)',
            }}
            title={rating.charAt(0).toUpperCase() + rating.slice(1)}
          />
        );
      })}
    </div>
  );
}

export function Tag({ children, active, error, passive, tone, onClick }) {
  const activeClass = error
    ? 'border-accent bg-accent-light text-accent'
    : tone
      ? `${badgeTone[tone]} border-transparent`
      : 'border-brand-mid bg-brand-light text-brand-mid';
  return (
    <button
      type="button"
      className={`rounded-full border px-2.5 py-1 text-xs ${
        active ? activeClass : 'border-line bg-white text-muted'
      } ${passive ? 'cursor-default' : ''}`}
      onClick={passive ? undefined : onClick}
    >
      {children}
    </button>
  );
}

export function Dot({ tone }) {
  const color = tone === 'green' ? 'bg-success' : 'bg-warn';
  return <span className={`mt-1 size-2.5 shrink-0 rounded-full ${color}`} />;
}

export function Toast({ message }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-md bg-brand px-4 py-2.5 text-[13px] text-white transition ${
        message ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      {message}
    </div>
  );
}

export const fieldClass =
  'w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid';

/**
 * Typable dropdown: filter options as you write, click to pick. Use for
 * lists that can grow long (students, lessons); plain <select> is fine for
 * a handful of fixed choices. Options may carry a `color` (e.g. branch
 * color) applied to the selected value and to their rows.
 */
export function Combobox({
  value, onChange, options = [], placeholder, disabled, emptyText = '—',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value) || null;
  const filtered = options.filter((o) =>
    o.label?.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <div className="relative">
      <input
        type="text"
        className={fieldClass}
        style={selected?.color ? { color: selected.color } : undefined}
        disabled={disabled}
        placeholder={placeholder || ''}
        value={open ? query : (selected?.label || '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onBlur={() => setTimeout(close, 120)}
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted">{emptyText}</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`block w-full px-3 py-2 text-left text-[13px] transition hover:bg-[#f5f5f5] ${
                  o.value === value ? 'bg-brand-light font-medium' : ''
                }`}
                style={o.color ? { color: o.color } : undefined}
                // mousedown fires before the input's blur, so the pick lands
                onMouseDown={(e) => { e.preventDefault(); onChange(o.value); close(); }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}