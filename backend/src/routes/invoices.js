const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");
const { createInvoiceNumber, paymentState } = require("../lib/invoice-service");

const invoicesRouter = express.Router();

invoicesRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        client: true,
        project: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    const paymentsThisMonth = await prisma.payment.aggregate({
      where: { paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amount: true },
    });
    const normalized = invoices.map((invoice) => ({
      ...invoice,
      balance: Math.max(invoice.amount - invoice.paidAmount, 0),
    }));

    return res.json({
      invoices: normalized,
      totalOutstanding: normalized.reduce((sum, invoice) => sum + invoice.balance, 0),
      totalPaid: normalized.reduce((sum, invoice) => sum + invoice.paidAmount, 0),
      collectedThisMonth: paymentsThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

invoicesRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};
    const amount = Number(data.amount);
    if (!data.clientId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "A client and amount greater than zero are required" });
    }

    let projectId = data.projectId || null;
    let taskId = data.taskId || null;
    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
      if (!task) return res.status(400).json({ error: "Selected task was not found" });
      projectId = task.projectId;
      if (task.project.clientId !== data.clientId) {
        return res.status(400).json({ error: "The task does not belong to the selected client" });
      }
    } else if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.clientId !== data.clientId) {
        return res.status(400).json({ error: "The project does not belong to the selected client" });
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: await createInvoiceNumber(prisma),
        clientId: data.clientId,
        projectId,
        taskId,
        amount,
        source: "CUSTOM",
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
    const data = req.body || {};
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    const amount = data.amount === undefined ? existing.amount : Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount < existing.paidAmount) {
      return res.status(400).json({ error: "Amount must be positive and cannot be less than payments received" });
    }
    const state = paymentState(amount, existing.paidAmount);
    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        clientId: data.clientId,
        projectId: data.projectId === undefined ? undefined : data.projectId || null,
        taskId: data.taskId === undefined ? undefined : data.taskId || null,
        amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        ...state,
      },
    });
    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return res.status(500).json({ error: "Failed to update invoice" });
  }
});

invoicesRouter.post("/:id/payments", requireAdmin, async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    const balance = Math.max(invoice.amount - invoice.paidAmount, 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      return res.status(400).json({ error: `Payment must be greater than zero and no more than ${balance}` });
    }
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paidAt: req.body?.paidAt ? new Date(req.body.paidAt) : new Date(),
          method: req.body?.method || null,
          reference: req.body?.reference || null,
          notes: req.body?.notes || null,
        },
      });
      const state = paymentState(invoice.amount, invoice.paidAmount + amount);
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { ...state, paidAt: payment.paidAt },
        include: { client: true, project: true, task: true, payments: { orderBy: { paidAt: "desc" } } },
      });
      return { payment, invoice: updatedInvoice };
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to record payment:", error);
    return res.status(500).json({ error: "Failed to record payment" });
  }
});

invoicesRouter.patch("/:id/payments/:paymentId", requireAdmin, async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    const existingPayment = invoice.payments.find((payment) => payment.id === req.params.paymentId);
    if (!existingPayment) return res.status(404).json({ error: "Payment not found" });
    const otherPayments = invoice.payments.reduce(
      (sum, payment) => sum + (payment.id === existingPayment.id ? 0 : payment.amount),
      0
    );
    if (!Number.isFinite(amount) || amount <= 0 || otherPayments + amount > invoice.amount) {
      return res.status(400).json({ error: `Total payments cannot exceed the invoice amount of ${invoice.amount}` });
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount,
          paidAt: req.body?.paidAt ? new Date(req.body.paidAt) : existingPayment.paidAt,
          method: req.body?.method || null,
          reference: req.body?.reference || null,
          notes: req.body?.notes || null,
        },
      });
      const payments = await tx.payment.findMany({
        where: { invoiceId: invoice.id },
        orderBy: { paidAt: "desc" },
      });
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const state = paymentState(invoice.amount, paidAmount);
      return tx.invoice.update({
        where: { id: invoice.id },
        data: { ...state, paidAt: payments[0]?.paidAt || null },
        include: { client: true, project: true, task: true, payments: { orderBy: { paidAt: "desc" } } },
      });
    });
    return res.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error("Failed to update payment:", error);
    return res.status(500).json({ error: "Failed to update payment" });
  }
});

invoicesRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return res.status(500).json({ error: "Failed to delete invoice" });
  }
});

module.exports = { invoicesRouter };
