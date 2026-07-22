#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { OtterClient } from './api.ts'
import { App } from './app.ts'
import {
  configPath,
  loadConfig,
  type OtterConfig,
  saveConfig,
} from './config.ts'

const HELP = `🦦 otter-tui — a terminal UI for Otter

Usage
  otter-tui              browse your bookmarks
  otter-tui login        configure the Otter URL + API key
  otter-tui add <url> [tag ...]
                         save a bookmark (Otter scrapes the page)
  otter-tui --help       show this help
  otter-tui --version    show the version

Configuration
  Reads OTTER_BASE_URL and OTTER_API_KEY, falling back to
  ${configPath()} (written by \`otter-tui login\`).
  Your API key lives in Otter under Settings.
`

const version = () => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version?: string }

    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const runLogin = async (): Promise<OtterConfig> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  // Suppress echo while the API key is typed so the secret never lands on
  // screen (or in the terminal's scrollback). readline routes every write —
  // prompt and keystrokes alike — through `_writeToOutput`, so we print the
  // prompt ourselves first, then mask everything but the submitting newline.
  let masked = false
  const iface = rl as unknown as {
    output: { write: (text: string) => void }
    _writeToOutput?: (text: string) => void
  }
  iface._writeToOutput = (text: string) => {
    if (masked) {
      if (text.includes('\n')) {
        iface.output.write('\n')
      }

      return
    }

    iface.output.write(text)
  }

  try {
    console.log('🦦 Connect otter-tui to your Otter instance\n')
    const baseUrl = (
      await rl.question('Otter URL (e.g. https://otter.example.com): ')
    ).trim()
    process.stdout.write('API key (Otter → Settings → API key): ')
    masked = true
    const apiKey = (await rl.question('')).trim()
    masked = false

    if (!baseUrl || !apiKey) {
      throw new Error('Both a URL and an API key are required')
    }

    const config: OtterConfig = {
      apiKey,
      baseUrl: baseUrl.replace(/\/+$/, ''),
    }
    const client = new OtterClient(config)
    process.stdout.write('\nChecking credentials… ')
    const profile = await client.me()
    console.log(`ok — hello ${profile.username ?? 'there'}!`)
    const path = saveConfig(config)
    console.log(`Saved to ${path}`)

    return config
  } finally {
    rl.close()
  }
}

const runQuickAdd = async (args: string[]) => {
  const [url, ...tags] = args

  if (!url) {
    throw new Error('Usage: otter-tui add <url> [tag ...]')
  }

  const config = loadConfig()

  if (!config) {
    throw new Error('Not configured — run `otter-tui login` first')
  }

  const client = new OtterClient(config)
  console.log(`🦦 Saving ${url}…`)
  const [saved] = await client.addBookmark(url, tags)
  console.log(`Saved “${saved?.title || url}” (${saved?.id})`)

  if (saved?.tags?.length) {
    console.log(`Tags: ${saved.tags.map((tag) => `#${tag}`).join(' ')}`)
  }
}

const main = async () => {
  const [command, ...rest] = process.argv.slice(2)

  if (command === '--help' || command === '-h') {
    console.log(HELP)
    return
  }

  if (command === '--version' || command === '-v') {
    console.log(version())
    return
  }

  if (command === 'login') {
    await runLogin()
    return
  }

  if (command === 'add') {
    await runQuickAdd(rest)
    return
  }

  if (command) {
    throw new Error(`Unknown command “${command}” — try otter-tui --help`)
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('otter-tui needs an interactive terminal')
  }

  const config = loadConfig() ?? (await runLogin())
  new App(new OtterClient(config)).start()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
