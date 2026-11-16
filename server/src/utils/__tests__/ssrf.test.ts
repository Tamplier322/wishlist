/// <reference types="vitest/globals" />
import { isPrivateIp, safeFetch } from '../ssrf';

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.5',
    '172.16.1.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    'fe80::1',
    'fc00::1',
    '::ffff:192.168.0.1',
  ])('считает приватным %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2001:4860:4860::8888'])(
    'считает публичным %s',
    (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    },
  );
});

describe('safeFetch', () => {
  it('запрещает не http(s) схемы', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toMatchObject({ status: 400 });
  });

  it('запрещает localhost и приватные литералы', async () => {
    await expect(safeFetch('https://localhost/')).rejects.toMatchObject({ status: 400 });
    await expect(safeFetch('http://127.0.0.1/', { allowHttp: true })).rejects.toMatchObject({
      status: 400,
    });
    await expect(safeFetch('https://10.1.2.3/')).rejects.toMatchObject({ status: 400 });
    await expect(safeFetch('https://169.254.169.254/latest/meta-data')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('запрещает учётные данные в URL и внутренние домены', async () => {
    await expect(safeFetch('https://user:pass@example.com/')).rejects.toMatchObject({
      status: 400,
    });
    await expect(safeFetch('https://printer.local/')).rejects.toMatchObject({ status: 400 });
  });

  it('по умолчанию требует https', async () => {
    await expect(safeFetch('http://example.com/')).rejects.toMatchObject({ status: 400 });
  });
});
