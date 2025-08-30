const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (_, argv) =>
  merge(common, {
    devtool: argv.mode === 'production' ? false : 'source-map',
    entry: {
      background: PATHS.src + '/background.js',
      contentScript: PATHS.src + '/contentScript.js',
      options: PATHS.src + '/options.js',
      popup: PATHS.src + '/popup.js',
    },
  });

module.exports = config;
