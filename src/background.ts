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
  sendRuntimeMessage,
  sendTabMessage
} from './utils/chrome';
import type {
  ClipboardResponse,
  LogLevel,
  LogResponse,
  SwapResponse,
  ToastResponse,
  ToastVariant
} from './shared/messaging';

const OFFSCREEN_DOCUMENT_URL = chrome.runtime.getURL('offscreen/index.html');
const RELOAD_DELAY_MS = 650;
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

const logToTabConsole = async (
  tabId: number | undefined,
  level: LogLevel,
  message: string,
  details?: string
): Promise<void> => {
  const prefix = '[FaceSwap]';
  const logger =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;

  if (details) {
    logger(prefix, message, details);
  } else {
    logger(prefix, message);
  }

  if (!tabId) {
    return;
  }

  try {
    await sendTabMessage<LogResponse>(tabId, {
      type: MESSAGE_TYPES.LOG_MESSAGE,
      target: 'content',
      level,
      message,
      details
    });
  } catch {
    // Ignore console relay errors.
  }
};

const notifyTabToast = async (
  tabId: number,
  variant: ToastVariant,
  message: string,
  description?: string
): Promise<void> => {
  try {
    await sendTabMessage<ToastResponse>(tabId, {
      type: MESSAGE_TYPES.SHOW_TOAST,
      target: 'content',
      variant,
      message,
      description
    });
  } catch {
    // Ignore toast errors so swaps still proceed.
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
    args: [token, AUTH_TOKEN_KEY, RELOAD_DELAY_MS],
    func: (clipboardToken: string, storageKey: string, reloadDelayMs: number) => {
      if (!clipboardToken || !clipboardToken.trim()) {
        return { ok: false, error: 'Clipboard was empty.' };
      }

      try {
        localStorage.setItem(storageKey, clipboardToken.trim());
      } catch {
        return { ok: false, error: 'Unable to write token to localStorage.' };
      }

      setTimeout(() => {
        location.reload();
      }, reloadDelayMs);

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
    await logToTabConsole(undefined, 'error', 'No active tab found.');
    await setBadge(BADGE.err);
    return { ok: false, error: 'No active tab found.' };
  }

  if (!isAllowedUrl(tab.url, DEFAULT_ALLOWLIST)) {
    await logToTabConsole(tab.id, 'error', 'Domain is not allowlisted.', tab.url);
    await setBadge(BADGE.no);
    await notifyTabToast(tab.id, 'error', 'Domain is not allowlisted.');
    return { ok: false, error: 'Domain is not allowlisted.' };
  }

  try {
    const clipboardText = await readClipboardText();
    const token = clipboardText.trim();
    if (!token) {
      await logToTabConsole(tab.id, 'error', 'Clipboard is empty.');
      await setBadge(BADGE.err);
      await notifyTabToast(tab.id, 'error', 'Clipboard is empty.');
      return { ok: false, error: 'Clipboard is empty.' };
    }

    const cookiesCleared = await clearAuthCookies(tab.url);
    await injectTokenAndReload(tab.id, token);

    if (!cookiesCleared) {
      await logToTabConsole(
        tab.id,
        'warn',
        'Token set, but cookie may not have been cleared.'
      );
      await setBadge(BADGE.warn);
      await notifyTabToast(tab.id, 'warning', 'Token set, but cookie may not have been cleared.');
      return { ok: true, warning: 'Token set, but cookie may not have been cleared.' };
    }

    await setBadge(BADGE.ok);
    await notifyTabToast(tab.id, 'success', 'Identity swapped successfully.');
    return { ok: true };
  } catch (error) {
    const message = asErrorMessage(error, 'Swap failed.');
    const details = error instanceof Error ? error.stack : undefined;
    await logToTabConsole(tab.id, 'error', message, details);
    await setBadge(BADGE.err);
    await notifyTabToast(tab.id, 'error', message);
    return { ok: false, error: message };
  }
};

const runSwap = async (): Promise<SwapResponse> => {
  if (swapInProgress) {
    await logToTabConsole(undefined, 'warn', 'Swap already in progress.');
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
