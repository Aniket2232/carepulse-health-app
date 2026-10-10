import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.MAIL_HOST || 'smtp.gmail.com',
      port: ENV.MAIL_PORT || 587,
      secure: ENV.MAIL_PORT === 465,
      auth: {
        user: ENV.MAIL_USER,
        pass: ENV.MAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}

function isDummyOrUnset(value) {
  if (!value || typeof value !== 'string') return true;
  const lower = value.toLowerCase().trim();
  return (
    lower.includes('your_') ||
    lower.includes('placeholder') ||
    lower.includes('16_character') ||
    lower.includes('dummy') ||
    lower.length < 8
  );
}

export const emailService = {
  /**
   * Send the 6-digit OTP code to the recipient via real email (SMTP, Resend, or Ethereal fallback in dev)
   */
  async sendOtpEmail(toEmail, otpCode) {
    // 1. Resend Provider
    if (ENV.MAIL_PROVIDER === 'resend') {
      if (!ENV.RESEND_API_KEY || isDummyOrUnset(ENV.RESEND_API_KEY)) {
        if (ENV.NODE_ENV === 'production') {
          throw new Error('RESEND_API_KEY is not configured in .env');
        }
        return this.sendDevFallback(toEmail, otpCode, 'RESEND_API_KEY not configured');
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: ENV.MAIL_FROM || 'onboarding@resend.dev',
          to: [toEmail],
          subject: 'Your CarePulse Health Verification Code',
          text: `Your CarePulse Health OTP is ${otpCode}. Valid for 5 minutes. Do not share it with anyone.`,
          html: this.generateHtmlTemplate(otpCode)
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errDetail = data?.message || `HTTP ${res.status}`;
        if (ENV.NODE_ENV !== 'production') {
          return this.sendDevFallback(toEmail, otpCode, `Resend rejected: ${errDetail}`);
        }
        throw new Error(`Resend API error: ${errDetail}`);
      }

      return { provider: 'resend', id: data.id };
    }

    // 2. Brevo (Sendinblue) Provider (Free 300 emails/day to ANY email address)
    if (ENV.MAIL_PROVIDER === 'brevo' || (ENV.BREVO_API_KEY && !isDummyOrUnset(ENV.BREVO_API_KEY))) {
      if (!ENV.BREVO_API_KEY || isDummyOrUnset(ENV.BREVO_API_KEY)) {
        if (ENV.NODE_ENV === 'production') {
          throw new Error('BREVO_API_KEY is not configured in .env');
        }
        return this.sendDevFallback(toEmail, otpCode, 'BREVO_API_KEY not configured');
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': ENV.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'CarePulse Health', email: ENV.MAIL_USER || 'no-reply@carepulse.health' },
          to: [{ email: toEmail }],
          subject: 'Your CarePulse Health Verification Code',
          textContent: `Your CarePulse Health OTP is ${otpCode}. Valid for 5 minutes. Do not share it with anyone.`,
          htmlContent: this.generateHtmlTemplate(otpCode)
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errDetail = data?.message || `HTTP ${res.status}`;
        if (ENV.NODE_ENV !== 'production') {
          return this.sendDevFallback(toEmail, otpCode, `Brevo rejected: ${errDetail}`);
        }
        throw new Error(`Brevo API error: ${errDetail}`);
      }

      console.log(`✅ [Real Email Sent via Brevo] To: ${toEmail} | MessageId: ${data.messageId}`);
      return { provider: 'brevo', messageId: data.messageId };
    }

    // 3. SMTP Provider (Default)
    const isCredentialsMissing = 
      !ENV.MAIL_USER || 
      !ENV.MAIL_APP_PASSWORD || 
      isDummyOrUnset(ENV.MAIL_USER) || 
      isDummyOrUnset(ENV.MAIL_APP_PASSWORD);

    if (isCredentialsMissing) {
      if (ENV.NODE_ENV === 'production') {
        throw new Error('SMTP credentials (MAIL_USER, MAIL_APP_PASSWORD) are not configured in .env');
      }
      return this.sendDevFallback(toEmail, otpCode, 'Placeholder credentials detected in .env');
    }

    // Try real SMTP delivery
    try {
      const mailer = getTransporter();
      const mailOptions = {
        from: ENV.MAIL_FROM,
        to: toEmail,
        subject: 'Your CarePulse Health Verification Code',
        text: `Your CarePulse Health OTP is ${otpCode}. Valid for 5 minutes. Do not share it with anyone.`,
        html: this.generateHtmlTemplate(otpCode)
      };

      const info = await mailer.sendMail(mailOptions);
      console.log(`✅ [Real Email Sent via SMTP] To: ${toEmail} | MessageId: ${info.messageId}`);
      return { provider: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`⚠️ SMTP Authentication Failed (${smtpErr.message})`);
      
      // In development mode, do NOT crash or block testing! Fall back gracefully
      if (ENV.NODE_ENV !== 'production') {
        return this.sendDevFallback(toEmail, otpCode, `SMTP rejected (${smtpErr.message}). Check 16-character App Password.`);
      }
      throw smtpErr;
    }
  },

  /**
   * Graceful Development Fallback using Ethereal Test Account and Console Banner
   */
  async sendDevFallback(toEmail, otpCode, reason) {
    console.log(`\n================================================================`);
    console.log(`🔔 [DEVELOPMENT MODE OTP ACTIVE]`);
    console.log(`📧 Recipient: ${toEmail}`);
    console.log(`🔑 LOGIN OTP CODE: ${otpCode}`);
    console.log(`ℹ️ Reason: ${reason}`);
    console.log(`💡 Note: To receive real emails in Gmail, create a 16-char Google App Password`);
    console.log(`   at https://myaccount.google.com/apppasswords and set MAIL_APP_PASSWORD in .env`);
    console.log(`================================================================\n`);

    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      const info = await testTransporter.sendMail({
        from: ENV.MAIL_FROM || '"CarePulse Health" <no-reply@carepulse.health>',
        to: toEmail,
        subject: 'Your CarePulse Health Verification Code',
        text: `Your CarePulse Health OTP is ${otpCode}. Valid for 5 minutes. Do not share it with anyone.`,
        html: this.generateHtmlTemplate(otpCode)
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`🌐 [Ethereal Web Preview URL]: ${previewUrl}`);
      return { provider: 'ethereal', messageId: info.messageId, previewUrl, devOtp: otpCode };
    } catch {
      return { provider: 'dev-console', devOtp: otpCode };
    }
  },

  /**
   * Professional HTML email template
   */
  generateHtmlTemplate(otpCode) {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CarePulse Health Verification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
          .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px 28px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { display: inline-block; background: linear-gradient(135deg, #0891b2, #2563eb); color: #ffffff; font-size: 24px; font-weight: 900; padding: 12px 18px; border-radius: 16px; margin-bottom: 8px; }
          .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .doctor-badge { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-top: 8px; }
          .content { text-align: center; margin: 28px 0; }
          .otp-card { background: #f8fafc; border: 2px dashed #0891b2; border-radius: 16px; padding: 20px; margin: 20px 0; }
          .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
          .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0891b2; font-family: monospace; }
          .validity { font-size: 13px; color: #b45309; background: #fffbeb; padding: 8px 12px; border-radius: 10px; display: inline-block; font-weight: 600; margin-top: 12px; }
          .warning { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px; }
          .footer { border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🩺 CarePulse</div>
            <h1 class="title">CarePulse Health</h1>
            <p class="subtitle">Healthcare Staffing & Home-Care Platform</p>
            <div class="doctor-badge">Dr. Manoj S. Kamble • Mumbai - 400043</div>
          </div>
          
          <div class="content">
            <p style="font-size: 14px; color: #334155; margin: 0;">Your verification code for secure login is:</p>
            
            <div class="otp-card">
              <div class="otp-label">One-Time Password (OTP)</div>
              <div class="otp-code">${otpCode}</div>
              <div class="validity">⏱️ Valid for 5 minutes only</div>
            </div>

            <p class="warning">
              Do not share this OTP with anyone, including CarePulse personnel. If you did not request this login code, please ignore this email.
            </p>
          </div>

          <div class="footer">
            <p>© 2026 CarePulse Health Platform. All rights reserved.<br>Digital Personal Data Protection (DPDP) Act, 2023 Compliant.</p>
          </div>
        </div>
      </body>
    </html>
    `;
  }
};
