"use server";
"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFolder = createFolder;
exports.deleteFolder = deleteFolder;
const googleapis_1 = require("googleapis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const BOOKING_FOLDER_ID = process.env.BOOKING_FOLDER_ID;
const CAR_FOLDER_ID = process.env.CAR_FOLDER_ID;
const CUSTOMER_FOLDER_ID = process.env.CUSTOMER_FOLDER_ID;
const PROFILE_FOLDER_ID = process.env.PROFILE_FOLDER_ID;
// Google Drive OAuth2 Setup
const oauth2Client = new googleapis_1.google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000",
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = googleapis_1.google.drive({ version: "v3", auth: oauth2Client });
function createFolder(name, type) {
  return __awaiter(this, void 0, void 0, function* () {
    const FOLDER_ID =
      type === "booking"
        ? BOOKING_FOLDER_ID
        : type === "car"
          ? CAR_FOLDER_ID
          : type === "customer"
            ? CUSTOMER_FOLDER_ID
            : PROFILE_FOLDER_ID;
    try {
      const folder = yield drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [FOLDER_ID],
        },
        fields: "id",
      });
      return {
        success: true,
        message: "Folder created successfully",
        folderId: folder.data.id,
        name,
      };
    } catch (error) {
      console.error("Rename Folder Error:", error);
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
    } catch (error) {
      console.error("🗑️ Delete Error:", error);
      return { success: false, error: error.message };
    }
  });
}
