import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import sonnerStyles from 'sonner/dist/styles.css?inline';
import { MESSAGE_TYPES } from '../shared/messaging';
import type {
  LogMessage,
  LogResponse,
  ToastMessage,
  ToastResponse
} from '../shared/messaging';

const ROOT_ID = 'faceswap-sonner-root';
const STYLE_ID = 'faceswap-sonner-styles';
let toasterMounted = false;

const waitForBody = (): Promise<void> => {
  if (document.body) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  });
};

const ensureToaster = async (): Promise<void> => {
  if (toasterMounted) {
    return;
  }

  await waitForBody();

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = sonnerStyles;
    (document.head || document.documentElement).appendChild(style);
  }

  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    existing.remove();
  }

  const container = document.createElement('div');
  container.id = ROOT_ID;
  document.documentElement.appendChild(container);

  const root = createRoot(container);
  root.render(
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme="light"
      toastOptions={{
        duration: 2200,
        style: { zIndex: 2147483647 }
      }}
    />
  );

  toasterMounted = true;
};

const showToast = (payload: ToastMessage): void => {
  const options = {
    description: payload.description,
    duration: payload.duration
  };

  switch (payload.variant) {
    case 'success':
      toast.success(payload.message, options);
      return;
    case 'error':
      toast.error(payload.message, options);
      return;
    case 'warning':
      toast.warning(payload.message, options);
      return;
    case 'info':
      toast(payload.message, options);
      return;
    default:
      toast(payload.message, options);
  }
};

const logMessage = (payload: LogMessage): void => {
  const prefix = '[FaceSwap]';
  const logger =
    payload.level === 'error'
      ? console.error
      : payload.level === 'warn'
        ? console.warn
        : console.info;

  if (payload.details) {
    logger(prefix, payload.message, payload.details);
    return;
  }

  logger(prefix, payload.message);
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'content') {
    return;
  }

  if (message?.type === MESSAGE_TYPES.LOG_MESSAGE) {
    logMessage(message as LogMessage);
    sendResponse({ ok: true } satisfies LogResponse);
    return;
  }

  if (message?.type !== MESSAGE_TYPES.SHOW_TOAST) {
    return;
  }

  const payload = message as ToastMessage;

  const handleMessage = async () => {
    await ensureToaster();
    showToast(payload);
    sendResponse({ ok: true } satisfies ToastResponse);
  };

  handleMessage().catch((error: unknown) => {
    const messageText = error instanceof Error ? error.message : 'Toast failed.';
    sendResponse({ ok: false, error: messageText } satisfies ToastResponse);
  });

  return true;
});
