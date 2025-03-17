import { Router } from "express";
import client from "../../store/src";
import { middleware } from "../../middleware";
import { CustomerCreateSchema, customerSignupSchema, CustomerUpdateSchema, SigninSchema } from "../../types";
import { createFolder, deleteFolder } from "./folder";
import { deleteFile, deleteMultipleFiles } from "./delete";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";

interface Document {
  id: number;
  name: string;
  url: string;
  type: string;
}

export const customerRouter = Router();

customerRouter.get("/all", middleware, async (req, res) => {
  try {
    const customers = await client.customer.findMany({
      include: {
        documents: true,
      },
    });
    res.json({
      message: "Customer fetched successfully",
      customers: customers,
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

customerRouter.post("/signup", async (req, res) => {
  // check the user
  const parsedData = customerSignupSchema.safeParse(req.body);
  if (!parsedData.success) {
    res
      .status(400)
      .json({ message: "Wrong Input type", error: parsedData.error });
    return;
  }

  try {

    const folder = await createFolder(parsedData.data.name+" "+parsedData.data.contact, "customer");
    if(!folder.success || !folder.folderId) {
      res.status(400).json({ message: "Folder creation failed", error: folder.error });
      return;
    }

    let customer = await client.customer.findFirst({
      where: {
        contact: parsedData.data.contact,
        name: parsedData.data.name
      },
    });

    if(customer) {
      res.status(400).json({ message: "Customer already exist" });
      return;
    }

    
    customer = await client.customer.create({
      data: {
        name: parsedData.data.name,
        contact: parsedData.data.contact,
        password: parsedData.data.password,
        folderId: folder.folderId,
        joiningDate: new Date().toLocaleDateString("en-US"),
      },
    });
    
    const token = jwt.sign(
      {
        userId: customer.id,
        name: customer.name,
      },
      JWT_PASSWORD,
    );

    res.json({
      message: "User created successfully",
      token,
      id: customer.id,
      name: customer.name,
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

customerRouter.get("/me", middleware, async (req, res) => {
  try {
    console.log(req.userId);
    const customer = await client.customer.findFirst({
      where: {
        id: req.userId,
      },
    });

    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json({
      message: "Customer fetched successfully",
      id: customer.id,
      name: customer.name,
      imageUrl: customer.imageUrl,
      customer
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

customerRouter.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(403).json({ message: "Wrong Input type" });
    return;
  }

  try {
    const customer = await client.customer.findFirst({
      where: {
        contact: parsedData.data.username,
        password: parsedData.data.password,
      },
    });

    if (!customer) {
      res.status(403).json({ message: "Invalid username or password" });
      return;
    }

    const token = jwt.sign(
      {
        userId: customer.id,
        name: customer.name,
      },
      JWT_PASSWORD,
    );

    res.json({
      message: "User signed in successfully",
      token,
      id: customer.id,
      name: customer.name,
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

customerRouter.post("/", middleware, async (req, res) => {
  const parsedData = CustomerCreateSchema.safeParse(req.body);
  if (!parsedData.success) {
    res
      .status(400)
      .json({ message: "Wrong Input type", error: parsedData.error });
    return;
  }
  try {
    const customer = await client.customer.findFirst({
      where: {
        name: parsedData.data.name,
        contact: parsedData.data.contact,
      },
    });

    if (customer) {
      res.status(400).json({ message: "Customer already exist" });
      return;
    }

    const newCustomer = await client.customer.create({
      data: {
        name: parsedData.data.name,
        contact: parsedData.data.contact,
        address: parsedData.data.address,
        folderId: parsedData.data.folderId,
        joiningDate: parsedData.data.joiningDate,
      },
      include: {
        documents: true,
      },
    });

    const documents: Document[] = [];
    if (parsedData.data.documents) {
      for (const document of parsedData.data.documents) {
        const doc = await client.document.create({
          data: {
            name: document.name,
            url: document.url,
            type: document.type,
            customerId: newCustomer.id,
          },
        });

        documents.push({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          type: doc.type,
        });
      }
    }

    res.json({
      message: "Customer updated successfully",
      id: newCustomer.id,
      documents,
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

customerRouter.put("/:id", middleware, async (req, res) => {
  const parsedData = CustomerUpdateSchema.safeParse(req.body);
  if (!parsedData.success) {
    res
      .status(400)
      .json({ message: "Wrong Input type", error: parsedData.error });
    return;
  }
  try {
    const customer = await client.customer.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        documents: true,
      },
    });

    if (!customer) {
      res.status(400).json({ message: "Customer not found" });
      return;
    }

    if (parsedData.data.documents) {
      for (const document of parsedData.data.documents) {
        await client.document.create({
          data: {
            name: document.name,
            url: document.url,
            type: document.type,
            customerId: customer.id,
          },
        });
      }
    }

    const updatedCustomer = await client.customer.update({
      data: {
        name: parsedData.data.name,
        contact: parsedData.data.contact,
        address: parsedData.data.address,
        folderId: parsedData.data.folderId,
        joiningDate: parsedData.data.joiningDate,
      },
      where: {
        id: customer.id,
      },
      include: {
        documents: true,
      },
    });

    const documents = updatedCustomer.documents.map((document) => {
      return {
        id: document.id,
        name: document.name,
        url: document.url,
        type: document.type,
      };
    });

    res.json({
      message: "Customer updated successfully",
      CustomerId: customer.id,
      documents: documents,
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

customerRouter.delete("/:id", middleware, async (req, res) => {
  try {
    const customer = await client.customer.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        documents: true,
        bookings: true,
      },
    });

    if (!customer) {
      res.status(400).json({ message: "Customer not found" });
      return;
    }

    if (customer.bookings.length > 0) {
      res
        .status(400)
        .json({ message: "Customer has bookings, cannot be deleted" });
      return;
    }

    await client.document.deleteMany({
      where: {
        customerId: customer.id,
      },
    });

    if (customer.documents.length > 0) {
      await deleteMultipleFiles(
        customer.documents.map((document) => document.url),
      );
    }
    await deleteFolder(customer.folderId);

    await client.customer.delete({
      where: {
        id: customer.id,
      },
    });

    res.json({
      message: "Customer deleted successfully",
      CustomerId: customer.id,
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

customerRouter.delete("/:id/documents/all", middleware, async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await client.customer.findFirst({
      where: {
        id: parseInt(id),
      },
      include: {
        documents: true,
      },
    });
    if (!customer) {
      res.status(400).json({ message: "Customer not found" });
      return;
    }
    await client.document.deleteMany({
      where: {
        customerId: parseInt(id),
      },
    });

    if (customer.documents.length > 0) {
      await deleteMultipleFiles(
        customer.documents.map((document) => document.url),
      );
    }

    res.status(200).json({
      message: "Document deleted successfully",
      BookingId: id,
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

customerRouter.delete("/document/:id", middleware, async (req, res) => {
  try {
    const document = await client.document.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (document.url) {
      await deleteFile(document.url);
    }
    res.status(200).json({
      message: "Document deleted successfully",
      BookingId: req.params.id,
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

customerRouter.put("/set-joining-date/all",middleware, async (req, res) => {
  try {
    const bookings = await client.booking.findMany({
      include: {
        customer: true,
      },
    });

    const customers = []
    for (const booking of bookings) {
      const customer = booking.customer;
      const joiningDate = new Date(customer.joiningDate);
      console.log("joiningDate.getFullYear()",joiningDate.getFullYear());
      const startDate = new Date(booking.startDate);
      console.log("startDate",startDate.toLocaleDateString("en-US"));
      if (joiningDate.getFullYear() === 2026){
        customers.push(customer);
        await client.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            joiningDate: startDate.toLocaleDateString("en-US"),
          },
        });
      }
    }

    res.json({
      message: "Customer Joining date updated successfully",
      customers
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
