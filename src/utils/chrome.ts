export const chromePromise = <T>(
  executor: (callback: (result: T) => void) => void
): Promise<T> =>
  new Promise((resolve, reject) => {
    executor((result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });

export const chromePromiseVoid = (
  executor: (callback: () => void) => void
): Promise<void> =>
  new Promise((resolve, reject) => {
    executor(() => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

export const sendRuntimeMessage = async <TResponse>(
  message: unknown
): Promise<TResponse> =>
  chromePromise<TResponse>((callback) => {
    chrome.runtime.sendMessage(message, callback);
  });

export const sendTabMessage = async <TResponse>(
  tabId: number,
  message: unknown
): Promise<TResponse> =>
  chromePromise<TResponse>((callback) => {
    chrome.tabs.sendMessage(tabId, message, callback);
  });

export const queryActiveTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const tabs = await chromePromise<chrome.tabs.Tab[]>((callback) => {
    chrome.tabs.query({ active: true, currentWindow: true }, callback);
  });
  return tabs[0];
};

export const executeScript = async <TResult>(
  details: chrome.scripting.ScriptInjection
): Promise<chrome.scripting.InjectionResult<TResult>[]> =>
  chromePromise((callback) => {
    chrome.scripting.executeScript(details, callback);
  });

export const removeCookie = async (
  details: chrome.cookies.RemoveDetails
): Promise<chrome.cookies.Details | null> =>
  chromePromise((callback) => {
    chrome.cookies.remove(details, callback);
  });

export const createOffscreenDocument = async (
  details: chrome.offscreen.CreateParameters
): Promise<void> =>
  chromePromiseVoid((callback) => {
    chrome.offscreen.createDocument(details, callback);
  });

export const closeOffscreenDocument = async (): Promise<void> =>
  chromePromiseVoid((callback) => {
    chrome.offscreen.closeDocument(callback);
  });
