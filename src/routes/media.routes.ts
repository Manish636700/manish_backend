const { Router } = require("express");
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getProductImages,
} from "@/controllers/media.controller";
import multer from "multer";
import { adminMiddleware } from "@/middlewares/admin.middleware";

const router = Router();

// Health check endpoint (no auth required)
router.get("/health", (req: any, res: any) => {
  res.json({ status: "OK", message: "Media service is running" });
});

// Apply admin middleware to all other media routes
router.use(adminMiddleware);

// Configure Multer storage (in memory, since we upload directly to local storage)
const storage = multer.memoryStorage();
// Limit individual file size to 5MB and total fields to reasonable size
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

// POST /api/media/upload - Single image upload
// Fields in body: type (string), userId (optional), productId (optional)
router.post("/upload", upload.single("file"), uploadImage);

// POST /api/media/upload-multiple - Multiple images upload (max 4)
// Fields in body: type (string), productId (optional)
router.post("/upload-multiple", upload.array("files", 4), uploadMultipleImages);

// DELETE /api/media/:id - Delete image
router.delete("/:id", deleteImage);

// GET /api/media/product/:productId - Get all images for a product
router.get("/product/:productId", getProductImages);

module.exports = router;
