// The end-to-end build: the site's own server passes API calls on to the seeded API, so
// the suite runs beside a local dev server without sharing its ports
export const environment = {
  production: false,
  clerkPublishableKey: 'pk_test_bmVlZGVkLWJhcm5hY2xlLTU0LmNsZXJrLmFjY291bnRzLmRldiQ',
  googleMapsApiKey: 'AIzaSyCeuTgq4qe2k8obnbYWrwWsG91B6aDUSA0',
  lccApiBaseUrl: 'http://localhost:4300/v1',
  sentryDsn: '',
  isPreview: false,
};
