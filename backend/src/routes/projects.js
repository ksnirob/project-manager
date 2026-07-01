const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");
const { createBudgetInvoice, syncBudgetInvoice } = require("../lib/invoice-service");

const projectsRouter = express.Router();

projectsRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        invoices: true,
        tasks: {
          select: {
            id: true,
            title: true,
            budget: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(projects.map((project) => {
      const paidAmount = project.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
      const taskBudgetHistory = project.tasks
        .filter((task) => typeof task.budget === "number" && task.budget > 0)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((task) => ({
          taskId: task.id,
          taskTitle: task.title,
          amount: task.budget,
          createdAt: task.createdAt,
        }));
      const taskBudgetAdded = taskBudgetHistory.reduce((sum, item) => sum + item.amount, 0);

      const { tasks, ...projectWithoutTasks } = project;

      return {
        ...projectWithoutTasks,
        paidAmount,
        dueAmount: Math.max((project.budget || 0) - paidAmount, 0),
        taskBudgetAdded,
        taskBudgetHistory,
      };
    }));
  } catch (_) {
    return res.status(500).json({ error: "Failed to fetch projects" });
  }
});

projectsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.title || !data.clientId) {
      return res.status(400).json({ error: "title and clientId are required" });
    }

    const project = await prisma.$transaction(async (transaction) => {
      const createdProject = await transaction.project.create({ data: {
        title: data.title,
        clientId: data.clientId,
        budget: typeof data.budget === "number" ? data.budget : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        type: data.type,
        status: data.status,
        description: data.description,
        hasProjectCredentials: Boolean(data.hasProjectCredentials),
        projectUrl: data.projectUrl || null,
        cpanelUrl: data.cpanelUrl || null,
        cpanelUsername: data.cpanelUsername || null,
        cpanelPassword: data.cpanelPassword || null,
        adminUrl: data.adminUrl || null,
        adminUsername: data.adminUsername || null,
        adminPassword: data.adminPassword || null,
        projectFilesLink: data.projectFilesLink || null,
      } });
      await createBudgetInvoice(transaction, {
        clientId: data.clientId,
        projectId: createdProject.id,
        amount: Number(data.budget),
        source: "PROJECT_BUDGET",
        notes: `Automatically created from project budget: ${data.title}`,
      });
      return createdProject;
    });

    return res.status(201).json({ success: true, data: project });
  } catch (_) {
    return res.status(500).json({ error: "Failed to create project" });
  }
});

projectsRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Project not found" });

    const payload = {
      title: data.title,
      budget: typeof data.budget === "number" ? data.budget : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      type: data.type,
      status: data.status,
      description: data.description,
      hasProjectCredentials:
        typeof data.hasProjectCredentials === "boolean"
          ? data.hasProjectCredentials
          : undefined,
      projectUrl: data.projectUrl,
      cpanelUrl: data.cpanelUrl,
      cpanelUsername: data.cpanelUsername,
      cpanelPassword: data.cpanelPassword,
      adminUrl: data.adminUrl,
      adminUsername: data.adminUsername,
      adminPassword: data.adminPassword,
      projectFilesLink: data.projectFilesLink,
    };

    const project = await prisma.$transaction(async (transaction) => {
      const updatedProject = await transaction.project.update({ where: { id }, data: payload });
      if (typeof data.budget === "number" && data.budget !== existing.budget) {
        await syncBudgetInvoice(transaction, { projectId: id, source: "PROJECT_BUDGET" }, Math.max(data.budget, 0), {
          clientId: existing.clientId,
          projectId: id,
          source: "PROJECT_BUDGET",
          notes: `Automatically created from project budget: ${existing.title}`,
        });
      }
      return updatedProject;
    });

    return res.json({ success: true, data: project });
  } catch (_) {
    return res.status(500).json({ error: "Failed to update project" });
  }
});

projectsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    return res.json({ success: true });
  } catch (_) {
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

module.exports = { projectsRouter };
