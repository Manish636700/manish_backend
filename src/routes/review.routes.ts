import { Router } from "express";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getUserReviews,
  getAllReviews,
  adminDeleteReview,
  getBestReviews,
} from "../controllers/review.controller";
import { authMiddleware as authenticateToken } from "@/middlewares/auth.middleware";
import { adminMiddleware } from "@/middlewares/admin.middleware";

const router = Router();

console.log("🚀 Review routes file loaded - getBestReviews function:", typeof getBestReviews);

// Public routes - specific routes first
router.get("/best", getBestReviews);
router.get("/test", (req, res) => {
  console.log("🧪 Test route called!");
  res.json({ message: "Review routes are working!", timestamp: new Date().toISOString() });
});
router.get("/product/:productId", getProductReviews);

// User routes (require authentication)
router.post("/product/:productId", authenticateToken, createReview);
router.put("/:reviewId", authenticateToken, updateReview);
router.delete("/:reviewId", authenticateToken, deleteReview);
router.get("/user/my-reviews", authenticateToken, getUserReviews);

// Admin routes
router.get("/admin/all", authenticateToken, adminMiddleware, getAllReviews);
router.delete(
  "/admin/:reviewId",
  authenticateToken,
  adminMiddleware,
  adminDeleteReview
);

module.exports = router;
