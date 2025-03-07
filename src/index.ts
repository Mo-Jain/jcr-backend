import express from "express";
import { router } from "./routes/v1";
import cors from "cors";
const app = express();
import dotenv from "dotenv";
const port = process.env.PORT || 3001;

// Load environment variables
dotenv.config();

app.use(cors());
app.use(express.json());

app.use("/api/v1", router);

app.listen(port, () => console.log("Server running on port", port));
