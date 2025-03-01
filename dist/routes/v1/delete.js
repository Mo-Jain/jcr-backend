"use server";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = deleteFile;
exports.deleteMultipleFiles = deleteMultipleFiles;
exports.deleteFolder = deleteFolder;
const googleapis_1 = require("googleapis");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
// Google Drive OAuth2 Setup
const oauth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost:3000");
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = googleapis_1.google.drive({ version: "v3", auth: oauth2Client });
function extractFileId(url) {
    const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
    return match ? match[1] : null;
}
function deleteFile(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fileId = extractFileId(url);
            if (!fileId)
                throw new Error("Invalid Google Drive URL");
            console.log(`🗑️ Deleting File: ${fileId}`);
            yield drive.files.delete({ fileId });
            console.log(`🗑️ Deleted File: ${fileId}`);
            return { success: true, message: "File deleted successfully" };
        }
        catch (error) {
            console.error("🗑️ Delete Error:", error);
            return { success: false, error: error.message };
        }
    });
}
function deleteMultipleFiles(urls) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!urls || urls.length === 0)
                throw new Error("No URLs provided");
            const deletedFiles = [];
            const errors = [];
            for (const url of urls) {
                const fileId = extractFileId(url);
                if (!fileId) {
                    errors.push({ url, error: "Invalid Google Drive URL" });
                    continue;
                }
                try {
                    yield drive.files.delete({ fileId });
                    console.log(`🗑️ Deleted File: ${fileId}`);
                    deletedFiles.push({ url, status: "deleted" });
                }
                catch (e) {
                    errors.push({ url, error: e.message });
                }
            }
            return { deletedFiles, errors };
        }
        catch (error) {
            console.error("Delete Error:", error);
            return { success: false, error: error.message };
        }
    });
}
function deleteFolder(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield drive.files.delete({ fileId: id });
            console.log(`🗑️ Deleted Folder: ${id}`);
            return { success: true, message: "Folder deleted successfully" };
        }
        catch (error) {
            console.error("🗑️ Delete Error:", error);
            return { success: false, error: error.message };
        }
    });
}
