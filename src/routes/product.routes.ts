import {
  getProductById,
  getCategories,
  getTags,
  getTopPicksProducts,
} from "@/controllers/product.controller";
import { Router } from "express";
const { getProducts } = require("../controllers/product.controller");

const router = Router();

router.get("/", getProducts);
router.get("/top-picks", getTopPicksProducts);
router.get("/categories", getCategories);
router.get("/tags", getTags);
router.get("/:id", getProductById);

module.exports = router;
