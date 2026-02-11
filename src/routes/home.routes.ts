import { Router } from "express";
import { getAllHomePageImages } from "@/controllers/admin.controller";

const router = Router();

// Public route to get home page images (no authentication required)
router.get("/images", getAllHomePageImages);

export default router;

