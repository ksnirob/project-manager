const express = require("express");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const { prisma } = require("../lib/prisma");
const { requireAdmin, ADMIN_SESSION_COOKIE } = require("../middleware/auth");

const authRouter = express.Router();
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

authRouter.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        role: "ADMIN",
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid admin credentials." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid admin credentials." });
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await prisma.session.create({
      data: {
        sessionToken: token,
        userId: user.id,
        expires,
      },
    });

    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS * 1000,
      path: "/",
    });

    return res.json({
      success: true,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/logout", requireAdmin, async (req, res) => {
  try {
    await prisma.session.deleteMany({ where: { sessionToken: req.adminToken } });
    res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
    return res.json({ success: true });
  } catch (error) {
    console.error("Logout failed:", error);
    return res.status(500).json({ error: "Logout failed" });
  }
});

authRouter.get("/me", requireAdmin, async (req, res) => {
  return res.json({ admin: req.admin });
});

module.exports = { authRouter };
