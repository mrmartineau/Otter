const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

async function buildForBrowser(browser) {
  console.log(`Building for ${browser}...`)

  // Read and merge manifests
  const baseManifestPath = path.resolve(__dirname, '../manifests/base.json')
  const browserManifestPath = path.resolve(
    __dirname,
    `../manifests/${browser}.json`,
  )

  const baseManifest = JSON.parse(fs.readFileSync(baseManifestPath, 'utf8'))
  const browserManifest = JSON.parse(
    fs.readFileSync(browserManifestPath, 'utf8'),
  )
  const finalManifest = { ...baseManifest, ...browserManifest }

  // Run webpack build
  const webpackConfig = require('./webpack.config.js')
  const compiler = webpack(
    webpackConfig({}, { env: { TARGET: browser }, mode: 'production' }),
  )

  await new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err)
      if (stats.hasErrors()) {
        const errors = stats.toJson().errors
        return reject(errors)
      }
      resolve()
    })
  })

  // Copy build output to dist directory
  const webpackBuildDir = path.resolve(__dirname, `../build/${browser}`)
  const finalDistDir = path.resolve(__dirname, `../dist/${browser}`)

  if (fs.existsSync(webpackBuildDir)) {
    copyDirectory(webpackBuildDir, finalDistDir)
  }

  // Write browser-specific manifest (overwrites the one copied from webpack)
  fs.writeFileSync(
    path.join(finalDistDir, 'manifest.json'),
    JSON.stringify(finalManifest, null, 2),
  )

  console.log(`✅ ${browser} build complete`)
}

// Build for both browsers
async function build() {
  try {
    await buildForBrowser('chrome')
    await buildForBrowser('firefox')
    console.log('🎉 All builds completed successfully!')
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

// Allow building specific browser
const target = process.argv[2]
if (target && ['chrome', 'firefox'].includes(target)) {
  buildForBrowser(target).catch(console.error)
} else {
  build()
}
