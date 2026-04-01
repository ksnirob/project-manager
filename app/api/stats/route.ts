import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, TaskStatus, InvoiceStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalClients,
      activeProjects,
      completedTasks,
      pendingTasks,
      totalProjects,
      monthlyRevenue,
      recentInvoices,
      recentProjects,
      recentTasks,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      prisma.task.count({ where: { status: TaskStatus.DONE } }),
      prisma.task.count({ where: { status: { not: TaskStatus.DONE } } }),
      prisma.project.count(),
      prisma.invoice.aggregate({
        where: {
          status: InvoiceStatus.PAID,
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        include: { client: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.project.findMany({
        include: { client: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.task.findMany({
        include: { project: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const monthlyData = await prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PAID,
        paidAt: { gte: sixMonthsAgo },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    });

    const revenueByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short" });
      revenueByMonth[key] = 0;
    }

    monthlyData.forEach((inv) => {
      if (inv.paidAt) {
        const date = new Date(inv.paidAt);
        const key = date.toLocaleDateString("en-US", { month: "short" });
        if (revenueByMonth[key] !== undefined) {
          revenueByMonth[key] += inv.amount;
        }
      }
    });

    const revenueChartData = Object.entries(revenueByMonth).map(([name, revenue]) => ({
      name,
      revenue,
    }));

    const totalRevenue = Object.values(revenueByMonth).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      totalClients,
      activeProjects,
      completedTasks,
      pendingTasks,
      totalProjects,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalRevenue,
      revenueChartData,
      recentInvoices,
      recentProjects,
      recentTasks,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
