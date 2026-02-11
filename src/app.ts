require("dotenv").config();
import express from "express";
import fs from "fs";
import path from "path";
const morgan = require("morgan");

const userRoutes = require("@/routes/user.routes");
const productRoutes = require("./routes/product.routes");
const mediaRoutes = require("./routes/media.routes");
const cartRoutes = require("@/routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("@/routes/admin.routes");
const analyticsRoutes = require("@/routes/analytics.routes");
const offerRoutes = require("./routes/offer.routes");
const reviewRoutes = require("./routes/review.routes");
import homeRoutes from "./routes/home.routes";

const app = express();

// Increase body parser limits so large uploads or large form payloads don't trigger 413
// Note: multipart/form-data uploads are handled by multer on specific routes, but
// increasing these limits helps for any JSON/urlencoded endpoints and edge cases.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const publicDir = path.resolve(process.cwd(), "public");
const publicFallbackDir = path.resolve(process.cwd(), "..", "public");
const resolvedPublicDir = fs.existsSync(publicDir)
  ? publicDir
  : publicFallbackDir;
app.use(express.static(resolvedPublicDir));

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/home", homeRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/admin/analytics", analyticsRoutes);

// CORS middleware for frontend connection
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Sassy Shringar Backend API!");
});

module.exports = app;
