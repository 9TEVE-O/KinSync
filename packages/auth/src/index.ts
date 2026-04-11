import { prisma, type User } from "@kinsync/db";
import { SignJWT, jwtVerify } from "jose";

// ──────────────────────────────────────────
// Token helpers
// ──────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env["JWT_SECRET"];
  if (!secret) throw new Error("JWT_SECRET env var is required");
  return new TextEncoder().encode(secret);
}

export async function signToken(userId: string): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    if (typeof userId !== "string") return null;
    return { userId };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// Session management
// ──────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const token = await signToken(userId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function getSessionUser(
  token: string
): Promise<User | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } });
    return null;
  }

  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

// ──────────────────────────────────────────
// Email / magic-link auth
// ──────────────────────────────────────────

export async function findOrCreateUser(
  email: string,
  name?: string
): Promise<User> {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: name ?? null },
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
}
