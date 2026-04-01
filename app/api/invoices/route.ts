import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });

    const totalOutstanding = invoices
      .filter((inv) => inv.status !== InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + inv.amount, 0);

    const collectedThisMonth = invoices
      .filter((inv) => {
        if (!inv.paidAt) return false;
        const paidDate = new Date(inv.paidAt);
        const now = new Date();
        return (
          paidDate.getMonth() === now.getMonth() &&
          paidDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalPaid = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + inv.amount, 0);

    return NextResponse.json({
      invoices,
      totalOutstanding,
      collectedThisMonth,
      totalPaid,
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
