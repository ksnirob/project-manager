"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";

export async function createClient(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        notes: data.notes,
      },
    });

    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(
  id: string,
  data: { name?: string; email?: string; phone?: string; company?: string; notes?: string }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await prisma.client.update({
      where: { id },
      data,
    });

    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Failed to update client:", error);
    return { success: false, error: "Failed to update client" };
  }
}

export async function deleteClient(id: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.client.delete({ where: { id } });
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    return { success: false, error: "Failed to delete client" };
  }
}
