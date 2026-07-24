import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.thapar.campusconnect',
  appName: 'Thapar Campus Connect',
  webDir: 'build',
  server: {
    url: 'https://campusconnect.thapar.edu',
    cleartext: false,
  },
};

export default config;