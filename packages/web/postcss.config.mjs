// biome-ignore-all assist/source/useSortedKeys: order needs to be preserved
export default {
  plugins: {
    'postcss-import-ext-glob': {},
    'postcss-import': {},
    '@tailwindcss/nesting': {},
    '@csstools/postcss-global-data': {
      files: ['./src/styles/media.css'],
    },
    'postcss-preset-env': {
      stage: 0,
      features: {
        'nesting-rules': false,
        // 'custom-media-queries': false,
        'cascade-layers': false,
      },
    },
    'postcss-custom-media': {},
    'postcss-extend-rule': {},
    'postcss-axis': {},
    '@tailwindcss/postcss': {},
    cssnano: {
      preset: 'default',
      plugins: [['autoprefixer', {}]],
    },
  },
}
