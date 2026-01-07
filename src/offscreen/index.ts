import { MESSAGE_TYPES } from '../shared/messaging';
import type { ClipboardResponse } from '../shared/messaging';

const waitForBody = (): Promise<void> => {
  if (document.body) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
};

const ensureDocumentFocus = async (): Promise<void> => {
  await waitForBody();

  if (document.hasFocus()) {
    return;
  }

  let focusTarget = document.getElementById('faceswap-clipboard-focus');
  if (!focusTarget) {
    focusTarget = document.createElement('textarea');
    focusTarget.id = 'faceswap-clipboard-focus';
    focusTarget.setAttribute('aria-hidden', 'true');
    focusTarget.tabIndex = -1;
    focusTarget.style.position = 'fixed';
    focusTarget.style.opacity = '0';
    focusTarget.style.pointerEvents = 'none';
    focusTarget.style.width = '1px';
    focusTarget.style.height = '1px';
    focusTarget.style.top = '-1000px';
    document.body.appendChild(focusTarget);
  }

  (focusTarget as HTMLElement).focus();
  window.focus();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const formatClipboardError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('Document is not focused')) {
      return 'Clipboard read failed because Chrome is not focused. Focus the window and try again.';
    }
    return error.message;
  }
  return 'Clipboard read failed.';
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== MESSAGE_TYPES.READ_CLIPBOARD || message?.target !== 'offscreen') {
    return;
  }

  const respond = (response: ClipboardResponse) => {
    sendResponse(response);
  };

  const handleClipboardRead = async () => {
    await ensureDocumentFocus();
    const text = await navigator.clipboard.readText();
    respond({ ok: true, text });
  };

  handleClipboardRead().catch((error: unknown) => {
    respond({ ok: false, error: formatClipboardError(error) });
  });

  return true;
});
