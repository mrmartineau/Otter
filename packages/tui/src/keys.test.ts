import { describe, expect, it } from 'vitest'
import { parseInput } from './keys.ts'

describe('parseInput', () => {
  it('parses printable characters', () => {
    expect(parseInput('a')).toEqual([{ char: 'a', name: 'char' }])
  })

  it('parses multi-byte characters as single keys', () => {
    expect(parseInput('🦦')).toEqual([{ char: '🦦', name: 'char' }])
  })

  it('parses enter, tab and backspace', () => {
    expect(parseInput('\r')).toEqual([{ name: 'enter' }])
    expect(parseInput('\t')).toEqual([{ name: 'tab' }])
    expect(parseInput('\x7f')).toEqual([{ name: 'backspace' }])
  })

  it('parses control characters', () => {
    expect(parseInput('\x03')).toEqual([{ ctrl: true, name: 'c' }])
    expect(parseInput('\x15')).toEqual([{ ctrl: true, name: 'u' }])
  })

  it('parses arrow keys (CSI)', () => {
    expect(parseInput('\x1b[A')).toEqual([{ name: 'up' }])
    expect(parseInput('\x1b[B')).toEqual([{ name: 'down' }])
    expect(parseInput('\x1b[C')).toEqual([{ name: 'right' }])
    expect(parseInput('\x1b[D')).toEqual([{ name: 'left' }])
  })

  it('parses arrow keys (SS3)', () => {
    expect(parseInput('\x1bOA')).toEqual([{ name: 'up' }])
  })

  it('parses home/end/page keys', () => {
    expect(parseInput('\x1b[H')).toEqual([{ name: 'home' }])
    expect(parseInput('\x1b[F')).toEqual([{ name: 'end' }])
    expect(parseInput('\x1b[5~')).toEqual([{ name: 'pageup' }])
    expect(parseInput('\x1b[6~')).toEqual([{ name: 'pagedown' }])
    expect(parseInput('\x1b[3~')).toEqual([{ name: 'delete' }])
  })

  it('parses a bare escape', () => {
    expect(parseInput('\x1b')).toEqual([{ name: 'escape' }])
  })

  it('parses a pasted chunk into multiple keys', () => {
    expect(parseInput('hi\r')).toEqual([
      { char: 'h', name: 'char' },
      { char: 'i', name: 'char' },
      { name: 'enter' },
    ])
  })

  it('ignores unknown CSI sequences gracefully', () => {
    expect(parseInput('\x1b[99~')).toEqual([{ name: 'unknown' }])
  })
})
