import { Router } from "express";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";
import { SigninSchema, SignupSchema, UpdateUserSchema } from "../../types";
import { middleware } from "../../middleware";
import { carRouter } from "./car";
import { bookingRouter } from "./booking";
import { calendarRouter } from "./calendar";
import { customerRouter } from "./customer";
import client from "../../store";

export const router = Router();

router.post("/signup/se23crt1", async (req, res) => {
    // check the user
    const parsedData = SignupSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({message: "Wrong Input type"})
        return
    }

    try {
        
        const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: parsedData.data.password,
                name: parsedData.data.name,
            }
        })
        const token = jwt.sign({
            userId: user.id,
            name: user.name,
        }, JWT_PASSWORD);

        res.json({
            message:"User created successfully",
            token,
            name:user.name,
        })
        return;
    } catch(e) {
        console.error(e);
        res.status(400).json({message: "User already exists"})
        return;
    }
})

router.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(403).json({message: "Wrong Input type"})
        return
    }

    try {
        const user = await client.user.findFirst({
            where: {
                username: parsedData.data.username,
                password: parsedData.data.password
            }
        })
        
        if (!user) {
            res.status(403).json({message: "Invalid username or password"})
            return
        }

        const token = jwt.sign({
            userId: user.id,
            name: user.name,
        }, JWT_PASSWORD);

        res.json({
            message:"User signed in successfully",
            token,
            name:user.name,
        })
        return
    } catch(e) {
        console.log(e);
        res.status(400).json({message: "Internal server error"})
        return
    }
})

router.get("/me", middleware,async (req, res) => {
    try {
        const user = await client.user.findFirst({
            where: {
                id: req.userId
            }
        })

        if (!user) {
            res.status(404).json({message: "User not found"})
            return
        }
        res.json({
            message:"User fetched successfully",
            user
        })
        return
    } catch(e) {
        console.log(e);
        res.status(400).json({message: "Internal server error"})
        return
    }
})

router.get("/me/name", middleware,async (req, res) => {
    try {
  
        const user = await client.user.findFirst({
            where: {
                id: req.userId
            }
        })
        if (!user) {
            res.status(404).json({message: "User not found"})
            return
        }
        res.json({
            message:"User fetched successfully",
            name:user.name,
            imageUrl:user.imageUrl
        })
        return
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
        return
    }
})

router.put("/me", middleware,async (req, res) => {
    const parsedData = UpdateUserSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(403).json({message: "Wrong Input type"})
        return
    }
    try {

        await client.user.update({
                        where: {
                            id: req.userId
                        },
                        data: {
                            ...parsedData.data,
                        },
                    })
        res.json({
            message:"User data updated successfully",
        })
        return
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
        return
    }
})


router.use("/car",carRouter)
router.use("/booking",bookingRouter)
router.use("/calendar",calendarRouter)
router.use("/customer",customerRouter)




