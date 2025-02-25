import {  Router } from "express";
import client from "../../store/src";
import { middleware } from "../../middleware";
import { CustomerCreateSchema, CustomerUpdateSchema } from "../../types";
import { deleteFolder } from "./folder";

export const customerRouter = Router();

customerRouter.get("/all",middleware,async (req,res) => {
    try {
        const customers = await client.customer.findMany({
            include:{
                documents:true
            }
        });
        res.json({
            message:"Customer fetched successfully",
            customers:customers
        })
        return
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
        return
    }
})

customerRouter.post("/", middleware,async (req,res) => {
    const parsedData = CustomerCreateSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({message: "Wrong Input type"})
        return
    }
    try {
        const customer = await client.customer.findFirst({
            where: {
                name: parsedData.data.name,
                contact: parsedData.data.contact
            }
        })

        if(customer) {
            res.status(400).json({message: "Customer already exist"})
            return
        }

        

        const newCustomer = await client.customer.create({
                                    data: {
                                        name: parsedData.data.name,
                                        contact: parsedData.data.contact,
                                        address: parsedData.data.address,
                                        folderId: parsedData.data.folderId,
                                    },
                                    include:{
                                        documents:true
                                    }
                                })

        if(parsedData.data.documents){  
            for (const document of parsedData.data.documents) {
                await client.documents.create({
                    data: {
                        name: document.name,
                        url: document.url,
                        type: document.type,
                        customerId: newCustomer.id
                    }
                })
            }
        }

       

        res.json({
            message:"Customer updated successfully",
            id:newCustomer.id,
            documents:newCustomer.documents
        })
        return;
    } catch(e) {
        console.error(e);

        res.status(400).json({message: "Internal server error"})
        return;
    }
})

customerRouter.put("/:id", middleware,async (req,res) => {
    const parsedData = CustomerUpdateSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({message: "Wrong Input type"})
        return
    }
    try {
        const customer = await client.customer.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
            include:{
                documents:true
            }
        })

        if(!customer) {
            res.status(400).json({message: "Customer not found"})
            return
        }

        

        if(parsedData.data.documents){ 
            
            for (const document of parsedData.data.documents) {
                await client.documents.create({
                    data: {
                        name: document.name,
                        url: document.url,
                        type: document.type,
                        customerId: customer.id
                    }
                })
            }
        }

        const updatedCustomer = await client.customer.update({
                                    data: {
                                        name: parsedData.data.name,
                                        contact: parsedData.data.contact,
                                        address: parsedData.data.address,
                                        folderId: parsedData.data.folderId,
                                    },
                                    where: {
                                        id: customer.id
                                    },
                                    include:{
                                        documents:true
                                    }
                                })

       

        res.json({
            message:"Customer updated successfully",
            CustomerId:customer.id,
            documents:updatedCustomer.documents
        })
        return;
    } catch(e) {
        console.error(e);

        res.status(400).json({message: "Internal server error"})
        return;
    }
})

customerRouter.delete("/:id",middleware,async (req,res) => {
    try {
        const customer = await client.customer.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
            include:{
                documents:true
            }
        })

        if(!customer) {
            res.status(400).json({message: "Customer not found"})
            return
        }

        await client.documents.deleteMany({
            where:{
                customerId:customer.id
            }
        })

        await client.customer.delete({
            where: {
                id: customer.id
            }
        })

        await deleteFolder(customer.folderId);
        

        res.json({
            message:"Customer deleted successfully",
            CustomerId:customer.id
        })
        return;
    } catch(e) {
        console.error(e);

        res.status(400).json({message: "Internal server error"})
        return;
    }
})

customerRouter.delete('/:id/documents/all',middleware, async (req, res) => {
    const {id} = req.params;
    try {
        await client.documents.deleteMany({
            where:{
                customerId:parseInt(id),
            }
        })
        res.status(200).json({
            message:"Document deleted successfully",
            BookingId:id
        })
        return;
    } catch(e) {
        console.error(e);

        res.status(400).json({message: "Internal server error"})
        return;
    }
})

customerRouter.delete('/document/:id',middleware, async (req, res) => {
    try {
        await client.documents.delete({
            where:{
                id: parseInt(req.params.id),
            }
        })
        res.status(200).json({
            message:"Document deleted successfully",
            BookingId:req.params.id
        })
        return;
    } catch(e) {
        console.error(e);

        res.status(400).json({message: "Internal server error"})
        return;
    }
})