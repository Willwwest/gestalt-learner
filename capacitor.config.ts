import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.echobloom.app',
  appName: 'EchoBloom',
  webDir: 'dist',
  server: { androidScheme: 'https' },
}

export default config
