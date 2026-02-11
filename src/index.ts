import { validateEnvironmentConfig } from "@/utils/configValidation";

const server = require("@/app");
const PORT = 5000;

// Validate environment configuration on startup
try {
  validateEnvironmentConfig();
} catch (error) {
  console.error("❌ Server startup failed due to configuration issues");
  process.exit(1);
}

// Initialize status update service
const initializeStatusService = async () => {
  try {
    const statusUpdateService = await import("./services/statusUpdateService");
    statusUpdateService.default.start();
    console.log("✅ Automated status update service initialized");
  } catch (error) {
    console.error("❌ Failed to initialize status update service:", error);
  }
};

server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("📧 Email verification system is active");

  // Start the automated status update service
  await initializeStatusService();
});
