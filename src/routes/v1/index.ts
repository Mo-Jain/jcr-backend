import { Router } from "express";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";
import { SigninSchema, SignupSchema, UpdateUserSchema } from "../../types";
import { middleware } from "../../middleware";
import { carRouter } from "./car";
import { bookingRouter } from "./booking";
import { calendarRouter } from "./calendar";
import { customerRouter } from "./customer";
import { bunnyRouter } from "./bunny";
import client from "../../store/src";
import { deleteFile } from "./delete";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const router = Router();

router.post("/signup/se23crt1", async (req, res) => {
  // check the user
  const parsedData = SignupSchema.safeParse(req.body);
  if (!parsedData.success) {
    res
      .status(400)
      .json({ message: "Wrong Input type", error: parsedData.error });
    return;
  }

  try {
    const user = await client.user.create({
      data: {
        username: parsedData.data.username,
        password: parsedData.data.password,
        name: parsedData.data.name,
        profileFolderId: process.env.PROFILE_FOLDER_ID,
        imageUrl: parsedData.data.imageUrl,
      },
    });
    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name,
      },
      JWT_PASSWORD,
    );

    res.json({
      message: "User created successfully",
      token,
      name: user.name,
      id: user.id,
    });
    return;
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

router.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(403).json({ message: "Wrong Input type" });
    return;
  }

  try {
    const user = await client.user.findFirst({
      where: {
        username: parsedData.data.username,
        password: parsedData.data.password,
      },
    });

    if (!user) {
      res.status(403).json({ message: "Invalid username or password" });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name,
      },
      JWT_PASSWORD,
    );

    res.json({
      message: "User signed in successfully",
      token,
      name: user.name,
    });
    return;
  } catch (e) {
    console.log(e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});
router.get("/users", async (req, res) => {
  try{
    const users = await client.user.findMany();
    res.json({
      message:"Users fetched successfully",
      users : users.map(user => user.username)
    })
  }catch(e){
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
  }
})

router.get("/users/all",middleware, async (req, res) => {
  try{
    if(req.userId !== 1) {
      res.status(403).json({ message: "You are not authorized to perform this operation" });
      return
    }
    const users = await client.user.findMany();
    res.json({
      message:"Users fetched successfully",
      users 
    })
  }catch(e){
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
  }
})

router.get("/me", middleware, async (req, res) => {
  try {
    const user = await client.user.findFirst({
      where: {
        id: req.userId,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      message: "User fetched successfully",
      id: user.id,
      name: user.name,
      imageUrl: user.imageUrl,
      user
    });
    return;
  } catch (e) {
    console.log(e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

router.get("/me/name", middleware, async (req, res) => {
  try {
    const user = await client.user.findFirst({
      where: {
        id: req.userId,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      message: "User fetched successfully",
      name: user.name,
      imageUrl: user.imageUrl,
    });
    return;
  } catch (e) {
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

router.put("/me", middleware, async (req, res) => {
  const parsedData = UpdateUserSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(403).json({ message: "Wrong Input type" });
    return;
  }
  try {
    const user = await client.user.findFirst({
      where: {
        id: req.userId,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await client.user.update({
      where: {
        id: req.userId,
      },
      data: {
        ...parsedData.data,
      },
    });

    if (parsedData.data.imageUrl && user.imageUrl) {
      await deleteFile(user.imageUrl);
    }

    res.json({
      message: "User data updated successfully",
    });
    return;
  } catch (e) {
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

router.put("/user/:id", middleware, async (req, res) => {
    const parsedData = UpdateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
      res.status(403).json({ message: "Wrong Input type" });
      return;
    }
    try {
      if(req.userId !== 1) {
        res.status(403).json({ message: "You are not authorized to perform this operation" });
        return
      }

      const user = await client.user.findFirst({
        where: {
          id: parseInt(req.params.id),
        },
      });
      
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      await client.user.update({
        where: {
          id: parseInt(req.params.id),
        },
        data: {
          ...parsedData.data,
        },
      });

      if (parsedData.data.imageUrl && user.imageUrl) {
        await deleteFile(user.imageUrl);
      }
      res.json({
        message: "User data updated successfully",
      });
      return;
    } catch (e) {
      res.status(400).json({
        message: "Internal server error",
        error: e,
      });
      return;
    }
  });

router.delete("/user/:id", middleware, async (req, res) => {
    try {
      if(req.userId !== 1) {
        res.status(403).json({ message: "You are not authorized to perform this operation" });
        return
      }
      const user = await client.user.findFirst({
        where: {
          id: parseInt(req.params.id),
        },
      });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      await client.user.delete({
        where: {
          id: parseInt(req.params.id),
        },
      });
      res.json({
        message: "User deleted successfully",
      });
      return;
    } catch (e) {
      res.status(400).json({
        message: "Internal server error",
        error: e,
      });
      return;
    }
  });



router.use("/car", carRouter);
router.use("/booking", bookingRouter);
router.use("/calendar", calendarRouter);
router.use("/customer", customerRouter);
router.use('/bunny', bunnyRouter);
