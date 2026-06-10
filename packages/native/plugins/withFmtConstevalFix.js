const { withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

// Marker so we only inject once, even across repeated prebuilds.
const MARKER = '# fmt-consteval-fix'

// React Native 0.79's bundled `fmt` (11.x) uses `consteval` (via FMT_STRING) in
// a way that newer Clang toolchains (Xcode 26+) reject at compile time with:
//   "call to consteval function ... is not a constant expression"
//
// The obvious fix — predefining FMT_USE_CONSTEVAL=0 — does NOT work for this
// fmt version: `fmt/base.h` sets the macro *unconditionally* from compiler
// detection (no `#ifndef` guard), so a -D define is overridden back to 1 on
// modern Clang. Instead we patch the header at pod-install time, forcing every
// detection branch that would enable consteval to disable it. fmt then takes
// its (fully functional) constexpr fallback path and compiles. One patch covers
// all consumers (fmt, glog, RCT-Folly, React-Core) since they share the header.
const SNIPPET = `
    ${MARKER}
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      text = File.read(fmt_base)
      patched = text.gsub('#  define FMT_USE_CONSTEVAL 1', '#  define FMT_USE_CONSTEVAL 0')
      if patched != text
        File.write(fmt_base, patched)
        Pod::UI.puts '[withFmtConstevalFix] Forced FMT_USE_CONSTEVAL=0 in fmt/base.h'
      end
    end
`

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile',
      )
      let contents = fs.readFileSync(podfilePath, 'utf8')

      if (contents.includes(MARKER)) {
        return cfg
      }

      // Inject right after the Expo-generated `post_install do |installer|` line.
      const anchor = /post_install do \|installer\|\n/
      if (!anchor.test(contents)) {
        throw new Error(
          'withFmtConstevalFix: could not find `post_install do |installer|` in Podfile',
        )
      }
      contents = contents.replace(anchor, (match) => match + SNIPPET)
      fs.writeFileSync(podfilePath, contents)
      return cfg
    },
  ])
}
