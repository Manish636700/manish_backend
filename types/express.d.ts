import { JwtPayload } from "src/middlewares/auth.middleware";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

declare module "express" {
  interface Request {
    user?: JwtPayload | AdminUser;
  }
}
