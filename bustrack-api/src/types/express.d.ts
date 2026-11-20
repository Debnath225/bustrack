import type { TokenUser } from "../config/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: TokenUser;
    }
  }
}

export {};
