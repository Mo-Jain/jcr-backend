"use server";

import { google } from "googleapis";

import dotenv from "dotenv";

dotenv.config();


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN as string;
const BOOKING_FOLDER_ID = process.env.BOOKING_FOLDER_ID as string;
const CAR_FOLDER_ID = process.env.CAR_FOLDER_ID as string;
const CUSTOMER_FOLDER_ID = process.env.CUSTOMER_FOLDER_ID as string;
const PROFILE_FOLDER_ID = process.env.PROFILE_FOLDER_ID as string;

// Google Drive OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost:3000");
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth: oauth2Client });

export async function createFolder(name:string,type:"booking"|"car"|"customer"|"profile"){
  const FOLDER_ID = type === "booking" ? BOOKING_FOLDER_ID : type === "car" ? CAR_FOLDER_ID : type === "customer" ? CUSTOMER_FOLDER_ID : PROFILE_FOLDER_ID;
  try{
    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [FOLDER_ID],
      },
        fields: "id",
      });
    return { success: true, message: "Folder created successfully", folderId: folder.data.id, name };
  }
  catch (error) {
    console.error("Rename Folder Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

  export async function deleteFolder(id:string) {
    try {
        await drive.files.delete({ fileId: id });
        console.log(`🗑️ Deleted Folder: ${id}`);
        return { success: true, message: "Folder deleted successfully" };

    } catch (error) {
        console.error("🗑️ Delete Error:",error);
        return { success: false, error: (error as Error).message };
    }
}