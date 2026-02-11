import { validateEnvironmentConfig } from "@/utils/configValidation";

const app = require("@/app");

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

// Initialize the status service on module load
initializeStatusService();

export default app;
