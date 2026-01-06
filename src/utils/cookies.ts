const buildParentDomain = (hostname: string): string | null => {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return parts.slice(-2).join('.');
};

export const buildCookieRemovalUrls = (pageUrl: string): string[] => {
  const parsed = new URL(pageUrl);
  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol;
  const port = parsed.port ? `:${parsed.port}` : '';

  const domains = new Set<string>();
  domains.add(hostname);

  const parent = buildParentDomain(hostname);
  if (parent) {
    domains.add(parent);
  }

  return Array.from(domains).map((domain) => `${protocol}//${domain}${port}/`);
};
