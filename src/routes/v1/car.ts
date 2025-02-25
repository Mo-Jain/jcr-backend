import {  Router } from "express";
import { CarsSchema, CarsUpdateSchema } from "../../types";
import { middleware } from "../../middleware";
import { deleteFolder } from "./folder";
import client from "../../store";

export const carRouter = Router();

interface Booking {
    startDate: string;
    totalEarnings: number | null;
  }

interface CarData {
    id: number;
    brand: string;
    model: string;
    plateNumber: string;
    colorOfBooking: string;
    thisMonth: number;
}
  
function calculateEarnings(bookings: Booking[]) {
    const now = new Date();
    const oneMonthBefore = new Date(now);
    const sixMonthsBefore = new Date(now);
    oneMonthBefore.setMonth(now.getMonth() - 1);
    sixMonthsBefore.setMonth(now.getMonth() - 6);
  
    let [thisMonth, oneMonth, sixMonths] = [0, 0, 0];
  
    for (const { startDate, totalEarnings } of bookings) {
      if (totalEarnings === null) continue;
  
      const date = new Date(startDate);
      if (date >= sixMonthsBefore) {
        sixMonths += totalEarnings;
        if (date >= oneMonthBefore) {
          oneMonth += totalEarnings;
          if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
            thisMonth += totalEarnings;
          }
        }
      }
    }
  
    return { thisMonth, oneMonth, sixMonths };
  }
  

carRouter.post("/",middleware,async (req,res) => {
    const parsedData = CarsSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({message: "Wrong Input type"})
        return;
    }
    try {
        const car = await client.car.create({
            data: {
                brand: parsedData.data.brand,
                model: parsedData.data.model,
                plateNumber: parsedData.data.plateNumber,
                colorOfBooking: parsedData.data.color,
                price: parsedData.data.price,
                mileage: parsedData.data.mileage,
                imageUrl: parsedData.data.imageUrl,
                carFolderId:parsedData.data.carFolderId,
                userId: req.userId!
            }
        })
        res.json({
            message:"Car created successfully",
            carId:car.id
        })
        return
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
        return;        
    }
})

carRouter.get("/all",middleware,async (req,res) => {
    try {
        const cars = await client.car.findMany({
            where: {
                userId: req.userId!
            }
        });
        const formatedCars = cars.map(car => {
            return {
                id:car.id,
                brand:car.brand,
                model:car.model,
                plateNumber:car.plateNumber,
                imageUrl:car.imageUrl,
                colorOfBooking:car.colorOfBooking,
                price:car.price
            }
        })
        res.json({
            message:"Cars fetched successfully",
            cars:formatedCars
        })
        return;
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
        return;
    }
})

carRouter.get("/:id",middleware,async (req,res) => {
    try {
        const car = await client.car.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.userId!
            },
            include:{
                bookings:{
                    include:{
                        customer:true
                    }
                }  
            }
        })
        if(!car) {
            res.status(404).json({message: "Car not found"});
            return
        }

        const formatedCars = {
            ...car,
            bookings:car.bookings.map(booking => {
                return {
                    id:booking.id,
                    start:booking.startDate,
                    end:booking.endDate,
                    status:booking.status,
                    customerName:booking.customer.name,
                    customerContact:booking.customer.contact,
                }
            })
        }
        res.json({
            message:"Car fetched successfully",
            car:formatedCars
        })
        return;
    } catch(e) {
        console.error("Erros:",e)
        res.status(400).json({message: "Internal server error"});
        return;
    }
})

carRouter.get("/earnings/:id",middleware, async(req,res) => {
    try {
        const car = await client.car.findFirst({
            where: {
                id:parseInt(req.params.id),
                userId: req.userId!
            },
            include: {
                bookings:true
            }
        }) 

        if(!car){
            res.status(404).json({message:"Car not found"});
            return;
        }

        const earnings = calculateEarnings(car.bookings);

        if(!earnings){
            res.status(400).json({message:"Error while finding earnings"})
            return;
        }

        res.json({
            message:"Car earnings fetched successfully",
            earnings,
            total:car.totalEarnings
        })
        return;
    }
    catch (e) {
        console.log(e);
        res.status(400).json({message: "Internal server error"})
        return;
    }
})

carRouter.get("/thismonth/earnings/all",middleware,async (req,res) => {
    try {
        const cars = await client.car.findMany({
            where: {
                userId: req.userId!
            },
            include:{
                bookings:true
            }
        });

        if(cars.length === 0){
            res.status(404).json({message:"No Cars found"});
            return;
        }

        let carData:CarData[] | [] = [];

        cars.forEach(car => {
            const earnings = calculateEarnings(car.bookings);
            if(earnings.thisMonth === 0) return;
            carData= [...carData,{
                id:car.id,
                brand:car.brand,
                model:car.model,
                plateNumber:car.plateNumber,
                colorOfBooking:car.colorOfBooking,
                thisMonth:earnings.thisMonth
            }]
        })

        if(!carData.length){
            res.status(400).json({message:"No earnings yet"});
            return;
        }

        res.json({
            message:"Car earnings fetched successfully",
            earnings:carData
        })
        return;
    }
    catch (e) {
        console.log(e);
        res.status(400).json({message: "Internal server error"})
        return;
    }
})

carRouter.put("/:id",middleware,async (req,res) => {
    const parsedData = CarsUpdateSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({message: "Wrong Input type"})
        return
    }
    try {
        const car = await client.car.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.userId!
            }
        })

        if(!car) {
            res.status(404).json({message: "Car not found"})
            return
        }

        await client.car.update({
            data: {
                colorOfBooking: parsedData.data.color,
                price: parsedData.data.price,
                mileage: parsedData.data.mileage,
                imageUrl: parsedData.data.imageUrl
            },
            where: {
                id: parseInt(req.params.id)
            }
        })

        res.json({
            message:"Car updated successfully",
            CarId:car.id
        })
        return;
    } catch(e) {
        console.error("Erros:",e)
        res.status(400).json({message: "Internal server error"})
        return;
    }
})

carRouter.delete("/:id",middleware,async (req,res) => {
    try {
        const car = await client.car.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.userId!
            }
        })

        if(!car) {
            res.status(404).json({message: "Car not found"})
            return
        }

        await client.car.delete({
            where: {
                id: parseInt(req.params.id)
            }
        })

        await deleteFolder(car.carFolderId);

        res.json({
            message:"Car deleted successfully",
            CarId:car.id
        })
        return;
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
        return;
    }
});
