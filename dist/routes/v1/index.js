"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const types_1 = require("../../types");
const middleware_1 = require("../../middleware");
const car_1 = require("./car");
const booking_1 = require("./booking");
const calendar_1 = require("./calendar");
const customer_1 = require("./customer");
const bunny_1 = require("./bunny");
const src_1 = __importDefault(require("../../store/src"));
const delete_1 = require("./delete");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./auth");
// Load environment variables
dotenv_1.default.config();
exports.router = (0, express_1.Router)();
exports.router.post("/signup/se23crt1", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // check the user
    const parsedData = types_1.SignupSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const user = yield src_1.default.user.create({
            data: {
                username: parsedData.data.username,
                password: parsedData.data.password,
                name: parsedData.data.name,
                profileFolderId: process.env.PROFILE_FOLDER_ID,
                imageUrl: parsedData.data.imageUrl,
            },
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            name: user.name,
        }, config_1.JWT_PASSWORD);
        res.json({
            message: "User created successfully",
            token,
            name: user.name,
            id: user.id,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(403).json({ message: "Wrong Input type" });
        return;
    }
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                username: parsedData.data.username,
                password: parsedData.data.password,
            },
        });
        if (!user) {
            res.status(403).json({ message: "Invalid username or password" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            name: user.name,
        }, config_1.JWT_PASSWORD);
        res.status(200).json({
            message: "User signed in successfully",
            token,
            name: user.name,
            id: user.id,
        });
        return;
    }
    catch (e) {
        console.log(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.get("/admins", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield src_1.default.user.findMany();
        res.json({
            message: "Users fetched successfully",
            usernames: users.map(user => user.username)
        });
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
    }
}));
exports.router.get("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield src_1.default.customer.findMany();
        res.json({
            message: "Users fetched successfully",
            usernames: users.map(user => user.contact)
        });
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
    }
}));
exports.router.get("/admins/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.userId !== 1) {
            res.status(403).json({ message: "You are not authorized to perform this operation" });
            return;
        }
        const users = yield src_1.default.user.findMany();
        res.json({
            message: "Users fetched successfully",
            admins: users
        });
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
    }
}));
exports.router.get("/me", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({
            message: "User fetched successfully",
            id: user.id,
            name: user.name,
            imageUrl: user.imageUrl,
            user
        });
        return;
    }
    catch (e) {
        console.log(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.get("/me/name", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({
            message: "User fetched successfully",
            name: user.name,
            imageUrl: user.imageUrl,
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.put("/me", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.UpdateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(403).json({ message: "Wrong Input type" });
        return;
    }
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        yield src_1.default.user.update({
            where: {
                id: req.userId,
            },
            data: Object.assign({}, parsedData.data),
        });
        if (parsedData.data.imageUrl && user.imageUrl) {
            yield (0, delete_1.deleteFile)(user.imageUrl);
        }
        res.json({
            message: "User data updated successfully",
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.put("/user/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.UpdateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(403).json({ message: "Wrong Input type" });
        return;
    }
    try {
        if (req.userId !== 1) {
            res.status(403).json({ message: "You are not authorized to perform this operation" });
            return;
        }
        const user = yield src_1.default.user.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        yield src_1.default.user.update({
            where: {
                id: parseInt(req.params.id),
            },
            data: Object.assign({}, parsedData.data),
        });
        if (parsedData.data.imageUrl && user.imageUrl) {
            yield (0, delete_1.deleteFile)(user.imageUrl);
        }
        res.json({
            message: "User data updated successfully",
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.delete("/user/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.userId !== 1) {
            res.status(403).json({ message: "You are not authorized to perform this operation" });
            return;
        }
        const user = yield src_1.default.user.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        yield src_1.default.user.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });
        res.json({
            message: "User deleted successfully",
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.router.use("/car", car_1.carRouter);
exports.router.use("/booking", booking_1.bookingRouter);
exports.router.use("/calendar", calendar_1.calendarRouter);
exports.router.use("/customer", customer_1.customerRouter);
exports.router.use('/bunny', bunny_1.bunnyRouter);
exports.router.use('/oauth', auth_1.authRouter);
