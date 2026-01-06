const CLEAR_DELAY_MS = 2200;

type BadgeConfig = {
  text: string;
  color: string;
};

export const setBadge = async ({ text, color }: BadgeConfig): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    chrome.action.setBadgeText({ text }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    chrome.action.setBadgeBackgroundColor({ color }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, CLEAR_DELAY_MS);
};
