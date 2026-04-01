"use server";

import { prisma } from "@/lib/prisma";
import { createAdminSession, clearAdminSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type LoginFormState = {
  error?: string;
};

export async function adminLogin(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      role: UserRole.ADMIN,
    },
  });

  if (!user) {
    return { error: "Invalid admin credentials." };
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return { error: "Invalid admin credentials." };
  }

  await createAdminSession(user.id);
  redirect("/");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/login");
}
