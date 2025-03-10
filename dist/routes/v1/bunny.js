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
exports.bunnyRouter = void 0;
const multer_1 = __importDefault(require("multer"));
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
const ACCESS_KEY = process.env.ACCESS_KEY;
const HOSTNAME = process.env.HOSTNAME;
const USERNAME = process.env.STORAGE_ZONE_NAME;
exports.bunnyRouter = (0, express_1.Router)();
const multerParse = (0, multer_1.default)({
    dest: "uploads/"
});
const handleFileUpload = (file, directoryPath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!file)
            return null;
        const fileStream = fs_1.default.createReadStream(file.path);
        const fileExtension = path_1.default.extname(file.originalname).slice(1);
        const url = `https://${HOSTNAME}/${USERNAME}/${directoryPath}/${file.originalname}`;
        const contentType = mime_types_1.default.lookup(fileExtension) || "application/octet-stream";
        const response = yield axios_1.default.put(url, fileStream, {
            headers: {
                AccessKey: ACCESS_KEY,
                "Content-Type": contentType
            }
        });
        fs_1.default.unlinkSync(file.path);
        if (response.data) {
            return {
                success: true,
                url: `https://carbook.b-cdn.net/${directoryPath}/${file.originalname}`,
                public_id: file.filename,
                message: "File uploaded successfully"
            };
        }
        else {
            return null;
        }
    }
    catch (e) {
        console.log(e);
        return null;
    }
});
exports.bunnyRouter.post("/upload", middleware_1.middleware, multerParse.fields([
    {
        name: "attachment",
    }
]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.files || !("attachment" in req.files)) {
        res.status(400).json({ message: "No file uploaded" });
        return;
    }
    // Accessing files correctly
    const attachment = (_a = req.files["attachment"]) === null || _a === void 0 ? void 0 : _a[0];
    console.log("attachment", attachment);
    if (!attachment) {
        res.status(400).json({ message: "No file uploaded" });
        return;
    }
    const uploadResponse = yield handleFileUpload(attachment, "bookings");
    if (uploadResponse) {
        res.status(201).json({
            message: uploadResponse.message,
            url: uploadResponse.url
        });
    }
    else {
        res.status(500).json({
            message: "Error uploading file"
        });
    }
}));
function BufferToStream(buffer) {
    const stream = new stream_1.Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}
