import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  email: string;
  userId: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload; // Type the user property
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("Auth middleware - Token:", token);
  console.log("Auth middleware - JWT_SECRET:", process.env.JWT_SECRET);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    ) as JwtPayload;
    console.log("Auth middleware - Decoded:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth middleware - Error:", err);
    return res.status(403).json({ message: "Invalid Token" });
  }
};
