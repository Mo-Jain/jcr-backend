import { Router } from "express";
import client from "../../store/src";
import { middleware } from "../../middleware";
import {OAuth2Client} from 'google-auth-library';
import dotenv from "dotenv";
import { createFolder } from "./folder";
import { formatDate } from "./booking";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";
// Load environment variables
dotenv.config();

export const authRouter = Router();

const getUserInfo = async (access_token: string) => {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    const data = await response.json();
    console.log("data",data);
    return data;
  }

authRouter.post("/signin",async (req,res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');

    try{
        const redirectUrl = 'http://localhost:3001/api/v1/oauth';
        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID as string,
            process.env.GOOGLE_CLIENT_SECRET as string,
            redirectUrl,
        );

        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile openid email',
            prompt: 'consent',
        }); 

    res.json({url: authorizeUrl})
    }
    catch(err){
        console.log("Error with signin in with google",err);
    }
})

authRouter.get("/",async (req,res) => {
    const code = req.query.code as string;
    try {
        const redirectUrl = 'http://localhost:3001/api/v1/oauth';
        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID as string,
            process.env.GOOGLE_CLIENT_SECRET as string,
            redirectUrl,
        );

        const response = await oAuth2Client.getToken(code);
        await oAuth2Client.setCredentials(response.tokens);
        console.log("tokens acquired");
        const credentials = oAuth2Client.credentials;
        console.log("credentials",credentials);
        const data = await getUserInfo(credentials.access_token || "");

        const folder = await createFolder(data.name+" "+data.contact, "customer");
        if(!folder.success || !folder.folderId) {
            res.status(400).json({ message: "Folder creation failed", error: folder.error });
            return;
        }

        let customer = await client.customer.findFirst({
            where: {
                name: data.name,
                email: data.email,
            },
        });
    
        if(!customer) {
            customer = await client.customer.create({
                data: {
                  name: data.name,
                  email: data.email,
                  folderId: folder.folderId,
                  joiningDate: formatDate(new Date()),
                  imageUrl: data.picture
                },
            });
        }

         const token = jwt.sign(
            {
                userId: customer.id,
                name: customer.name,
            },
            JWT_PASSWORD,
        );
        res.redirect(`http://localhost:3000/auth?token=${token}`);
        return;

    }catch(err){
        console.error("Error with signin in with google",err);
        res.status(400).json({
            message: "Internal server error",
            error: err,
          });
          res.redirect(`http://localhost:3000/auth`);
          return;
    }
})
  
  