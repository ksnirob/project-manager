const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");

const invoicesRouter = express.Router();

invoicesRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });

    const totalOutstanding = invoices
      .filter((inv) => inv.status !== "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const collectedThisMonth = invoices
      .filter((inv) => {
        if (!inv.paidAt) return false;
        const paidDate = new Date(inv.paidAt);
        const now = new Date();
        return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalPaid = invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    return res.json({
      invoices,
      totalOutstanding,
      collectedThisMonth,
      totalPaid,
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

invoicesRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.clientId || typeof data.amount !== "number") {
      return res.status(400).json({ error: "clientId and amount are required" });
    }

    const count = await prisma.invoice.count();
    const invoiceNo = `INV-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: data.clientId,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
      },
    });

    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return res.status(500).json({ error: "Failed to create invoice" });
  }
});

invoicesRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        clientId: data.clientId,
        amount: typeof data.amount === "number" ? data.amount : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        status: data.status,
        paidAt: data.status === "PAID" ? new Date() : data.status === "UNPAID" ? null : undefined,
      },
    });

    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return res.status(500).json({ error: "Failed to update invoice" });
  }
});

invoicesRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body?.status;

    if (!status || !["UNPAID", "PARTIAL", "PAID"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    });

    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return res.status(500).json({ error: "Failed to update invoice status" });
  }
});

invoicesRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return res.status(500).json({ error: "Failed to delete invoice" });
  }
});

module.exports = { invoicesRouter };
