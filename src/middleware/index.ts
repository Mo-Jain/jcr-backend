import jwt from "jsonwebtoken";

import { NextFunction, Request, Response } from "express";
import { JWT_PASSWORD } from "../config";

export const middleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];

  if (!token) {
    res.status(403).json({ message: "Unauthorized with token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_PASSWORD) as {
      userId: number;
      name: string;
    };

    req.userId = decoded.userId;
    req.name = decoded.name;
    next();
  } catch (e) {
    res.status(403).json({ message: "Unauthorized with no token" });
    return;
  }
};
