import nodemailer from "nodemailer";

// ──────────────────────────────────────────
// Transport
// ──────────────────────────────────────────

function getTransport(): nodemailer.Transporter {
  const host = process.env["SMTP_HOST"];
  const port = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host) throw new Error("SMTP_HOST env var is required");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

const FROM_ADDRESS =
  process.env["EMAIL_FROM"] ?? "KinSync <noreply@kinsync.app>";

// ──────────────────────────────────────────
// Send helpers
// ──────────────────────────────────────────

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

// ──────────────────────────────────────────
// Transactional templates
// ──────────────────────────────────────────

export async function sendMagicLink(
  email: string,
  magicLink: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Your KinSync sign-in link",
    html: `
      <p>Hi,</p>
      <p>Click the link below to sign in to KinSync. The link expires in 15 minutes.</p>
      <p><a href="${magicLink}">Sign in to KinSync</a></p>
      <p>If you did not request this email, you can safely ignore it.</p>
    `,
    text: `Sign in to KinSync: ${magicLink}\n\nThe link expires in 15 minutes.`,
  });
}

export async function sendFamilyInvite(
  email: string,
  inviterName: string,
  familyName: string,
  inviteUrl: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${familyName} on KinSync`,
    html: `
      <p>Hi,</p>
      <p>${inviterName} has invited you to join the <strong>${familyName}</strong> family on KinSync.</p>
      <p><a href="${inviteUrl}">Accept invitation</a></p>
    `,
    text: `${inviterName} invited you to join ${familyName} on KinSync: ${inviteUrl}`,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Welcome to KinSync",
    html: `
      <p>Hi ${name},</p>
      <p>Welcome to KinSync – your family, in sync.</p>
      <p>Get started by creating your first family or inviting members.</p>
    `,
    text: `Welcome to KinSync, ${name}! Get started at https://app.kinsync.app`,
  });
}
