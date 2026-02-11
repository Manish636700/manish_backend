import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "@/configs/db";

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Let preflight OPTIONS requests pass through so CORS can be handled upstream
    if (req.method === "OPTIONS") {
      return next();
    }
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    if (user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin role required." });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};
