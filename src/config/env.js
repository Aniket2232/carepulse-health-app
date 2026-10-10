// Safe dotenv loader - works locally from .env and in Cloud (Render / Railway / Docker) without crashing
try {
  const dotenv = await import('dotenv');
  dotenv.default?.config?.() || dotenv.config?.();
} catch {
  // Running in cloud production (Render) where environment variables are injected directly in process.env
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(url => url.trim().replace(/\/+$/, '')),
  JWT_SECRET: process.env.JWT_SECRET || 'carepulse_dev_access_secret_min_32_chars_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'carepulse_dev_refresh_secret_min_32_chars_2026',
  REDIS_URL: process.env.REDIS_URL || '',
  MAIL_PROVIDER: (process.env.MAIL_PROVIDER || 'smtp').toLowerCase(),
  MAIL_HOST: process.env.MAIL_HOST || 'smtp.gmail.com',
  MAIL_PORT: parseInt(process.env.MAIL_PORT || '587', 10),
  MAIL_SECURE: process.env.MAIL_SECURE === 'true',
  MAIL_USER: process.env.MAIL_USER || '',
  MAIL_APP_PASSWORD: process.env.MAIL_APP_PASSWORD || process.env.SMTP_PASS || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  MAIL_FROM: process.env.MAIL_FROM || '"CarePulse Health" <no-reply@carepulse.health>'
};
