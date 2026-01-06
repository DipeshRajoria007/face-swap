import { describe, expect, it } from 'vitest';
import { isAllowedHostname, isAllowedUrl } from '../allowlist';

const allowlist = ['localhost', '.newtonschool.co'];

describe('isAllowedHostname', () => {
  it('matches exact hosts', () => {
    expect(isAllowedHostname('localhost', allowlist)).toBe(true);
  });

  it('matches subdomains for dot rules', () => {
    expect(isAllowedHostname('app.newtonschool.co', allowlist)).toBe(true);
    expect(isAllowedHostname('newtonschool.co', allowlist)).toBe(true);
  });

  it('rejects non-matching domains', () => {
    expect(isAllowedHostname('evilnewtonschool.co', allowlist)).toBe(false);
    expect(isAllowedHostname('example.com', allowlist)).toBe(false);
  });
});

describe('isAllowedUrl', () => {
  it('rejects non-http urls', () => {
    expect(isAllowedUrl('chrome://extensions', allowlist)).toBe(false);
  });

  it('accepts allowed http urls', () => {
    expect(isAllowedUrl('https://app.newtonschool.co', allowlist)).toBe(true);
  });
});
