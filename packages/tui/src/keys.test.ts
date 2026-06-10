import { describe, expect, it } from 'vitest'
import { parseInput } from './keys.ts'

const keysOf = (input: string) => parseInput(input).keys

describe('parseInput', () => {
  it('parses printable characters', () => {
    expect(keysOf('a')).toEqual([{ char: 'a', name: 'char' }])
  })

  it('parses multi-byte characters as single keys', () => {
    expect(keysOf('🦦')).toEqual([{ char: '🦦', name: 'char' }])
  })

  it('parses enter, tab and backspace', () => {
    expect(keysOf('\r')).toEqual([{ name: 'enter' }])
    expect(keysOf('\t')).toEqual([{ name: 'tab' }])
    expect(keysOf('\x7f')).toEqual([{ name: 'backspace' }])
  })

  it('parses control characters', () => {
    expect(keysOf('\x03')).toEqual([{ ctrl: true, name: 'c' }])
    expect(keysOf('\x15')).toEqual([{ ctrl: true, name: 'u' }])
  })

  it('parses arrow keys (CSI)', () => {
    expect(keysOf('\x1b[A')).toEqual([{ name: 'up' }])
    expect(keysOf('\x1b[B')).toEqual([{ name: 'down' }])
    expect(keysOf('\x1b[C')).toEqual([{ name: 'right' }])
    expect(keysOf('\x1b[D')).toEqual([{ name: 'left' }])
  })

  it('parses arrow keys (SS3)', () => {
    expect(keysOf('\x1bOA')).toEqual([{ name: 'up' }])
  })

  it('parses home/end/page keys', () => {
    expect(keysOf('\x1b[H')).toEqual([{ name: 'home' }])
    expect(keysOf('\x1b[F')).toEqual([{ name: 'end' }])
    expect(keysOf('\x1b[5~')).toEqual([{ name: 'pageup' }])
    expect(keysOf('\x1b[6~')).toEqual([{ name: 'pagedown' }])
    expect(keysOf('\x1b[3~')).toEqual([{ name: 'delete' }])
  })

  it('parses a bare escape', () => {
    expect(parseInput('\x1b')).toEqual({ keys: [{ name: 'escape' }], rest: '' })
  })

  it('parses a pasted chunk into multiple keys', () => {
    expect(keysOf('hi\r')).toEqual([
      { char: 'h', name: 'char' },
      { char: 'i', name: 'char' },
      { name: 'enter' },
    ])
  })

  it('ignores unknown CSI sequences gracefully', () => {
    expect(keysOf('\x1b[99~')).toEqual([{ name: 'unknown' }])
  })

  it('buffers an incomplete CSI sequence as rest', () => {
    expect(parseInput('a\x1b[')).toEqual({
      keys: [{ char: 'a', name: 'char' }],
      rest: '\x1b[',
    })
  })

  it('buffers an incomplete SS3 sequence as rest', () => {
    expect(parseInput('\x1bO')).toEqual({ keys: [], rest: '\x1bO' })
  })

  it('reassembles a sequence split across two chunks', () => {
    const first = parseInput('\x1b[')
    expect(first.keys).toEqual([])
    expect(parseInput(`${first.rest}A`).keys).toEqual([{ name: 'up' }])
  })
})
