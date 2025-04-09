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
exports.customerRouter = void 0;
exports.combiningDateTime = combiningDateTime;
exports.isCarAvailable = isCarAvailable;
const express_1 = require("express");
const src_1 = __importDefault(require("../../store/src"));
const middleware_1 = require("../../middleware");
const types_1 = require("../../types");
const folder_1 = require("./folder");
const delete_1 = require("./delete");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const booking_1 = require("./booking");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
exports.customerRouter = (0, express_1.Router)();
const getUserInfo = (access_token) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    const data = yield response.json();
    console.log("data", data);
    return data;
});
function combiningDateTime(date, time) {
    const dateTime = new Date(date);
    const [hour, minute, second] = time.split(":").map(Number);
    return dateTime.setHours(hour, minute, 0, 0);
}
function isCarAvailable(car, searchStart, searchEnd) {
    const newSearchStart = new Date(searchStart);
    const newSearchEnd = new Date(searchEnd);
    const bookings = car.bookings.filter((booking) => {
        if (booking.status.toLowerCase() === "completed" || booking.status.toLowerCase() === "cancelled")
            return false;
        const bookingStart = new Date(combiningDateTime(booking.startDate, booking.startTime));
        const bookingEnd = new Date(combiningDateTime(booking.endDate, booking.endTime));
        if (newSearchStart >= bookingStart && newSearchStart <= bookingEnd)
            return true;
        if (newSearchEnd >= bookingStart && newSearchEnd <= bookingEnd)
            return true;
        if (bookingStart >= newSearchStart && bookingStart <= newSearchEnd)
            return true;
        if (bookingEnd >= newSearchStart && bookingEnd <= newSearchEnd)
            return true;
        return false;
    });
    return bookings.length === 0;
}
exports.customerRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // check the user
    const parsedData = types_1.customerSignupSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const folder = yield (0, folder_1.createFolder)(parsedData.data.name + " " + parsedData.data.contact, "customer");
        if (!folder.success || !folder.folderId) {
            res.status(400).json({ message: "Folder creation failed", error: folder.error });
            return;
        }
        let customer = yield src_1.default.customer.findFirst({
            where: {
                contact: parsedData.data.contact,
                name: parsedData.data.name
            },
        });
        if (customer) {
            res.status(400).json({ message: "Customer already exist" });
            return;
        }
        customer = yield src_1.default.customer.create({
            data: {
                name: parsedData.data.name,
                contact: parsedData.data.contact,
                password: parsedData.data.password,
                folderId: folder.folderId,
                joiningDate: (0, booking_1.formatDate)(new Date()),
                email: parsedData.data.email
            },
        });
        const token = jsonwebtoken_1.default.sign({
            userId: customer.id,
            name: customer.name,
        }, config_1.JWT_PASSWORD);
        res.json({
            message: "User created successfully",
            token,
            id: customer.id,
            name: customer.name,
            customer
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(403).json({ message: "Wrong Input type" });
        console.log("error", parsedData.error);
        return;
    }
    try {
        let customer;
        if (parsedData.data.provider === "google") {
            customer = yield src_1.default.customer.findFirst({
                where: {
                    email: parsedData.data.username,
                },
            });
            if (!customer) {
                const folder = yield (0, folder_1.createFolder)(parsedData.data.name + " " + parsedData.data.username.split("@")[0], "customer");
                if (!folder.success || !folder.folderId) {
                    res.status(400).json({ message: "Folder creation failed", error: folder.error });
                    return;
                }
                customer = yield src_1.default.customer.create({
                    data: {
                        name: parsedData.data.name || "",
                        email: parsedData.data.username,
                        password: parsedData.data.password,
                        imageUrl: parsedData.data.imageUrl,
                        joiningDate: (0, booking_1.formatDate)(new Date()),
                        provider: parsedData.data.provider,
                        folderId: folder.folderId,
                    },
                });
            }
        }
        else {
            if (parsedData.data.username.includes("@")) {
                customer = yield src_1.default.customer.findFirst({
                    where: {
                        email: parsedData.data.username,
                    },
                });
            }
            else {
                customer = yield src_1.default.customer.findFirst({
                    where: {
                        contact: parsedData.data.username,
                    },
                });
            }
            if (!customer) {
                res.status(403).json({ message: "Invalid username" });
                return;
            }
            if (!customer.password || customer.password === "") {
                yield src_1.default.customer.update({
                    where: {
                        id: customer.id
                    },
                    data: {
                        password: parsedData.data.password
                    }
                });
            }
            else {
                if (customer.password !== parsedData.data.password) {
                    res.status(403).json({ message: "Invalid password" });
                    return;
                }
            }
        }
        const token = jsonwebtoken_1.default.sign({
            userId: customer.id,
            name: customer.name,
        }, config_1.JWT_PASSWORD);
        res.status(200).json({
            message: "User signed in successfully",
            token,
            id: customer.id,
            name: customer.name,
            image: customer.imageUrl,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.post("/checkMail", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = req.body.username;
        if (!username || typeof username !== "string") {
            res.status(400).json({ message: "Invalid username" });
            return;
        }
        let customer;
        if (username.includes("@")) {
            customer = yield src_1.default.customer.findFirst({
                where: {
                    email: username,
                },
            });
        }
        else {
            customer = yield src_1.default.customer.findFirst({
                where: {
                    contact: username,
                },
            });
        }
        if (!customer) {
            res.status(403).json({ message: "Invalid username" });
            return;
        }
        let isPassword;
        if (customer.provider === "google") {
            isPassword = customer.password && customer.password != "" ? true : false;
        }
        else {
            isPassword = true;
        }
        res.status(200).json({
            message: "Username is correct",
            isPassword,
            customer
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.post("/", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerCreateSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                name: parsedData.data.name,
                contact: parsedData.data.contact,
            },
        });
        if (customer) {
            res.status(400).json({ message: "Customer already exist" });
            return;
        }
        const newCustomer = yield src_1.default.customer.create({
            data: {
                name: parsedData.data.name,
                contact: parsedData.data.contact,
                address: parsedData.data.address,
                folderId: parsedData.data.folderId,
                email: parsedData.data.email,
                joiningDate: (0, booking_1.formatDate)(parsedData.data.joiningDate),
                kycStatus: parsedData.data.address && parsedData.data.documents ? "verified" : "pending"
            },
            include: {
                documents: true,
            },
        });
        const documents = [];
        if (parsedData.data.documents) {
            for (const document of parsedData.data.documents) {
                const doc = yield src_1.default.document.create({
                    data: {
                        name: document.name,
                        url: document.url,
                        type: document.type,
                        customerId: newCustomer.id,
                        docType: document.docType || "others"
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
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.post("/booking", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerBookingSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parsedData.data.carId,
            },
            include: {
                bookings: true
            }
        });
        if (!car || car.status === "pause") {
            res.status(400).json({ message: "Invalid car id" });
            return;
        }
        const newBookingId = yield (0, booking_1.generateBookingId)();
        const currDate = new Date();
        const unixTimeStamp = Math.floor(currDate.getTime() / 1000);
        const folder = yield (0, folder_1.createFolder)(newBookingId + " " + unixTimeStamp, "booking");
        if (!folder.folderId || folder.error) {
            res.status(400).json({
                message: "Failed to create folder",
                error: folder.error,
            });
            return;
        }
        const booking = yield src_1.default.booking.create({
            data: {
                id: newBookingId,
                startDate: (0, booking_1.formatDate)(parsedData.data.startDate),
                endDate: (0, booking_1.formatDate)(parsedData.data.endDate),
                startTime: parsedData.data.startTime,
                endTime: parsedData.data.endTime,
                allDay: parsedData.data.allDay,
                carId: parsedData.data.carId,
                dailyRentalPrice: car.price,
                totalEarnings: parsedData.data.totalAmount,
                userId: car.userId,
                status: "Requested",
                customerId: user.id,
                bookingFolderId: folder.folderId,
                type: parsedData.data.type,
                otp: (0, booking_1.generateOTP)()
            },
        });
        res.json({
            message: "Booking created successfully",
            bookingId: booking.id,
            folderId: folder.folderId,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.post('/booking-payment/:bookingId', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { advancePayment, paymentMethod, status } = req.body;
        const { bookingId } = req.params;
        if (!bookingId) {
            res.status(400).json({ message: "Booking id is required" });
            return;
        }
        if (!advancePayment || !paymentMethod) {
            res.status(400).json({ message: "Invalid input data" });
            return;
        }
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const booking = yield src_1.default.booking.findFirst({
            where: {
                id: bookingId,
                customerId: user.id
            }
        });
        if (!booking) {
            res.status(400).json({ message: "Invalid booking id" });
            return;
        }
        yield src_1.default.booking.update({
            where: {
                id: bookingId,
            },
            data: {
                paymentMethod: paymentMethod,
                advancePayment: advancePayment,
                status: status
            }
        });
        res.json({
            message: "Booking payment updated successfully",
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
exports.customerRouter.post('/favorite-car/:carId', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.carId),
            }
        });
        if (!car) {
            res.status(400).json({ message: "Invalid car id" });
            return;
        }
        yield src_1.default.favoriteCar.create({
            data: {
                userId: user.id,
                carId: car.id
            }
        });
        res.json({
            message: "Favorite car added successfully",
            carId: car.id,
            carName: car.brand + " " + car.model
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
exports.customerRouter.post('/update-kyc', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customers = yield src_1.default.customer.findMany({
            include: {
                documents: true
            }
        });
        for (const customer of customers) {
            if (customer.address !== null && customer.documents.length !== 0 && customer.email === null) {
                yield src_1.default.customer.update({
                    where: {
                        id: customer.id
                    },
                    data: {
                        kycStatus: "under review"
                    }
                });
            }
        }
        res.json({
            message: "KYC status updated successfully"
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
exports.customerRouter.get("/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customers = yield src_1.default.customer.findMany({
            include: {
                documents: true,
            },
        });
        res.json({
            message: "Customer fetched successfully",
            customers: customers,
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
exports.customerRouter.get("/me", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            },
            include: {
                documents: true
            }
        });
        if (!customer) {
            res.status(404).json({ message: "Customer not found" });
            return;
        }
        const formatedCustomer = {
            id: customer.id,
            name: customer.name,
            contact: customer.contact || undefined,
            address: customer.address || undefined,
            email: customer.email || undefined,
            folderId: customer.folderId,
            documents: customer.documents.map(doc => ({
                id: doc.id,
                name: doc.name,
                url: doc.url,
                type: doc.type,
                docType: doc.docType
            }))
        };
        res.json({
            message: "Customer fetched successfully",
            id: customer.id,
            name: customer.name,
            imageUrl: customer.imageUrl,
            customer: formatedCustomer,
            isPassword: customer.password && customer.password != "" ? true : false,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.get("/kyc-status", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            },
            include: {
                documents: true
            }
        });
        if (!customer) {
            res.status(404).json({ message: "Customer not found" });
            return;
        }
        res.json({
            message: "Customer fetched successfully",
            kycStatus: customer.kycStatus,
            approvedFlag: customer.approvedFlag,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.get("/check-otp/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.query.otp) {
            res.status(400).json({ message: "OTP is required" });
            return;
        }
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const booking = yield src_1.default.booking.findFirst({
            where: {
                id: req.params.id,
            },
        });
        if (!booking) {
            res.status(400).json({ message: "Booking not found" });
            return;
        }
        res.json({
            message: "OTP checked successfully",
            isCorrect: booking.otp === req.query.otp,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.get("/car/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.customer.findFirst({
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
                favoriteCars: true,
                photos: true
            },
            where: {
                status: "active"
            }
        });
        const formatedCars = cars.map((car) => {
            return {
                id: car.id,
                brand: car.brand,
                model: car.model,
                imageUrl: car.imageUrl,
                price: car.price,
                seats: car.seats,
                fuel: car.fuel,
                gear: car.gear,
                favorite: car.favoriteCars.filter(favorite => favorite.userId === user.id).length > 0,
                photos: car.photos.map(photo => photo.url)
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
exports.customerRouter.get("/car/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!customer) {
            res.status(404).json({ message: "unauthorized" });
            return;
        }
        const car = yield src_1.default.car.findFirst({
            where: {
                id: parseInt(req.params.id),
                status: "active"
            },
            include: {
                favoriteCars: true,
                photos: true
            },
        });
        if (!car) {
            res.status(404).json({ message: "Car not found" });
            return;
        }
        const formatedCars = {
            id: car.id,
            brand: car.brand,
            model: car.model,
            price: car.price,
            seats: car.seats,
            fuel: car.fuel,
            gear: car.gear,
            favorite: car.favoriteCars.filter(favorite => favorite.userId === req.userId).length > 0,
            photos: car.photos.map(photo => photo.url),
        };
        res.json({
            message: "Car fetched successfully",
            car: formatedCars,
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
exports.customerRouter.get("/booking/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookings = yield src_1.default.booking.findMany({
            where: {
                customerId: req.userId,
            },
            include: {
                car: true,
            },
            orderBy: [{ id: "asc" }],
        });
        const formatedBookings = bookings.map((booking) => {
            return {
                id: booking.id,
                carId: booking.car.id,
                carImageUrl: booking.car.imageUrl,
                carName: booking.car.brand + " " + booking.car.model,
                carPlateNumber: booking.car.plateNumber,
                start: booking.startDate,
                end: booking.endDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                price: booking.totalEarnings,
                type: booking.type,
            };
        });
        res.json({
            message: "Bookings fetched successfully",
            bookings: formatedBookings,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.get("/filtered-cars", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.FilterCarsSchema.safeParse(req.query);
    if (!parsedData.success) {
        res.status(400).json({ message: "Wrong Input type" });
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
        const cars = yield src_1.default.car.findMany({
            include: {
                bookings: true,
                favoriteCars: true,
                photos: true
            }
        });
        const searchStart = combiningDateTime(parsedData.data.startDate, parsedData.data.startTime);
        const searchEnd = combiningDateTime(parsedData.data.endDate, parsedData.data.endTime);
        const filteredCars = cars.filter(car => {
            return isCarAvailable(car, searchStart, searchEnd);
        });
        const formatedCars = filteredCars.map((car) => {
            return {
                id: car.id,
                brand: car.brand,
                model: car.model,
                imageUrl: car.imageUrl,
                price: car.price,
                seats: car.seats,
                fuel: car.fuel,
                favorite: car.favoriteCars.filter(favorite => favorite.userId === req.userId).length > 0,
                photos: car.photos.map(photo => photo.url),
                gear: car.gear,
                plateNumber: parsedData.data.user === "admin" ? car.plateNumber : undefined
            };
        });
        res.json({
            message: "Cars fetched successfully",
            cars: formatedCars,
        });
        return;
    }
    catch (err) {
        console.error(err);
        res.json({ message: "Internal Server Error" });
    }
}));
exports.customerRouter.get('/favorite-cars', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            },
            include: {
                favoriteCars: {
                    include: {
                        car: {
                            include: {
                                photos: true
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const favoriteCars = user.favoriteCars
            .filter(car => car.car.status !== "pause")
            .map((car) => {
            return {
                id: car.car.id,
                favorite: true,
                brand: car.car.brand,
                model: car.car.model,
                imageUrl: car.car.imageUrl,
                price: car.car.price,
                seats: car.car.seats,
                fuel: car.car.fuel,
                photos: car.car.photos.map(photo => photo.url),
                gear: car.car.gear
            };
        });
        res.json({
            message: "Favorite cars fetched successfully",
            favoriteCars,
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
exports.customerRouter.put('/me', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerProfileSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            },
        });
        if (!customer) {
            res.status(400).json({ message: "Customer not found" });
            return;
        }
        yield src_1.default.customer.update({
            where: {
                id: req.userId,
            },
            data: Object.assign({}, parsedData.data),
        });
        res.json({
            message: "Customer updated successfully",
            id: customer.id,
            name: customer.name,
            contact: customer.contact,
            customer: customer.imageUrl
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.put("/set-joining-date/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookings = yield src_1.default.booking.findMany({
            include: {
                customer: true,
            },
        });
        const customers = [];
        for (const booking of bookings) {
            const customer = booking.customer;
            const joiningDate = new Date(customer.joiningDate);
            const startDate = new Date(booking.startDate);
            if (joiningDate.getFullYear() === 2026) {
                customers.push(customer);
                yield src_1.default.customer.update({
                    where: {
                        id: customer.id,
                    },
                    data: {
                        joiningDate: (0, booking_1.formatDate)(startDate),
                    },
                });
            }
        }
        res.json({
            message: "Customer Joining date updated successfully",
            customers
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
exports.customerRouter.put('/kyc-approve-flag', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!customer) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        yield src_1.default.customer.update({
            where: {
                id: customer.id
            },
            data: {
                approvedFlag: false
            }
        });
        res.json({
            message: "KYC flag verfied successfully"
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
exports.customerRouter.put("/verify-kyc/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: parseInt(req.params.id),
            }
        });
        if (!customer) {
            res.status(400).json({ message: "Invalid customer id" });
            return;
        }
        yield src_1.default.customer.update({
            where: {
                id: customer.id
            },
            data: {
                kycStatus: "verified",
                approvedFlag: true
            }
        });
        res.json({
            message: "KYC status updated successfully"
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
exports.customerRouter.put('/booking-cancel/:id', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const booking = yield src_1.default.booking.findFirst({
            where: {
                id: req.params.id,
            }
        });
        if (!booking) {
            res.status(400).json({ message: "Booking not found" });
            return;
        }
        yield src_1.default.booking.update({
            where: {
                id: req.params.id,
            },
            data: {
                status: "Cancelled",
                cancelledBy: "guest"
            }
        });
        res.json({
            message: "Booking cancelled successfully",
            BookingId: req.params.id,
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
exports.customerRouter.put('/me/update-password', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerUpdatePasswordSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const customer = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!customer) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        if (customer.password && (!parsedData.data.currPassword || customer.password !== parsedData.data.currPassword)) {
            res.status(403).json({ message: "Invalid current password" });
            return;
        }
        yield src_1.default.customer.update({
            where: {
                id: customer.id
            },
            data: {
                password: parsedData.data.newPassword
            }
        });
        res.json({
            message: "Password updated successfully"
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
exports.customerRouter.put("/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerUpdateSchema.safeParse(req.body);
    if (!parsedData.success) {
        res
            .status(400)
            .json({ message: "Wrong Input type", error: parsedData.error });
        return;
    }
    try {
        const customer = yield src_1.default.customer.findFirst({
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
        if (parsedData.data.deletedPhotos) {
            for (const photo of parsedData.data.deletedPhotos) {
                yield src_1.default.document.delete({
                    where: {
                        id: photo.id
                    }
                });
            }
            yield (0, delete_1.deleteMultipleFiles)(parsedData.data.deletedPhotos.map((document) => document.url));
        }
        const documents = [];
        if (parsedData.data.documents) {
            for (const document of parsedData.data.documents) {
                const doc = yield src_1.default.document.create({
                    data: {
                        name: document.name,
                        url: document.url,
                        type: document.type,
                        customerId: customer.id,
                        docType: document.docType || "others"
                    },
                });
                documents.push(doc);
            }
        }
        yield src_1.default.customer.update({
            data: {
                name: parsedData.data.name,
                contact: parsedData.data.contact,
                address: parsedData.data.address,
                folderId: parsedData.data.folderId,
                email: parsedData.data.email,
                joiningDate: parsedData.data.joiningDate && (0, booking_1.formatDate)(parsedData.data.joiningDate),
                kycStatus: parsedData.data.kycStatus
            },
            where: {
                id: customer.id,
            }
        });
        res.json({
            message: "Customer updated successfully",
            CustomerId: customer.id,
            documents
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.delete("/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield src_1.default.customer.findFirst({
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
        yield src_1.default.document.deleteMany({
            where: {
                customerId: customer.id,
            },
        });
        if (customer.documents.length > 0) {
            yield (0, delete_1.deleteMultipleFiles)(customer.documents.map((document) => document.url));
        }
        yield (0, folder_1.deleteFolder)(customer.folderId);
        yield src_1.default.customer.delete({
            where: {
                id: customer.id,
            },
        });
        res.json({
            message: "Customer deleted successfully",
            CustomerId: customer.id,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.delete("/:id/documents/all", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const customer = yield src_1.default.customer.findFirst({
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
        yield src_1.default.document.deleteMany({
            where: {
                customerId: parseInt(id),
            },
        });
        if (customer.documents.length > 0) {
            yield (0, delete_1.deleteMultipleFiles)(customer.documents.map((document) => document.url));
        }
        res.status(200).json({
            message: "Document deleted successfully",
            BookingId: id,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.delete("/document/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.role === "customer") {
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
        const document = yield src_1.default.document.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (document.url) {
            yield (0, delete_1.deleteFile)(document.url);
        }
        res.status(200).json({
            message: "Document deleted successfully",
            BookingId: req.params.id,
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(400).json({
            message: "Internal server error",
            error: e,
        });
        return;
    }
}));
exports.customerRouter.delete('/favorite-car/:carId', middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield src_1.default.customer.findFirst({
            where: {
                id: req.userId,
            }
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const favorite = yield src_1.default.favoriteCar.findFirst({
            where: {
                carId: parseInt(req.params.carId),
                userId: user.id
            }
        });
        if (!favorite) {
            res.status(400).json({ message: "Invalid car id" });
            return;
        }
        yield src_1.default.favoriteCar.delete({
            where: {
                id: favorite.id
            }
        });
        res.json({
            message: "Favorite car removed successfully",
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
