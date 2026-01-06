import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_KEY,
  DEFAULT_ALLOWLIST
} from './config';
import { MESSAGE_TYPES } from './shared/messaging';
import { isAllowedUrl } from './utils/allowlist';
import { setBadge } from './utils/badge';
import { buildCookieRemovalUrls } from './utils/cookies';
import {
  createOffscreenDocument,
  closeOffscreenDocument,
  executeScript,
  queryActiveTab,
  removeCookie,
  sendRuntimeMessage
} from './utils/chrome';
import type { ClipboardResponse, SwapResponse } from './shared/messaging';

const OFFSCREEN_DOCUMENT_URL = chrome.runtime.getURL('offscreen/index.html');
const BADGE = {
  ok: { text: 'OK', color: '#16a34a' },
  warn: { text: 'WARN', color: '#f59e0b' },
  err: { text: 'ERR', color: '#dc2626' },
  no: { text: 'NO', color: '#f59e0b' }
} as const;

let swapInProgress = false;
let offscreenReady = false;
let offscreenCreating: Promise<void> | null = null;

const asErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const ensureOffscreenDocument = async (): Promise<void> => {
  if (offscreenReady) {
    return;
  }

  if (!offscreenCreating) {
    offscreenCreating = createOffscreenDocument({
      url: OFFSCREEN_DOCUMENT_URL,
      reasons: ['CLIPBOARD'],
      justification: 'Read clipboard text for identity swapping.'
    })
      .then(() => {
        offscreenReady = true;
      })
      .catch((error) => {
        const message = asErrorMessage(error, 'Failed to create offscreen document');
        if (message.includes('Only a single offscreen document') || message.includes('already has an offscreen document')) {
          offscreenReady = true;
          return;
        }
        throw error;
      })
      .finally(() => {
        offscreenCreating = null;
      });
  }

  await offscreenCreating;
};

const closeOffscreenDocumentSafe = async (): Promise<void> => {
  if (!offscreenReady) {
    return;
  }

  try {
    await closeOffscreenDocument();
  } catch (error) {
    const message = asErrorMessage(error, 'Failed to close offscreen document');
    if (!message.includes('No offscreen document')) {
      throw error;
    }
  } finally {
    offscreenReady = false;
  }
};

const readClipboardText = async (): Promise<string> => {
  await ensureOffscreenDocument();
  try {
    const response = await sendRuntimeMessage<ClipboardResponse>({
      type: MESSAGE_TYPES.READ_CLIPBOARD,
      target: 'offscreen'
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Clipboard read failed');
    }

    return response.text;
  } finally {
    await closeOffscreenDocumentSafe();
  }
};

const clearAuthCookies = async (pageUrl: string): Promise<boolean> => {
  const urls = buildCookieRemovalUrls(pageUrl);
  const results = await Promise.allSettled(
    urls.map((url) => removeCookie({ url, name: AUTH_COOKIE_NAME }))
  );

  return results.some(
    (result) => result.status === 'fulfilled' && Boolean(result.value)
  );
};

const injectTokenAndReload = async (tabId: number, token: string): Promise<void> => {
  const [{ result }] = await executeScript<{ ok: boolean; error?: string }>({
    target: { tabId },
    world: 'MAIN',
    args: [token, AUTH_TOKEN_KEY],
    func: (clipboardToken: string, storageKey: string) => {
      if (!clipboardToken || !clipboardToken.trim()) {
        return { ok: false, error: 'Clipboard was empty.' };
      }

      try {
        localStorage.setItem(storageKey, clipboardToken.trim());
      } catch {
        return { ok: false, error: 'Unable to write token to localStorage.' };
      }

      const existing = document.getElementById('faceswap-toast');
      if (existing) {
        existing.remove();
      }

      const toast = document.createElement('div');
      toast.id = 'faceswap-toast';
      toast.textContent = 'Identity swapped';
      toast.style.position = 'fixed';
      toast.style.right = '16px';
      toast.style.bottom = '16px';
      toast.style.zIndex = '2147483647';
      toast.style.padding = '10px 12px';
      toast.style.background = 'rgba(14, 17, 22, 0.92)';
      toast.style.color = '#f8fafc';
      toast.style.font = '600 12px/1.2 "Space Grotesk", "IBM Plex Sans", system-ui';
      toast.style.borderRadius = '10px';
      toast.style.boxShadow = '0 10px 22px -18px rgba(14, 17, 22, 0.6)';
      toast.style.letterSpacing = '0.02em';
      toast.style.textTransform = 'uppercase';
      document.documentElement.appendChild(toast);

      setTimeout(() => {
        toast.remove();
        location.reload();
      }, 120);

      return { ok: true };
    }
  });

  if (!result?.ok) {
    throw new Error(result?.error || 'Token injection failed');
  }
};

const swapIdentityOnActiveTab = async (): Promise<SwapResponse> => {
  const tab = await queryActiveTab();
  if (!tab?.id || !tab.url) {
    await setBadge(BADGE.err);
    return { ok: false, error: 'No active tab found.' };
  }

  if (!isAllowedUrl(tab.url, DEFAULT_ALLOWLIST)) {
    await setBadge(BADGE.no);
    return { ok: false, error: 'Domain is not allowlisted.' };
  }

  const clipboardText = await readClipboardText();
  const token = clipboardText.trim();
  if (!token) {
    await setBadge(BADGE.err);
    return { ok: false, error: 'Clipboard is empty.' };
  }

  const cookiesCleared = await clearAuthCookies(tab.url);
  await injectTokenAndReload(tab.id, token);

  if (!cookiesCleared) {
    await setBadge(BADGE.warn);
    return { ok: true, warning: 'Token set, but cookie may not have been cleared.' };
  }

  await setBadge(BADGE.ok);
  return { ok: true };
};

const runSwap = async (): Promise<SwapResponse> => {
  if (swapInProgress) {
    return { ok: false, error: 'Swap already in progress.' };
  }

  swapInProgress = true;
  try {
    return await swapIdentityOnActiveTab();
  } catch (error) {
    await setBadge(BADGE.err);
    return { ok: false, error: asErrorMessage(error, 'Swap failed.') };
  } finally {
    swapInProgress = false;
  }
};

chrome.commands.onCommand.addListener((command) => {
  if (command === 'swap-identity') {
    void runSwap();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.READ_CLIPBOARD && message?.target === 'offscreen') {
    return;
  }

  if (message?.type === MESSAGE_TYPES.SWAP_IDENTITY) {
    runSwap()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ ok: false, error: asErrorMessage(error, 'Swap failed.') });
      });
    return true;
  }
});
