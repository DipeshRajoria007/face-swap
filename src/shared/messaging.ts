export const MESSAGE_TYPES = {
  READ_CLIPBOARD: 'READ_CLIPBOARD',
  SWAP_IDENTITY: 'SWAP_IDENTITY'
} as const;

export type OffscreenMessage = {
  type: typeof MESSAGE_TYPES.READ_CLIPBOARD;
  target: 'offscreen';
};

export type SwapMessage = {
  type: typeof MESSAGE_TYPES.SWAP_IDENTITY;
};

export type ClipboardResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type SwapResponse =
  | { ok: true; warning?: string }
  | { ok: false; error: string };
