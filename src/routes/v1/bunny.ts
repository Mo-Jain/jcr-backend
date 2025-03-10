import multer from "multer";
import { Router } from "express";
import { middleware } from "../../middleware";
import axios from "axios";
import path from "path"
import mime from 'mime-types';
import fs from "fs";
const ACCESS_KEY = process.env.ACCESS_KEY;
const HOSTNAME = process.env.HOSTNAME;
const USERNAME = process.env.STORAGE_ZONE_NAME;

export const bunnyRouter = Router();

const multerParse = multer({
    dest:"uploads/"
})


const handleFileUpload = async (file: Express.Multer.File, directoryPath: string) => {

    try{
        if(!file) return null;
   
        const fileStream = fs.createReadStream(file.path);
        const fileExtension = path.extname(file.originalname).slice(1);
       
        const url = `https://${HOSTNAME}/${USERNAME}/${directoryPath}/${file.originalname}`;
        const contentType = mime.lookup(fileExtension) || "application/octet-stream";

        const response = await axios.put(
            url,
            fileStream,
            {
                headers: {
                    AccessKey: ACCESS_KEY,
                    "Content-Type": contentType
                }
            }
        );

        fs.unlinkSync(file.path)

        if(response.data){
            return {
                success:true,
                url:`https://carbook.b-cdn.net/${directoryPath}/${file.originalname}`,
                public_id: file.filename,
                message:"File uploaded successfully"
            }
        }
        else {
            return null;
        }
    }
    catch(e){
        console.log(e);
        return null;
    } 
}

bunnyRouter.post("/upload", middleware, multerParse.fields([
        {
            name:"attachment",
        }
    ]), async (req, res) => {

    if (!req.files || !("attachment" in req.files)) {
        res.status(400).json({ message: "No file uploaded" });
        return;
    }
    
    // Accessing files correctly
    const attachment = (req.files as { [fieldname: string]: Express.Multer.File[] })["attachment"]?.[0];
    
    console.log("attachment",attachment)

    if (!attachment) {
        res.status(400).json({ message: "No file uploaded" });
        return;
    }

    const uploadResponse = await handleFileUpload(attachment,"bookings");

    if(uploadResponse){
        res.status(201).json({
            message: uploadResponse.message,
            url: uploadResponse.url
        })
    }
    else{
        res.status(500).json({
            message: "Error uploading file"
        })
    }

})

