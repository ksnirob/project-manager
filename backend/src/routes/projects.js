const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");

const projectsRouter = express.Router();

projectsRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return res.status(500).json({ error: "Failed to fetch projects" });
  }
});

projectsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.title || !data.clientId) {
      return res.status(400).json({ error: "title and clientId are required" });
    }

    const project = await prisma.project.create({
      data: {
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
      },
    });

    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Failed to create project:", error);
    return res.status(500).json({ error: "Failed to create project" });
  }
});

projectsRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

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

    const project = await prisma.project.update({
      where: { id },
      data: payload,
    });

    return res.json({ success: true, data: project });
  } catch (error) {
    console.error("Failed to update project:", error);
    return res.status(500).json({ error: "Failed to update project" });
  }
});

projectsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

module.exports = { projectsRouter };
