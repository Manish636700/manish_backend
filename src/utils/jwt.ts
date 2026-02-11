import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";

export const generateToken = (user: User) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "secretkey",
    { expiresIn: "7d" }
  );
};
