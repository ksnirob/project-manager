import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const status = body?.status as InvoiceStatus | undefined;

    if (!status || !Object.values(InvoiceStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        paidAt: status === InvoiceStatus.PAID ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return NextResponse.json({ error: "Failed to update invoice status" }, { status: 500 });
  }
}
