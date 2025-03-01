"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const v1_1 = require("./routes/v1");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/v1", v1_1.router);
app.listen(3001, () => console.log("Server running on port 3001"));
