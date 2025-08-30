const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const PATHS = require('./paths');

// used in the module rules and in the stats exlude list
const IMAGE_TYPES = /\.(png|jpe?g|gif|svg)$/i;

// To re-use webpack configuration across templates,
// CLI maintains a common webpack configuration file - `webpack.common.js`.
// Whenever user creates an extension, CLI adds `webpack.common.js` file
// in template's `config` folder
const common = {
  module: {
    rules: [
      // Help webpack in understanding CSS files imported in .js files
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // Check for images imported in .js files and
      {
        test: IMAGE_TYPES,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'images',
            },
          },
        ],
      },
    ],
  },
  output: {
    // the filename template for entry chunks
    filename: '[name].js',
    // the build folder to output bundles and assets in.
    path: PATHS.build,
  },
  plugins: [
    // Copy static assets from `public` folder to `build` folder
    new CopyWebpackPlugin({
      patterns: [
        {
          context: 'public',
          from: '**/*',
        },
      ],
    }),
    // Extract CSS into separate files
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
  stats: {
    all: false,
    assets: true,
    builtAt: true,
    errors: true,
    excludeAssets: [IMAGE_TYPES],
  },
};

module.exports = common;
