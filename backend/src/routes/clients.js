const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");

const clientsRouter = express.Router();

clientsRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
    });
    return res.json(clients);
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return res.status(500).json({ error: "Failed to fetch clients" });
  }
});

clientsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, company, address, notes } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return res.status(201).json({ success: true, data: client });
  } catch (error) {
    console.error("Failed to create client:", error);
    return res.status(500).json({ error: "Failed to create client" });
  }
});

clientsRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, address, notes } = req.body || {};

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        company,
        address,
        notes,
      },
    });

    return res.json({ success: true, data: client });
  } catch (error) {
    console.error("Failed to update client:", error);
    return res.status(500).json({ error: "Failed to update client" });
  }
});

clientsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return res.status(500).json({ error: "Failed to delete client" });
  }
});

module.exports = { clientsRouter };
