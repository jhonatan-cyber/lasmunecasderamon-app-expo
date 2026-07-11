// https://docs.expo.dev/guides/customizing-metro/#babel-config
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxRuntime: 'automatic' }],
    ],
    plugins: [
      // ── Dev-only instrumentation ──────────────────────────────────
      // Strips `useRenderCount()` calls from production bundles so they
      // have zero impact on bundle size and runtime performance.
      './plugins/babel-plugin-strip-use-render-count.js',
    ],
  };
};
