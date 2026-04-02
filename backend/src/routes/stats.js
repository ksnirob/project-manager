const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");

const statsRouter = express.Router();

statsRouter.get("/", requireAdmin, async (_req, res) => {
  try {
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
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({ where: { status: "DONE" } }),
      prisma.task.count({ where: { status: { not: "DONE" } } }),
      prisma.project.count(),
      prisma.invoice.aggregate({
        where: {
          status: "PAID",
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
        status: "PAID",
        paidAt: { gte: sixMonthsAgo },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    });

    const revenueByMonth = {};
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short" });
      revenueByMonth[key] = 0;
    }

    monthlyData.forEach((inv) => {
      if (inv.paidAt) {
        const date = new Date(inv.paidAt);
        const key = date.toLocaleDateString("en-US", { month: "short" });
        if (Object.prototype.hasOwnProperty.call(revenueByMonth, key)) {
          revenueByMonth[key] += inv.amount;
        }
      }
    });

    const revenueChartData = Object.entries(revenueByMonth).map(([name, revenue]) => ({
      name,
      revenue,
    }));

    const totalRevenue = Object.values(revenueByMonth).reduce((sum, value) => sum + value, 0);

    return res.json({
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
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = { statsRouter };
