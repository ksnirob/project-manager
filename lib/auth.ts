import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";

export const ADMIN_SESSION_COOKIE = "pm_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!session || session.expires <= new Date()) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    return null;
  }

  if (session.user.role !== UserRole.ADMIN) {
    return null;
  }

  return session.user;
}

export async function isAdminAuthenticated() {
  const admin = await getCurrentAdmin();
  return Boolean(admin);
}
