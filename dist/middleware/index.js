"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.middleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const middleware = (req, res, next) => {
    const header = req.headers["authorization"];
    const token = header === null || header === void 0 ? void 0 : header.split(" ")[1];
    if (!token) {
        res.status(403).json({ message: "Unauthorized with no token" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_PASSWORD);
        req.userId = decoded.userId;
        req.name = decoded.name;
        next();
    }
    catch (e) {
        res.status(403).json({ message: "Unauthorized with token" });
        return;
    }
};
exports.middleware = middleware;
