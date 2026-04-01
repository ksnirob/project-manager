"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";

export async function createInvoice(data: {
  clientId: string;
  amount: number;
  dueDate?: Date;
  notes?: string;
}) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const count = await prisma.invoice.count();
    const invoiceNo = `INV-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: data.clientId,
        amount: data.amount,
        dueDate: data.dueDate,
        notes: data.notes,
      },
    });

    revalidatePath("/invoices");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoice(
  id: string,
  data: {
    clientId?: string;
    amount?: number;
    dueDate?: Date;
    notes?: string;
    status?: InvoiceStatus;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        paidAt: data.status === InvoiceStatus.PAID ? new Date() : data.status === InvoiceStatus.UNPAID ? null : undefined,
      },
    });

    revalidatePath("/invoices");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        paidAt: status === InvoiceStatus.PAID ? new Date() : null,
      },
    });

    revalidatePath("/invoices");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return { success: false, error: "Failed to update invoice status" };
  }
}

export async function deleteInvoice(id: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.invoice.delete({ where: { id } });
    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}
