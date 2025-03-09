import { Router } from "express";
import { CarsSchema, CarsUpdateSchema } from "../../types";
import { middleware } from "../../middleware";
import { deleteFolder } from "./folder";
import client from "../../store/src";
import { deleteFile } from "./delete";

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
        if (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        ) {
          thisMonth += totalEarnings;
        }
      }
    }
  }

  return { thisMonth, oneMonth, sixMonths };
}

function calculateTotalEarnings(earnings: (number|null)[]) {
  let totalEarnings = 0;
  for (const earning of earnings) {
    if (earning) {
      totalEarnings += earning;
    }
  }

  return totalEarnings;
}

carRouter.post("/", middleware, async (req, res) => {
  const parsedData = CarsSchema.safeParse(req.body);
  if (!parsedData.success) {
    res
      .status(400)
      .json({ message: "Wrong Input type", error: parsedData.error });
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
        carFolderId: parsedData.data.carFolderId,
        userId: req.userId!,
      },
    });
    res.json({
      message: "Car created successfully",
      carId: car.id,
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

carRouter.get("/all", middleware, async (req, res) => {
  try {
    const cars = await client.car.findMany({
      include: {
        bookings: true,
      },
    });

    
    let formatedCars = cars.map((car) => {
      const ongoingBooking = car.bookings.filter((booking) => {
        return  booking.status.toLowerCase() === "ongoing";
      });
      const upcomingBooking = car.bookings.filter((booking) => {
        return booking.status.toLowerCase() === "upcoming" ;
      });
      return {
        id: car.id,
        brand: car.brand,
        model: car.model,
        plateNumber: car.plateNumber,
        imageUrl: car.imageUrl,
        colorOfBooking: car.colorOfBooking,
        price: car.price,
        ongoingBooking: ongoingBooking.length,
        upcomingBooking: upcomingBooking.length,
      };
    });

    formatedCars = formatedCars.sort((a, b) => {
      const sumA = a.ongoingBooking + a.upcomingBooking;
      const sumB = b.ongoingBooking + b.upcomingBooking;
      return sumB - sumA; // Sort in descending order (highest sum first)
    });

    res.json({
      message: "Cars fetched successfully",
      cars: formatedCars,
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

carRouter.get("/:id", middleware, async (req, res) => {
  try {
    const car = await client.car.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        bookings: {
          include: {
            customer: true,
          },
        },
      },
    });
    if (!car) {
      res.status(404).json({ message: "Car not found" });
      return;
    }

    const formatedCars = {
      ...car,
      bookings: car.bookings.map((booking) => {
        return {
          id: booking.id,
          start: booking.startDate,
          end: booking.endDate,
          status: booking.status,
          startTime: booking.startTime,
          endTime: booking.endTime,
          customerName: booking.customer.name,
          customerContact: booking.customer.contact,
        };
      }),
    };
    res.json({
      message: "Car fetched successfully",
      car: formatedCars,
      isAdmin: req.userId === car.userId
    });
    return;
  } catch (e) {
    console.error("Erros:", e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

carRouter.get("/earnings/:id", middleware, async (req, res) => {
  try {
    const car = await client.car.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        bookings: true,
      },
    });

    if (!car) {
      res.status(404).json({ message: "Car not found" });
      return;
    }

    const earnings = calculateEarnings(car.bookings);

    if (!earnings) {
      res.status(400).json({ message: "Error while finding earnings" });
      return;
    }

    res.json({
      message: "Car earnings fetched successfully",
      earnings,
      total: car.totalEarnings,
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

carRouter.get("/thismonth/earnings/all", middleware, async (req, res) => {
  try {
    
    const cars = await client.car.findMany({
      include: {
        bookings: true,
      },
    });

    if (cars.length === 0) {
      res.status(404).json({ message: "No Cars found" });
      return;
    }

    let carData: CarData[] | [] = [];

    cars.forEach((car) => {
      const earnings = calculateEarnings(car.bookings);
      if (earnings.thisMonth === 0) return;
      carData = [
        ...carData,
        {
          id: car.id,
          brand: car.brand,
          model: car.model,
          plateNumber: car.plateNumber,
          colorOfBooking: car.colorOfBooking,
          thisMonth: earnings.thisMonth,
        },
      ];
    });

    if (!carData.length) {
      res.status(400).json({ message: "No earnings yet" });
      return;
    }

    res.json({
      message: "Car earnings fetched successfully",
      earnings: carData,
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

carRouter.put("/:id", middleware, async (req, res) => {
  const parsedData = CarsUpdateSchema.safeParse(req.body);
  if (!parsedData.success) {
    res
      .status(400)
      .json({ message: "Wrong Input type", error: parsedData.error });
    return;
  }
  try {
    const car = await client.car.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId!,
      },
    });

    if (!car) {
      res.status(404).json({ message: "Car not found" });
      return;
    }

    await client.car.update({
      data: {
        colorOfBooking: parsedData.data.color,
        price: parsedData.data.price,
        mileage: parsedData.data.mileage,
        imageUrl: parsedData.data.imageUrl,
      },
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (parsedData.data.imageUrl && car.imageUrl) {
      await deleteFile(car.imageUrl);
    }

    res.json({
      message: "Car updated successfully",
      CarId: car.id,
    });
    return;
  } catch (e) {
    console.error("Erros:", e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

carRouter.delete("/:id", middleware, async (req, res) => {
  try {
    const car = await client.car.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId!,
      },
    });

    if (!car) {
      res.status(404).json({ message: "Car not found" });
      return;
    }

    await client.car.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });

    await deleteFile(car.imageUrl);

    await deleteFolder(car.carFolderId);

    res.json({
      message: "Car deleted successfully",
      CarId: car.id,
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
carRouter.get("/update-earnings/all", middleware, async (req, res) => {
  try {

    const user = await client.user.findFirst({
      where: {
        id: req.userId,
      },
    });
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const cars = await client.car.findMany({
      include: {
        bookings: true,
      },
    });

    if (!cars) {
      res.status(404).json({ message: "No Cars found" }); 
      return;
    }

    for (const car of cars) {
      const totalEarnings = calculateTotalEarnings(car.bookings.map((booking) => booking.totalEarnings));

      await client.car.update({
        data: {
          totalEarnings: totalEarnings,
        },
        where: {
          id: car.id,
        },
      });
    }
    res.json({
      message: "Car earnings updated successfully",
    });
    return;
  } catch (e) {
    console.error("Erros:", e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});
  

carRouter.put("/update-earnings/:id", middleware, async (req, res) => {
  try {
    const car = await client.car.findFirst({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        bookings: true,
      },
    });

    if (!car) {
      res.status(404).json({ message: "Car not found" });
      return;
    }

    const totalEarnings = calculateTotalEarnings(car.bookings.map((booking) => booking.totalEarnings));

    await client.car.update({
      data: {
        totalEarnings: totalEarnings,
      },
      where: {
        id: parseInt(req.params.id),
      },
    });
    res.json({
      message: "Car earnings updated successfully",
      CarId: car.id,
    });
    return;
  } catch (e) {
    console.error("Erros:", e);
    res.status(400).json({
      message: "Internal server error",
      error: e,
    });
    return;
  }
});

carRouter.get("/customer/all", middleware, async (req, res) => {  
  try {

    const user = await client.user.findFirst({
      where: {
        id: req.userId,
      },
    });
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }
  
    const cars = await client.car.findMany({
      include: {
        bookings: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!cars) {
      res.status(400).json({ message: "Car not found" });
      return;
    }

    const formatedCars = []

    for (const car of cars) {
      let count = 0;
      // Get the current date
      const currentDate = new Date();

      // Find the start of the first month (two months ago from current)
      const startOfMonthThree = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
      
      // Filter bookings
      const filteredBookings = car.bookings.filter(booking => {
        const bookingDate = new Date(booking.startDate);
        return bookingDate >= startOfMonthThree && bookingDate <= currentDate;
      });
      
      const uniqueCustomers = Array.from(
        filteredBookings.reduce((map, booking) => {
          map.set(booking.customer.id, booking.customer);
          return map;
        }, new Map()).values()
      );

      formatedCars.push({
        id: car.id,
        brand: car.brand,
        model: car.model,
        plateNumber: car.plateNumber,
        imageUrl: car.imageUrl,
        totalCustomers: filteredBookings.length,
        uniqueCustomers: uniqueCustomers.length,
      });
    }

    formatedCars.sort((a, b) => b.totalCustomers - a.totalCustomers);
    
    res.json({
      message: "Customer fetched successfully",
      cars: formatedCars,
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

