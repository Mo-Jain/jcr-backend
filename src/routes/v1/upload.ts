import express, { Request, Response } from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import { google } from "googleapis";
import { Server as SocketServer } from "socket.io";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(fileUpload());

// Google Drive OAuth2 Setup
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN!;
const FOLDER_ID = process.env.BOOKING_FOLDER_ID!;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost:3000");
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth: oauth2Client });


const uploadFileToDrive = async (file: UploadedFile, folderId: string) => {
    const fileMetadata = {
      name: file.name,
      parents: [folderId],
    };
  
    const media = {
      mimeType: file.mimetype,
      body: file.data,
    };
  
    const driveResponse = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
    });
  
    return driveResponse.data.id;
  };
  
  app.post("/upload/single", async (req: Request, res: Response) => {
    if (!req.files || !req.files.file) {
       res.status(400).json({ error: "No file uploaded" });
       return;
    }
  
    const file = req.files.file as UploadedFile;
  
    try {
      const fileId = await uploadFileToDrive(file, FOLDER_ID);
       res.json({ success: true, fileId });
       return
    } catch (error) {
      console.error("Upload error:", error);
       res.status(500).json({ error: "Upload failed" });
       return
    }
  });

  app.post("/upload/multiple", async (req: Request, res: Response) => {
    if (!req.files || !req.files.file) {
       res.status(400).json({ error: "No files uploaded" });
       return
    }
  
    const files: UploadedFile[] = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    let uploadedBytes = 0;
  
    try {
      for (const file of files) {
        await uploadFileToDrive(file, FOLDER_ID);
        uploadedBytes += file.size;
  
        // Emit overall progress to clients
        const overallProgress = Math.round((uploadedBytes / totalSize) * 100);
        io.emit("overallProgress", { progress: overallProgress });
  
        console.log(`Overall Upload Progress: ${overallProgress}%`);
      }
  
       res.json({ success: true, message: "All files uploaded successfully" });
       return
    } catch (error) {
      console.error("Upload error:", error);
       res.status(500).json({ error: "Upload failed" });
       return
    }
  });


  io.on("connection", (socket) => {
    console.log("Client connected");
  });
  
  server.listen(5000, () => console.log("Server running on port 5000"));
  
  
  
