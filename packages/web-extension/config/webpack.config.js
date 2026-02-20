const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const PATHS = require('./paths')

// Merge webpack configuration files
const config = (_, argv) => {
  const browser = argv.env?.TARGET || process.env.TARGET || 'chrome'
  const isProduction = argv.mode === 'production'

  return merge(common, {
    devtool: isProduction ? false : 'source-map',
    entry: {
      background: PATHS.src + '/background.js',
      contentScript: PATHS.src + '/contentScript.js',
      options: PATHS.src + '/options.js',
      popup: PATHS.src + '/popup.js',
    },
    output: {
      filename: '[name].js',
      path: PATHS.build + '/' + browser,
    },
    resolve: {
      alias: {
        'webextension-polyfill':
          'webextension-polyfill/dist/browser-polyfill.min.js',
      },
    },
  })
}

module.exports = config
