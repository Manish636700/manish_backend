import { Router } from "express";
const {
  addToCart,
  verifyCartItems,
  getCart,
} = require("@/controllers/cart.controller");
const { authMiddleware } = require("@/middlewares/auth.middleware");

const router = Router();

router.post("/add", authMiddleware, addToCart);
router.post("/verify", verifyCartItems); // No auth required for verification
router.get("/", authMiddleware, getCart);

module.exports = router;
