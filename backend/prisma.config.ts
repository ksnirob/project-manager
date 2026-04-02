import "dotenv/config";
import { defineConfig } from "prisma/config";

const fallbackUrl = "mysql://root:root@localhost:3306/project_manager";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || fallbackUrl,
  },
});
