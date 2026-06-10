/** Parse raw stdin chunks into named key events. Pure and testable. */

export interface Key {
  name: string
  char?: string
  ctrl?: boolean
}

const CSI_FINAL: Record<string, string> = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  F: 'end',
  H: 'home',
  Z: 'shift-tab',
}

const CSI_TILDE: Record<string, string> = {
  '1': 'home',
  '3': 'delete',
  '4': 'end',
  '5': 'pageup',
  '6': 'pagedown',
  '7': 'home',
  '8': 'end',
}

const SS3: Record<string, string> = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  F: 'end',
  H: 'home',
}

const csiToKey = (finalByte: string, params: string): Key => {
  if (finalByte === '~') {
    const name = CSI_TILDE[params.split(';')[0] ?? '']

    return name ? { name } : { name: 'unknown' }
  }

  const name = CSI_FINAL[finalByte]

  return name ? { name } : { name: 'unknown' }
}

export const parseInput = (input: string): Key[] => {
  const keys: Key[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index]

    if (char === '\x1b') {
      const next = input[index + 1]

      if (next === '[') {
        let end = index + 2

        while (
          end < input.length &&
          !(input.charCodeAt(end) >= 0x40 && input.charCodeAt(end) <= 0x7e)
        ) {
          end += 1
        }

        if (end >= input.length) {
          keys.push({ name: 'escape' })
          break
        }

        keys.push(csiToKey(input[end] as string, input.slice(index + 2, end)))
        index = end + 1
        continue
      }

      if (next === 'O' && index + 2 < input.length) {
        const name = SS3[input[index + 2] as string]
        keys.push(name ? { name } : { name: 'unknown' })
        index += 3
        continue
      }

      keys.push({ name: 'escape' })
      index += 1
      continue
    }

    if (char === '\r' || char === '\n') {
      keys.push({ name: 'enter' })
      index += 1
      continue
    }

    if (char === '\t') {
      keys.push({ name: 'tab' })
      index += 1
      continue
    }

    if (char === '\x7f' || char === '\b') {
      keys.push({ name: 'backspace' })
      index += 1
      continue
    }

    const code = input.charCodeAt(index)

    if (code < 0x20) {
      keys.push({ ctrl: true, name: String.fromCharCode(code + 96) })
      index += 1
      continue
    }

    const codePoint = input.codePointAt(index) ?? code
    const printable = String.fromCodePoint(codePoint)
    keys.push({ char: printable, name: 'char' })
    index += printable.length
  }

  return keys
}
