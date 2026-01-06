import { MESSAGE_TYPES } from '../shared/messaging';
import type { ClipboardResponse } from '../shared/messaging';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== MESSAGE_TYPES.READ_CLIPBOARD || message?.target !== 'offscreen') {
    return;
  }

  const respond = (response: ClipboardResponse) => {
    sendResponse(response);
  };

  navigator.clipboard
    .readText()
    .then((text) => {
      respond({ ok: true, text });
    })
    .catch((error: unknown) => {
      const messageText =
        error instanceof Error ? error.message : 'Clipboard read failed.';
      respond({ ok: false, error: messageText });
    });

  return true;
});
