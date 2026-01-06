import { describe, expect, it } from 'vitest';
import { buildCookieRemovalUrls } from '../cookies';

describe('buildCookieRemovalUrls', () => {
  it('includes host and parent domain', () => {
    const urls = buildCookieRemovalUrls('https://app.newtonschool.co/path');
    expect(urls).toContain('https://app.newtonschool.co/');
    expect(urls).toContain('https://newtonschool.co/');
  });

  it('keeps localhost with port', () => {
    const urls = buildCookieRemovalUrls('http://localhost:3000/');
    expect(urls).toEqual(['http://localhost:3000/']);
  });
});
