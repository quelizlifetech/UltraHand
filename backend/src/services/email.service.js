const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "onboarding@resend.dev";

const APP_NAME = "UltraHand";

/* ============================================================
   SEND OTP EMAIL
   ============================================================ */
async function sendOtpEmail(toEmail, otp, purpose = "password reset") {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY not configured in .env"
    );
  }

  const subject = `Your ${APP_NAME} verification code`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${APP_NAME} OTP</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:white;border-radius:16px;padding:40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;background:#ede9fe;border-radius:16px;line-height:56px;font-size:28px;">🩺</div>
    </div>

    <h1 style="text-align:center;color:#0f172a;font-size:22px;margin:0 0 8px;font-weight:600;">
      Verification Code
    </h1>

    <p style="text-align:center;color:#64748b;font-size:14px;margin:0 0 32px;">
      Use this code for ${purpose}
    </p>

    <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-family:'SF Mono','Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#0f172a;">
        ${otp}
      </div>
    </div>

    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 16px;">
      This code expires in <strong>10 minutes</strong>. Don't share it with anyone — ${APP_NAME} staff will never ask for it.
    </p>

    <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>

  <p style="text-align:center;color:#94a3b8;font-size:11px;margin:16px 0;">
    Sent by ${APP_NAME} · AI Hand Therapy
  </p>
</body>
</html>
  `.trim();

  const text = `
${APP_NAME} Verification Code

Your code is: ${otp}

Use this for ${purpose}. The code expires in 10 minutes.

If you didn't request this, you can safely ignore this email.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: toEmail,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      throw new Error(error.message || "Email send failed");
    }

    console.log("✅ OTP email sent to", toEmail, "id:", data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("❌ Email send exception:", err);
    throw err;
  }
}

module.exports = {
  sendOtpEmail,
};