import {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  validateOfferCode,
  applyOfferCode,
  getTagsAndCategories,
} from "@/controllers/offer.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { adminMiddleware } from "@/middlewares/admin.middleware";

const { Router } = require("express");

const router = Router();

// Public routes (no authentication required)
router.post("/validate", validateOfferCode);
router.post("/apply", applyOfferCode);

// Admin routes (admin role required)
router.get("/tags-categories", adminMiddleware, getTagsAndCategories);
router.post("/", adminMiddleware, createOffer);
router.get("/", adminMiddleware, getAllOffers);
router.get("/:id", adminMiddleware, getOfferById);
router.put("/:id", adminMiddleware, updateOffer);
router.delete("/:id", adminMiddleware, deleteOffer);

module.exports = router;
