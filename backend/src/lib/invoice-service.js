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

async function ensureExistingBudgetInvoices(prisma) {
  const projects = await prisma.project.findMany({
    include: {
      invoices: { select: { source: true, taskId: true } },
      tasks: { select: { id: true, title: true, budget: true } },
    },
  });

  let created = 0;

  for (const project of projects) {
    created += await prisma.$transaction(async (transaction) => {
      let projectCreated = 0;
      const taskBudget = project.tasks.reduce((sum, task) => sum + (task.budget || 0), 0);
      const projectOnlyBudget = Math.max((project.budget || 0) - taskBudget, 0);

      if (
        projectOnlyBudget > 0 &&
        !project.invoices.some((invoice) => invoice.source === "PROJECT_BUDGET")
      ) {
        await createBudgetInvoice(transaction, {
          clientId: project.clientId,
          projectId: project.id,
          amount: projectOnlyBudget,
          source: "PROJECT_BUDGET",
          notes: `Automatically created from existing project budget: ${project.title}`,
        });
        projectCreated += 1;
      }

      for (const task of project.tasks) {
        if (
          (task.budget || 0) > 0 &&
          !project.invoices.some(
            (invoice) => invoice.source === "TASK_BUDGET" && invoice.taskId === task.id
          )
        ) {
          await createBudgetInvoice(transaction, {
            clientId: project.clientId,
            projectId: project.id,
            taskId: task.id,
            amount: task.budget,
            source: "TASK_BUDGET",
            notes: `Automatically created from existing task budget: ${task.title}`,
          });
          projectCreated += 1;
        }
      }

      return projectCreated;
    });
  }

  return created;
}

module.exports = {
  createInvoiceNumber,
  paymentState,
  createBudgetInvoice,
  syncBudgetInvoice,
  ensureExistingBudgetInvoices,
};
