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
exports.authRouter = void 0;
const express_1 = require("express");
const src_1 = __importDefault(require("../../store/src"));
const google_auth_library_1 = require("google-auth-library");
const dotenv_1 = __importDefault(require("dotenv"));
const folder_1 = require("./folder");
const booking_1 = require("./booking");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
// Load environment variables
dotenv_1.default.config();
exports.authRouter = (0, express_1.Router)();
const getUserInfo = (access_token) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    const data = yield response.json();
    console.log("data", data);
    return data;
});
exports.authRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
    try {
        const redirectUrl = 'http://localhost:3001/api/v1/oauth';
        const oAuth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUrl);
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile openid email',
            prompt: 'consent',
        });
        res.json({ url: authorizeUrl });
    }
    catch (err) {
        console.log("Error with signin in with google", err);
    }
}));
exports.authRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.query.code;
    try {
        const redirectUrl = 'http://localhost:3001/api/v1/oauth';
        const oAuth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUrl);
        const response = yield oAuth2Client.getToken(code);
        yield oAuth2Client.setCredentials(response.tokens);
        console.log("tokens acquired");
        const credentials = oAuth2Client.credentials;
        console.log("credentials", credentials);
        const data = yield getUserInfo(credentials.access_token || "");
        const folder = yield (0, folder_1.createFolder)(data.name + " " + data.contact, "customer");
        if (!folder.success || !folder.folderId) {
            res.status(400).json({ message: "Folder creation failed", error: folder.error });
            return;
        }
        let customer = yield src_1.default.customer.findFirst({
            where: {
                name: data.name,
                email: data.email,
            },
        });
        if (!customer) {
            customer = yield src_1.default.customer.create({
                data: {
                    name: data.name,
                    email: data.email,
                    folderId: folder.folderId,
                    joiningDate: (0, booking_1.formatDate)(new Date()),
                    imageUrl: data.picture
                },
            });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: customer.id,
            name: customer.name,
        }, config_1.JWT_PASSWORD);
        res.redirect(`http://localhost:3000/auth?token=${token}`);
        return;
    }
    catch (err) {
        console.error("Error with signin in with google", err);
        res.status(400).json({
            message: "Internal server error",
            error: err,
        });
        res.redirect(`http://localhost:3000/auth`);
        return;
    }
}));
