export const MESSAGE_TYPES = {
  READ_CLIPBOARD: 'READ_CLIPBOARD',
  SWAP_IDENTITY: 'SWAP_IDENTITY',
  SHOW_TOAST: 'SHOW_TOAST',
  LOG_MESSAGE: 'LOG_MESSAGE'
} as const;

export type OffscreenMessage = {
  type: typeof MESSAGE_TYPES.READ_CLIPBOARD;
  target: 'offscreen';
};

export type SwapMessage = {
  type: typeof MESSAGE_TYPES.SWAP_IDENTITY;
};

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type LogLevel = 'error' | 'warn' | 'info';

export type ToastMessage = {
  type: typeof MESSAGE_TYPES.SHOW_TOAST;
  target: 'content';
  variant: ToastVariant;
  message: string;
  description?: string;
  duration?: number;
};

export type LogMessage = {
  type: typeof MESSAGE_TYPES.LOG_MESSAGE;
  target: 'content';
  level: LogLevel;
  message: string;
  details?: string;
};

export type ClipboardResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type SwapResponse =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

export type ToastResponse =
  | { ok: true }
  | { ok: false; error: string };

export type LogResponse =
  | { ok: true }
  | { ok: false; error: string };
