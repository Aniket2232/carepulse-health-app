// Safe dotenv loader - works locally and in Cloud (Render / Railway / Docker)
try {
  const dotenv = await import('dotenv');
  dotenv.default?.config?.() || dotenv.config?.();
} catch {
  // Cloud platforms inject environment variables directly into process.env
}

import os from 'os';
import app from './src/app.js';
import { ENV } from './src/config/env.js';

const PORT = process.env.PORT || ENV.PORT || 5000;
const HOST = '0.0.0.0';

function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (_) {}
  return '127.0.0.1';
}

const lanIp = getLocalIpAddress();

app.listen(PORT, HOST, () => {
  console.log(`================================================================`);
  console.log(`🚀 CarePulse Auth Service Started (DPDP Act 2023 Compliant)`);
  console.log(`📡 Server running on port ${PORT} (0.0.0.0:${PORT})`);
  console.log(`💻 Local:       http://localhost:${PORT}`);
  console.log(`📱 LAN / Phone: http://${lanIp}:${PORT}`);
  console.log(`🩺 Health:      http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});
