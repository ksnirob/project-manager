import { prisma } from "@/lib/prisma";
import { ProjectStatus, TaskStatus, InvoiceStatus } from "@prisma/client";

export async function getProjects() {
  return prisma.project.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClients() {
  return prisma.client.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getTasks(projectId?: string) {
  return prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    include: { project: true },
    orderBy: [{ status: "asc" }, { order: "asc" }],
  });
}

export async function getInvoices() {
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

  return { invoices, totalOutstanding, collectedThisMonth };
}

export async function getProjectStats() {
  const [totalClients, activeProjects, completedTasks, monthlyRevenue] =
    await Promise.all([
      prisma.client.count(),
      prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      prisma.task.count({ where: { status: TaskStatus.DONE } }),
      prisma.invoice.aggregate({
        where: {
          status: InvoiceStatus.PAID,
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

  return {
    totalClients,
    activeProjects,
    completedTasks,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
  };
}
