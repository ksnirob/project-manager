const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");

const tasksRouter = express.Router();

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

    const order = await prisma.task.count({
      where: {
        projectId: data.projectId,
        status: "TODO",
      },
    });

    const task = await prisma.task.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        order,
      },
    });

    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error("Failed to create task:", error);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

tasksRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });

    return res.json({ success: true, data: task });
  } catch (error) {
    console.error("Failed to update task:", error);
    return res.status(500).json({ error: "Failed to update task" });
  }
});

tasksRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body?.status;
    const order = Number(req.body?.order || 0);

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { status, order },
    });

    return res.json({ success: true, data: task });
  } catch (error) {
    console.error("Failed to update task status:", error);
    return res.status(500).json({ error: "Failed to update task status" });
  }
});

tasksRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = { tasksRouter };
