const normalize = (value: string) => value.trim().toLowerCase();

export const isAllowedHostname = (hostname: string, allowlist: string[]): boolean => {
  const normalizedHost = normalize(hostname);
  if (!normalizedHost) {
    return false;
  }

  return allowlist.some((entry) => {
    const rule = normalize(entry);
    if (!rule) {
      return false;
    }

    if (rule.startsWith('.')) {
      const suffix = rule.slice(1);
      return normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`);
    }

    return normalizedHost === rule;
  });
};

export const isAllowedUrl = (url: string, allowlist: string[]): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return isAllowedHostname(parsed.hostname, allowlist);
  } catch {
    return false;
  }
};
