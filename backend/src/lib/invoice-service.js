async function createInvoiceNumber(transaction) {
  const invoices = await transaction.invoice.findMany({ select: { invoiceNo: true } });
  const highest = invoices.reduce((max, invoice) => {
    const match = /^INV-(\d+)$/.exec(invoice.invoiceNo);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `INV-${String(Math.max(highest + 1, invoices.length + 1)).padStart(3, "0")}`;
}

function paymentState(amount, paidAmount) {
  const normalizedPaid = Math.min(Math.max(Number(paidAmount) || 0, 0), amount);
  return {
    paidAmount: normalizedPaid,
    status: normalizedPaid <= 0 ? "UNPAID" : normalizedPaid >= amount ? "PAID" : "PARTIAL",
  };
}

async function createBudgetInvoice(transaction, { clientId, projectId, taskId = null, amount, source, notes }) {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return transaction.invoice.create({
    data: {
      invoiceNo: await createInvoiceNumber(transaction),
      clientId,
      projectId,
      taskId,
      amount,
      source,
      notes,
    },
  });
}

async function syncBudgetInvoice(transaction, where, amount, fallback) {
  const invoice = await transaction.invoice.findFirst({ where, orderBy: { createdAt: "asc" } });

  if (!invoice) {
    return createBudgetInvoice(transaction, { ...fallback, amount });
  }

  if (amount < invoice.paidAmount) {
    throw new Error("A budget cannot be reduced below the amount already paid on its invoice");
  }

  if (amount <= 0) {
    return transaction.invoice.delete({ where: { id: invoice.id } });
  }

  const state = paymentState(amount, invoice.paidAmount);
  return transaction.invoice.update({
    where: { id: invoice.id },
    data: {
      amount,
      ...state,
      paidAt: state.paidAmount > 0 ? invoice.paidAt || new Date() : null,
    },
  });
}

module.exports = { createInvoiceNumber, paymentState, createBudgetInvoice, syncBudgetInvoice };
