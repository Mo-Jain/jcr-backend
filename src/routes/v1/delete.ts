"use server";

import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN as string;

// Google Drive OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000",
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth: oauth2Client });

function extractFileId(url: string): string | null {
  const match =
    url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
}

export async function deleteFile(url: string) {
  try {
    const fileId = extractFileId(url);
    if (!fileId) throw new Error("Invalid Google Drive URL");

    console.log(`🗑️ Deleting File: ${fileId}`);
    await drive.files.delete({ fileId });
    console.log(`🗑️ Deleted File: ${fileId}`);
    return { success: true, message: "File deleted successfully" };
  } catch (error) {
    console.error("🗑️ Delete Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteMultipleFiles(urls: string[]) {
  try {
    if (!urls || urls.length === 0) throw new Error("No URLs provided");

    const deletedFiles = [];
    const errors = [];

    for (const url of urls) {
      const fileId = extractFileId(url);
      if (!fileId) {
        errors.push({ url, error: "Invalid Google Drive URL" });
        continue;
      }

      try {
        await drive.files.delete({ fileId });
        console.log(`🗑️ Deleted File: ${fileId}`);
        deletedFiles.push({ url, status: "deleted" });
      } catch (e) {
        errors.push({ url, error: (e as Error).message });
      }
    }

    return { deletedFiles, errors };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteFolder(id: string) {
  try {
    await drive.files.delete({ fileId: id });
    console.log(`🗑️ Deleted Folder: ${id}`);
    return { success: true, message: "Folder deleted successfully" };
  } catch (error) {
    console.error("🗑️ Delete Error:", error);
    return { success: false, error: (error as Error).message };
  }
}
