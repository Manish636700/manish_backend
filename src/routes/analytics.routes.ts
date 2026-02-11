import express from "express";
import {
    getOverviewAnalytics,
    getProductAnalytics,
    getSalesAnalytics,
    getUserAnalytics,
} from "@/controllers/analytics.controller";
import { adminMiddleware } from "@/middlewares/admin.middleware";

const router = express.Router();

// Apply admin middleware to all analytics routes
router.use(adminMiddleware);

// Analytics endpoints
router.get("/overview", getOverviewAnalytics);
router.get("/products", getProductAnalytics);
router.get("/sales", getSalesAnalytics);
router.get("/users", getUserAnalytics);

module.exports = router;