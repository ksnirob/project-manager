const { prisma } = require("../lib/prisma");

const ADMIN_SESSION_COOKIE = "pm_admin_session";

async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[ADMIN_SESSION_COOKIE];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.expires <= new Date() || session.user.role !== "ADMIN") {
      if (session) {
        await prisma.session.deleteMany({ where: { sessionToken: token } });
      }
      res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.admin = session.user;
    req.adminToken = token;
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

module.exports = { requireAdmin, ADMIN_SESSION_COOKIE };
