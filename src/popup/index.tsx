import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_KEY, DEFAULT_ALLOWLIST } from '../config';
import { MESSAGE_TYPES } from '../shared/messaging';
import type { SwapResponse } from '../shared/messaging';
import { sendRuntimeMessage } from '../utils/chrome';

const statusStyles: Record<string, string> = {
  idle: 'text-slate-500',
  working: 'text-slate-500',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-rose-600'
};

const App = () => {
  const [status, setStatus] = React.useState<'idle' | 'working' | 'success' | 'warning' | 'error'>('idle');
  const [message, setMessage] = React.useState('Ready to swap.');

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
    <div className="h-full p-4">
      <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-soft animate-rise">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">FaceSwap</p>
            <h1 className="text-lg font-semibold text-ink">Instant identity swap</h1>
          </div>
          <div className="h-10 w-10 rounded-full bg-ink/10" />
        </div>

        <button
          type="button"
          onClick={runSwap}
          disabled={status === 'working'}
          className="w-full rounded-xl bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-clay transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Swap from clipboard
        </button>

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs">
          <p className={`font-semibold ${statusStyles[status]}`}>{message}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
            Shortcut: Cmd/Ctrl + Shift + Y
          </p>
        </div>

        <div className="mt-auto text-[11px] text-slate-500">
          <p className="font-semibold uppercase tracking-[0.2em] text-slate-400">Allowlist</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {DEFAULT_ALLOWLIST.map((domain) => (
              <span
                key={domain}
                className="rounded-full bg-ember/10 px-2 py-1 text-[10px] font-semibold text-ember"
              >
                {domain}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px]">Token key: {AUTH_TOKEN_KEY}</p>
          <p className="text-[10px]">Cookie: {AUTH_COOKIE_NAME}</p>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
