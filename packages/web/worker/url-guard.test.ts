import { afterEach, describe, expect, it } from 'vitest'
import { assertSafePublicUrl, safeFetch } from './url-guard'

describe('assertSafePublicUrl', () => {
  it('allows public http(s) URLs', () => {
    expect(assertSafePublicUrl('https://example.com/page').hostname).toBe(
      'example.com',
    )
    expect(assertSafePublicUrl('http://example.com/rss.xml').protocol).toBe(
      'http:',
    )
  })

  it('rejects invalid URLs', () => {
    expect(() => assertSafePublicUrl('not a url')).toThrow('Invalid URL')
  })

  it('rejects non-http schemes', () => {
    expect(() => assertSafePublicUrl('file:///etc/passwd')).toThrow(
      'Only http(s) URLs are supported',
    )
    expect(() => assertSafePublicUrl('ftp://example.com')).toThrow(
      'Only http(s) URLs are supported',
    )
  })

  it('rejects localhost and internal hostnames', () => {
    expect(() => assertSafePublicUrl('http://localhost:8787')).toThrow(
      'URL host is not allowed',
    )
    expect(() => assertSafePublicUrl('http://foo.localhost')).toThrow()
    expect(() => assertSafePublicUrl('http://db.internal')).toThrow()
    expect(() => assertSafePublicUrl('http://printer.local')).toThrow()
    expect(() => assertSafePublicUrl('http://LOCALHOST.')).toThrow()
  })

  it('rejects private and reserved IPv4 ranges', () => {
    for (const host of [
      '127.0.0.1',
      '0.0.0.0',
      '10.1.2.3',
      '100.64.0.1',
      '169.254.169.254',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '198.18.0.1',
    ]) {
      expect(() => assertSafePublicUrl(`http://${host}/`)).toThrow(
        'URL host is not allowed',
      )
    }
  })

  it('allows public IPv4 addresses', () => {
    expect(assertSafePublicUrl('http://93.184.216.34/').hostname).toBe(
      '93.184.216.34',
    )
    expect(assertSafePublicUrl('http://172.32.0.1/').hostname).toBe(
      '172.32.0.1',
    )
  })

  it('rejects loopback, unique-local and mapped IPv6 addresses', () => {
    for (const host of [
      '[::1]',
      '[::]',
      '[fc00::1]',
      '[fd12:3456::1]',
      '[fe80::1]',
      '[::ffff:10.0.0.1]',
    ]) {
      expect(() => assertSafePublicUrl(`http://${host}/`)).toThrow(
        'URL host is not allowed',
      )
    }
  })

  it('rejects the full fe80::/10 link-local range', () => {
    for (const host of ['[fe80::1]', '[fe90::1]', '[fea0::1]', '[febf::1]']) {
      expect(() => assertSafePublicUrl(`http://${host}/`)).toThrow(
        'URL host is not allowed',
      )
    }
    // fec0::/10 (deprecated site-local) is outside fe80::/10
    expect(assertSafePublicUrl('http://[2001:db8::1]/').hostname).toBe(
      '[2001:db8::1]',
    )
  })
})

describe('safeFetch', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('follows safe redirects and returns the final response', async () => {
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('https://cloudflare-dns.com/')) {
        return new Response(JSON.stringify({ Answer: [] }), { status: 200 })
      }
      calls.push(url)
      if (url === 'https://example.com/start') {
        return new Response(null, {
          headers: { location: 'https://example.com/final' },
          status: 302,
        })
      }
      return new Response('ok', { status: 200 })
    }) as typeof fetch

    const response = await safeFetch('https://example.com/start')
    expect(await response.text()).toBe('ok')
    expect(calls).toEqual([
      'https://example.com/start',
      'https://example.com/final',
    ])
  })

  it('rejects hostnames that resolve to private addresses', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('https://cloudflare-dns.com/')) {
        return new Response(
          JSON.stringify({ Answer: [{ data: '10.0.0.5', type: 1 }] }),
          { status: 200 },
        )
      }
      return new Response('ok', { status: 200 })
    }) as typeof fetch

    await expect(safeFetch('https://rebind.example/')).rejects.toThrow(
      'URL host resolves to a disallowed address',
    )
  })

  it('fails open when DNS-over-HTTPS is unavailable', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('https://cloudflare-dns.com/')) {
        return new Response('unavailable', { status: 503 })
      }
      return new Response('ok', { status: 200 })
    }) as typeof fetch

    const response = await safeFetch('https://doh-down.example/')
    expect(await response.text()).toBe('ok')
  })

  it('rejects redirects to private addresses', async () => {
    globalThis.fetch = (async () =>
      new Response(null, {
        headers: { location: 'http://169.254.169.254/latest/meta-data' },
        status: 302,
      })) as typeof fetch

    await expect(safeFetch('https://example.com/start')).rejects.toThrow(
      'URL host is not allowed',
    )
  })

  it('rejects redirects to non-http schemes', async () => {
    globalThis.fetch = (async () =>
      new Response(null, {
        headers: { location: 'file:///etc/passwd' },
        status: 301,
      })) as typeof fetch

    await expect(safeFetch('https://example.com/start')).rejects.toThrow(
      'Only http(s) URLs are supported',
    )
  })

  it('gives up after too many redirects', async () => {
    let n = 0
    globalThis.fetch = (async () => {
      n += 1
      return new Response(null, {
        headers: { location: `https://example.com/hop-${n}` },
        status: 302,
      })
    }) as typeof fetch

    await expect(safeFetch('https://example.com/start')).rejects.toThrow(
      'Too many redirects',
    )
  })
})
