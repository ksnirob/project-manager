const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");
const { createBudgetInvoice, syncBudgetInvoice } = require("../lib/invoice-service");

const tasksRouter = express.Router();

function toPositiveBudget(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function syncProjectStatus(tx, projectId) {
  const [total, incomplete] = await Promise.all([
    tx.task.count({ where: { projectId } }),
    tx.task.count({ where: { projectId, status: { not: "DONE" } } }),
  ]);
  await tx.project.update({
    where: { id: projectId },
    data: { status: total === 0 ? "PLANNING" : incomplete === 0 ? "COMPLETED" : "ACTIVE" },
  });
}

async function updateProjectBudget(tx, projectId, difference) {
  if (!difference) return;
  const project = await tx.project.findUnique({ where: { id: projectId } });
  await tx.project.update({
    where: { id: projectId },
    data: { budget: Math.max((project?.budget || 0) + difference, 0) },
  });
}

tasksRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const projectId = req.query.projectId;
    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId: String(projectId) } : undefined,
      include: { project: { include: { client: true } } },
      orderBy: [{ status: "asc" }, { order: "asc" }],
    });
    return res.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

tasksRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.title || !data.projectId) {
      return res.status(400).json({ error: "title and projectId are required" });
    }
    const order = await prisma.task.count({ where: { projectId: data.projectId, status: "TODO" } });
    const budget = toPositiveBudget(data.budget);
    const task = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!project) throw new Error("Project not found");
      const createdTask = await tx.task.create({
        data: {
          title: data.title,
          projectId: data.projectId,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          order,
          budget,
        },
      });
      await updateProjectBudget(tx, data.projectId, budget || 0);
      await syncProjectStatus(tx, data.projectId);
      await createBudgetInvoice(tx, {
        clientId: project.clientId,
        projectId: data.projectId,
        taskId: createdTask.id,
        amount: budget,
        source: "TASK_BUDGET",
        notes: `Automatically created from task budget: ${createdTask.title}`,
      });
      return createdTask;
    });
    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error("Failed to create task:", error);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

tasksRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    const nextBudget = data.budget === undefined ? existing.budget : toPositiveBudget(data.budget);
    const budgetDiff = (nextBudget || 0) - (existing.budget || 0);
    const task = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          budget: nextBudget,
        },
      });
      await updateProjectBudget(tx, existing.projectId, budgetDiff);
      await syncProjectStatus(tx, existing.projectId);
      if (budgetDiff !== 0) {
        const project = await tx.project.findUnique({ where: { id: existing.projectId } });
        await syncBudgetInvoice(tx, { taskId: existing.id, source: "TASK_BUDGET" }, nextBudget || 0, {
          clientId: project.clientId,
          projectId: existing.projectId,
          taskId: existing.id,
          source: "TASK_BUDGET",
          notes: `Automatically created from task budget: ${updatedTask.title}`,
        });
      }
      return updatedTask;
    });
    return res.json({ success: true, data: task });
  } catch (error) {
    console.error("Failed to update task:", error);
    return res.status(500).json({ error: "Failed to update task" });
  }
});

tasksRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    if (!req.body?.status) return res.status(400).json({ error: "status is required" });
    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: req.params.id },
        data: { status: req.body.status, order: Number(req.body.order || 0) },
      });
      await syncProjectStatus(tx, updated.projectId);
      return updated;
    });
    return res.json({ success: true, data: task });
  } catch (error) {
    console.error("Failed to update task status:", error);
    return res.status(500).json({ error: "Failed to update task status" });
  }
});

tasksRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: existing.id } });
      await updateProjectBudget(tx, existing.projectId, -(existing.budget || 0));
      await syncProjectStatus(tx, existing.projectId);
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = { tasksRouter };
