module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxRuntime: 'automatic' }],
    ],
    plugins: [
      './plugins/babel-plugin-strip-use-render-count.js',
    ],
  };
};
