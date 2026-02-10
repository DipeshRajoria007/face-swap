import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_KEY, DEFAULT_ALLOWLIST } from '../config';
import { MESSAGE_TYPES } from '../shared/messaging';
import type { SwapResponse } from '../shared/messaging';
import { sendRuntimeMessage } from '../utils/chrome';

const statusStyles: Record<string, string> = {
  idle: 'text-ink/70',
  working: 'text-ink/70',
  success: 'text-lagoon',
  warning: 'text-copper',
  error: 'text-ruby'
};

const statusDots: Record<string, string> = {
  idle: 'bg-ink/40',
  working: 'bg-ink/40',
  success: 'bg-lagoon',
  warning: 'bg-copper',
  error: 'bg-ruby'
};

const App = () => {
  const [status, setStatus] = React.useState<'idle' | 'working' | 'success' | 'warning' | 'error'>('idle');
  const [message, setMessage] = React.useState('Ready to swap.');
  const buttonLabel = status === 'working' ? 'Swapping now' : 'Swap from clipboard';

  const runSwap = async () => {
    setStatus('working');
    setMessage('Reading clipboard and swapping...');

    try {
      const response = await sendRuntimeMessage<SwapResponse>({
        type: MESSAGE_TYPES.SWAP_IDENTITY
      });

      if (!response?.ok) {
        setStatus('error');
        setMessage(response?.error || 'Swap failed.');
        return;
      }

      if (response.warning) {
        setStatus('warning');
        setMessage(response.warning);
        return;
      }

      setStatus('success');
      setMessage('Identity swapped successfully.');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Swap failed.';
      setStatus('error');
      setMessage(messageText);
    }
  };

  return (
    <div className="relative h-full p-4">
      <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-[28px] border border-ink/10 bg-white/70 p-4 shadow-bloom ring-1 ring-white/70 backdrop-blur-sm animate-rise">
        <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(194,90,58,0.35),transparent_65%)] opacity-80 blur-2xl animate-drift" />
        <div className="pointer-events-none absolute -left-20 bottom-6 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(31,111,120,0.35),transparent_70%)] opacity-70 blur-2xl" />

        <header className="relative flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-ink/70">
              <span className="h-1.5 w-1.5 rounded-full bg-copper" />
              FaceSwap Lab
            </span>
            <h1 className="mt-3 font-display text-[22px] leading-tight text-ink">Identity Exchange Console</h1>
            <p className="mt-2 text-xs text-ink/70">
              Swap a copied profile into your current session in seconds.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-ink/60">
            <div className="rounded-2xl bg-[conic-gradient(from_90deg_at_50%_50%,#c25a3a,#1f6f78,#5b5d9a,#c25a3a)] p-[1px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-white/80 shadow-soft">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDots[status]}`} />
              </div>
            </div>
            Status
          </div>
        </header>

        <button
          type="button"
          onClick={runSwap}
          disabled={status === 'working'}
          className="group relative w-full overflow-hidden rounded-2xl bg-[conic-gradient(from_90deg_at_50%_50%,#c25a3a,#1f6f78,#5b5d9a,#c25a3a)] p-[1px] transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex w-full items-center justify-between rounded-[15px] bg-ink px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-paper transition group-hover:bg-ink/90">
            {buttonLabel}
            <span className="font-mono text-[9px] tracking-[0.25em] text-paper/70">CMD/Ctrl + Shift + Y</span>
          </span>
        </button>

        <div className="rounded-2xl border border-ink/10 bg-white/70 p-3 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-ink/60">
            <span className={`h-2 w-2 rounded-full ${statusDots[status]}`} />
            Telemetry
          </div>
          <p className={`mt-2 text-sm font-semibold ${statusStyles[status]}`}>{message}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-ink/50">Clipboard source required</p>
        </div>

        <div className="mt-auto space-y-3 text-[11px] text-ink/70">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-ink/50">Allowlist</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_ALLOWLIST.map((domain) => (
                <span
                  key={domain}
                  className="rounded-full border border-ink/10 bg-paper/80 px-2.5 py-1 text-[10px] font-semibold text-ink/70"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-1 font-mono text-[10px] text-ink/60">
            <span>Token key: {AUTH_TOKEN_KEY}</span>
            <span>Cookie: {AUTH_COOKIE_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
