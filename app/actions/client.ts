"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";

export async function createClient(data: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
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
        createdAt: new Date(),
      },
    });

    if (data.address !== undefined) {
      await prisma.$executeRaw`
        UPDATE \`Client\`
        SET \`address\` = ${data.address}
        WHERE \`id\` = ${client.id}
      `;
    }

    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    company?: string | null;
    address?: string | null;
    notes?: string | null;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const { address, ...otherFields } = data;

    if (Object.keys(otherFields).length > 0) {
      await prisma.client.update({
        where: { id },
        data: otherFields,
      });
    }

    if (address !== undefined) {
      await prisma.$executeRaw`
        UPDATE \`Client\`
        SET \`address\` = ${address}
        WHERE \`id\` = ${id}
      `;
    }

    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("Failed to update client:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update client",
    };
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
