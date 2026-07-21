import { describe, expect, it } from 'vitest'
import { assertSafePublicUrl } from './url-guard'

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
})
