"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.carRouter = void 0;
const express_1 = require("express");
const types_1 = require("../../types");
const middleware_1 = require("../../middleware");
const folder_1 = require("./folder");
const src_1 = __importDefault(require("../../store/src"));
const delete_1 = require("./delete");
const customer_1 = require("./customer");
exports.carRouter = (0, express_1.Router)();
function calculateEarnings(bookings) {
    const now = new Date();
    const oneMonthBefore = new Date(now);
    const sixMonthsBefore = new Date(now);
    oneMonthBefore.setMonth(now.getMonth() - 1);
    sixMonthsBefore.setMonth(now.getMonth() - 6);
    let [thisMonth, oneMonth, sixMonths] = [0, 0, 0];
    for (const { startDate, totalEarnings, status } of bookings) {
        if (totalEarnings === null)
            continue;
        if (status.toLocaleLowerCase() === "cancelled")
            continue;
        const date = new Date(startDate);
        if (date >= sixMonthsBefore) {
            sixMonths += totalEarnings;
            if (date >= oneMonthBefore) {
                oneMonth += totalEarnings;
                if (date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()) {
                    thisMonth += totalEarnings;
                }
            }
        }
    }
    return { thisMonth, oneMonth, sixMonths };
}
function calculateTotalEarnings(earnings) {
    let totalEarnings = 0;
    for (const earning of earnings) {
        if (earning) {
            totalEarnings += earning;
        }
    }
    return totalEarnings;
}
exports.carRouter.post("/", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CarsSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const car = yield src_1.default.car.create({
            data: {
                brand: parsedData.data.brand,
                model: parsedData.data.model,
                plateNumber: parsedData.data.plateNumber,
                colorOfBooking: parsedData.data.color,
                price: parsedData.data.price,
                mileage: parsedData.data.mileage,
                imageUrl: parsedData.data.imageUrl,
                carFolderId: parsedData.data.carFolderId,
                userId: req.userId,
                seats: parsedData.data.seats,
                fuel: parsedData.data.fuel
            },
        });
        res.json({
            message: "Car created successfully",
            carId: car.id,
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const cars = yield src_1.default.car.findMany({
            include: {
                bookings: true,
                photos: true
            },
        });
        let formatedCars = cars.map((car) => {
            const ongoingBooking = car.bookings.filter((booking) => {
                return booking.status.toLowerCase() === "ongoing";
            });
            const upcomingBooking = car.bookings.filter((booking) => {
                return booking.status.toLowerCase() === "upcoming";
            });
            return {
                id: car.id,
                brand: car.brand,
                model: car.model,
                plateNumber: car.plateNumber,
                imageUrl: car.imageUrl,
                colorOfBooking: car.colorOfBooking,
                price: car.price,
                seats: car.seats,
                ongoingBooking: ongoingBooking.length,
                upcomingBooking: upcomingBooking.length,
                photos: car.photos.map(photo => photo.url),
                status: car.status
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
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
            include: {
                bookings: {
                    include: {
                        customer: true,
                    },
                },
                favoriteCars: true,
                photos: true
            },
        });
        if (!car) {
            res.status(404).json({ message: "Car not found" });
            return;
        }
        const formatedCars = Object.assign(Object.assign({}, car), { photos: car.photos.map(photo => photo.url), bookings: car.bookings.map((booking) => {
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
            }) });
        res.json({
            message: "Car fetched successfully",
            car: formatedCars,
            isAdmin: req.userId === car.userId
        });
        return;
    }
    catch (e) {
        console.error("Erros:", e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/earnings/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const car = yield src_1.default.car.findFirst({
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
    }
    catch (e) {
        console.log(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/thismonth/earnings/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cars = yield src_1.default.car.findMany({
            include: {
                bookings: true,
            },
        });
        if (cars.length === 0) {
            res.status(404).json({ message: "No Cars found" });
            return;
        }
        let carData = [];
        cars.forEach((car) => {
            const earnings = calculateEarnings(car.bookings);
            if (earnings.thisMonth === 0)
                return;
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
    }
    catch (e) {
        console.log(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/availability/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.FilterCarsSchema.safeParse(req.query);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        if (parsedData.data.user === "customer") {
            const user = yield src_1.default.customer.findFirst({
                where: {
                    id: req.userId,
                }
            });
            if (!user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
        }
        else {
            const user = yield src_1.default.user.findFirst({
                where: {
                    id: req.userId,
                }
            });
            if (!user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
        }
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.id),
                status: "active"
            },
            include: {
                bookings: true
            }
        });
        if (!car) {
            res.status(400).json({ message: "Invalid car id" });
            return;
        }
        const isAvailable = (0, customer_1.isCarAvailable)(car, (0, customer_1.combiningDateTime)(parsedData.data.startDate, parsedData.data.startTime), (0, customer_1.combiningDateTime)(parsedData.data.endDate, parsedData.data.endTime));
        res.json({
            message: "Car availablity fetched successfully",
            isAvailable
        });
        return;
    }
    catch (err) {
        console.error(err);
        res.json({ message: "Internal server error",
            error: err
        });
        return;
    }
}));
exports.carRouter.get("/paused/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cars = yield src_1.default.car.findMany({
            include: {
                photos: true
            },
            where: {
                status: "pause"
            }
        });
        const formatedCars = cars.map((car) => {
            return {
                id: car.id,
                brand: car.brand,
                model: car.model,
                plateNumber: car.plateNumber,
                colorOfBooking: car.colorOfBooking,
                photos: car.photos.map(photo => photo.url),
                status: car.status
            };
        });
        res.json({
            message: "Cars fetched successfully",
            cars: formatedCars,
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.put("/:id/action", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CarsActionSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!car) {
            res.status(404).json({ message: "Car not found" });
            return;
        }
        if (car.userId !== req.userId && req.userId !== 1) {
            res.status(403).json({ message: "You are not authorized to perform this operation" });
            return;
        }
        yield src_1.default.car.update({
            data: {
                status: parsedData.data.action
            },
            where: {
                id: parseInt(req.params.id),
            },
        });
        res.json({
            message: "Car updated successfully",
            CarId: car.id,
        });
        return;
    }
    catch (e) {
        console.error("Erros:", e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.put("/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CarsUpdateSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!car) {
            res.status(404).json({ message: "Car not found" });
            return;
        }
        if (car.userId !== req.userId && req.userId !== 1) {
            res.status(403).json({ message: "You are not authorized to perform this operation" });
            return;
        }
        yield src_1.default.car.update({
            data: {
                colorOfBooking: parsedData.data.color,
                price: parsedData.data.price,
                mileage: parsedData.data.mileage,
                seats: parsedData.data.seats,
                fuel: parsedData.data.fuel,
                gear: parsedData.data.gear
            },
            where: {
                id: parseInt(req.params.id),
            },
        });
        res.json({
            message: "Car updated successfully",
            CarId: car.id,
        });
        return;
    }
    catch (e) {
        console.error("Erros:", e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.delete("/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.userId,
            },
            include: {
                photos: true,
                favoriteCars: true,
            },
        });
        if (!car) {
            res.status(404).json({ message: "Car not found" });
            return;
        }
        for (const photo of car.photos) {
            yield src_1.default.photos.delete({
                where: {
                    id: photo.id,
                },
            });
            yield (0, delete_1.deleteFile)(photo.url);
        }
        for (const favoriteCar of car.favoriteCars) {
            yield src_1.default.favoriteCar.delete({
                where: {
                    id: favoriteCar.id,
                },
            });
        }
        yield src_1.default.car.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });
        yield (0, delete_1.deleteFile)(car.imageUrl);
        yield (0, folder_1.deleteFolder)(car.carFolderId);
        res.json({
            message: "Car deleted successfully",
            CarId: car.id,
        });
        return;
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/update-earnings/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(400).json({ message: "User not found" });
            return;
        }
        const cars = yield src_1.default.car.findMany({
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
            yield src_1.default.car.update({
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
    }
    catch (e) {
        console.error("Erros:", e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.put("/update-earnings/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const car = yield src_1.default.car.findFirst({
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
        yield src_1.default.car.update({
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
    }
    catch (e) {
        console.error("Erros:", e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.get("/customer/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(400).json({ message: "User not found" });
            return;
        }
        const cars = yield src_1.default.car.findMany({
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
        const formatedCars = [];
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
            const uniqueCustomers = Array.from(filteredBookings.reduce((map, booking) => {
                map.set(booking.customer.id, booking.customer);
                return map;
            }, new Map()).values());
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
    }
    catch (e) {
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.post('/upload/photos/:carId', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CarPhotosSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const user = yield src_1.default.user.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!user) {
            res.status(400).json({ message: "User not found" });
            return;
        }
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.carId),
            },
            include: {
                photos: true
            }
        });
        if (!car) {
            res.status(404).json({ message: "Car not found" });
            return;
        }
        if (car.userId !== req.userId && req.userId !== 1) {
            res.status(403).json({ message: "You are not authorized to perform this operation" });
            return;
        }
        const photos = car.photos.map(photo => photo.url);
        yield src_1.default.photos.deleteMany({
            where: {
                carId: car.id,
            },
        });
        if (photos.length > 0) {
            yield (0, delete_1.deleteMultipleFiles)(photos);
        }
        for (const url of parsedData.data.urls) {
            const newPhoto = yield src_1.default.photos.create({
                data: {
                    url: url,
                    carId: car.id,
                },
            });
        }
        res.json({
            message: "Photo uploaded successfully",
        });
        return;
    }
    catch (e) {
        console.error("Erros:", e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.carRouter.post('/fix-image', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cars = yield src_1.default.car.findMany();
        for (const car of cars) {
            yield src_1.default.photos.create({
                data: {
                    url: car.imageUrl,
                    carId: car.id
                }
            });
        }
        res.json({ message: "Photos fixed successfully" });
        return;
    }
    catch (err) {
        console.error(err);
        res.json({ message: "Internal server error",
            error: err
        });
        return;
    }
}));
