const path = require("path");
const dotenv = require("dotenv");

// Prefer a backend-specific environment file in production, while allowing the
// standalone API to use the root app's local database settings during local dev.
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { app } = require("./src/app");
const { prisma } = require("./src/lib/prisma");
const { ensureExistingBudgetInvoices } = require("./src/lib/invoice-service");

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);

  ensureExistingBudgetInvoices(prisma)
    .then((created) => {
      if (created > 0) {
        console.log(`Created ${created} missing budget invoice(s).`);
      }
    })
    .catch((error) => {
      console.error("Failed to create missing budget invoices:", error);
    });
});
