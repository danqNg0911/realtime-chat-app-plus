import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail({ to, token, userId }) {
  const verifyUrl = `${process.env.SERVER_URL}/api/auth/verify-email?token=${token}&id=${userId}`;
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify your email",
    html: `
      <p>Thanks for signing up. Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}">Verify email</a>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });
  return info;
}