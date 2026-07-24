import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.thapar.campusconnect',
  appName: 'TIET Campus Connect',
  webDir: 'build',
  server: {
    url: 'https://campusconnect.thapar.edu',
    cleartext: false,
    errorPath: 'offline.html',
  },
};

export default config;