module.exports = ({ config }) => {
  const organization = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  if (!organization || !project || !process.env.EXPO_PUBLIC_SENTRY_DSN) return config;

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ['@sentry/react-native', { organization, project, url: 'https://sentry.io' }],
    ],
  };
};
