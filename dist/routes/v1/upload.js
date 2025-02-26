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
const express_1 = __importDefault(require("express"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const googleapis_1 = require("googleapis");
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});
app.use((0, express_fileupload_1.default)());
// Google Drive OAuth2 Setup
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = process.env.BOOKING_FOLDER_ID;
const oauth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost:3000");
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = googleapis_1.google.drive({ version: "v3", auth: oauth2Client });
const uploadFileToDrive = (file, folderId) => __awaiter(void 0, void 0, void 0, function* () {
    const fileMetadata = {
        name: file.name,
        parents: [folderId],
    };
    const media = {
        mimeType: file.mimetype,
        body: file.data,
    };
    const driveResponse = yield drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id",
    });
    return driveResponse.data.id;
});
app.post("/upload/single", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files || !req.files.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }
    const file = req.files.file;
    try {
        const fileId = yield uploadFileToDrive(file, FOLDER_ID);
        res.json({ success: true, fileId });
        return;
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Upload failed" });
        return;
    }
}));
app.post("/upload/multiple", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files || !req.files.file) {
        res.status(400).json({ error: "No files uploaded" });
        return;
    }
    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    let uploadedBytes = 0;
    try {
        for (const file of files) {
            yield uploadFileToDrive(file, FOLDER_ID);
            uploadedBytes += file.size;
            // Emit overall progress to clients
            const overallProgress = Math.round((uploadedBytes / totalSize) * 100);
            io.emit("overallProgress", { progress: overallProgress });
            console.log(`Overall Upload Progress: ${overallProgress}%`);
        }
        res.json({ success: true, message: "All files uploaded successfully" });
        return;
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Upload failed" });
        return;
    }
}));
io.on("connection", (socket) => {
    console.log("Client connected");
});
server.listen(5000, () => console.log("Server running on port 5000"));
