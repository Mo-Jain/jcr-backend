"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerProfileSchema = exports.CustomerBookingSchema = exports.CustomerUpdateSchema = exports.CustomerCreateSchema = exports.CalendarUpdateSchema = exports.MultipleBookingDeleteSchema = exports.BookingEndSchema = exports.BookingStartSchema = exports.MultipleBookingSchema = exports.BookingUpdateSchema = exports.BookingSchema = exports.FilterCarsSchema = exports.CarPhotosSchema = exports.CarsUpdateSchema = exports.CarsSchema = exports.UpdateUserSchema = exports.customerSignupSchema = exports.SigninSchema = exports.SignupSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const bufferSchema = zod_1.default.instanceof(Buffer);
exports.SignupSchema = zod_1.default.object({
    username: zod_1.default.string(),
    password: zod_1.default.string(),
    name: zod_1.default.string(),
    imageUrl: zod_1.default.string().url().optional(),
});
exports.SigninSchema = zod_1.default.object({
    username: zod_1.default.string(),
    password: zod_1.default.string(),
});
exports.customerSignupSchema = zod_1.default.object({
    name: zod_1.default.string(),
    contact: zod_1.default.string(),
    password: zod_1.default.string(),
});
exports.UpdateUserSchema = zod_1.default.object({
    username: zod_1.default.string().optional(),
    password: zod_1.default.string().optional(),
    name: zod_1.default.string().optional(),
    imageUrl: zod_1.default.string().url().optional(),
    profileFolderId: zod_1.default.string().optional(),
});
exports.CarsSchema = zod_1.default.object({
    brand: zod_1.default.string(),
    model: zod_1.default.string(),
    plateNumber: zod_1.default.string(),
    color: zod_1.default.string(),
    price: zod_1.default.number(),
    mileage: zod_1.default.number(),
    imageUrl: zod_1.default.string().url(),
    carFolderId: zod_1.default.string(),
    seats: zod_1.default.number(),
    fuel: zod_1.default.string()
});
exports.CarsUpdateSchema = zod_1.default.object({
    color: zod_1.default.string().optional(),
    price: zod_1.default.number().optional(),
    mileage: zod_1.default.number().optional(),
    imageUrl: zod_1.default.string().url().optional(),
    seats: zod_1.default.number().optional(),
    fuel: zod_1.default.string().optional(),
    gear: zod_1.default.string().optional()
});
exports.CarPhotosSchema = zod_1.default.object({
    urls: zod_1.default.array(zod_1.default.string().url()),
});
exports.FilterCarsSchema = zod_1.default.object({
    startDate: zod_1.default.string(),
    endDate: zod_1.default.string(),
    startTime: zod_1.default.string(),
    endTime: zod_1.default.string(),
    user: zod_1.default.string()
});
exports.BookingSchema = zod_1.default.object({
    startDate: zod_1.default.string(),
    endDate: zod_1.default.string(),
    startTime: zod_1.default.string(),
    endTime: zod_1.default.string(),
    allDay: zod_1.default.boolean(),
    carId: zod_1.default.number(),
    customerName: zod_1.default.string(),
    customerContact: zod_1.default.string(),
    dailyRentalPrice: zod_1.default.number(),
    totalAmount: zod_1.default.number(),
    customerId: zod_1.default.number().optional(),
    advance: zod_1.default.number().optional(),
});
const DocumentSchema = zod_1.default.object({
    id: zod_1.default.number().optional(),
    name: zod_1.default.string(),
    url: zod_1.default.string().url(),
    type: zod_1.default.string(),
    folderId: zod_1.default.string().optional(),
    docType: zod_1.default.string().optional()
});
exports.BookingUpdateSchema = zod_1.default.object({
    startDate: zod_1.default.string().optional(),
    endDate: zod_1.default.string().optional(),
    startTime: zod_1.default.string().optional(),
    endTime: zod_1.default.string().optional(),
    allDay: zod_1.default.boolean().optional(),
    status: zod_1.default.string().optional(),
    carId: zod_1.default.number().optional(),
    customerName: zod_1.default.string().optional(),
    customerAddress: zod_1.default.string().optional(),
    customerContact: zod_1.default.string().optional(),
    securityDeposit: zod_1.default.string().optional(),
    dailyRentalPrice: zod_1.default.number().optional(),
    paymentMethod: zod_1.default.string().optional(),
    advancePayment: zod_1.default.number().optional(),
    odometerReading: zod_1.default.string().optional(),
    endOdometerReading: zod_1.default.string().optional(),
    notes: zod_1.default.string().optional(),
    totalAmount: zod_1.default.number(),
    documents: zod_1.default.array(DocumentSchema).optional(),
    selfieUrl: zod_1.default.string().url().optional(),
    carImages: zod_1.default.array(DocumentSchema).optional(),
});
exports.MultipleBookingSchema = zod_1.default.array(zod_1.default.object({
    startDate: zod_1.default.string(),
    endDate: zod_1.default.string(),
    startTime: zod_1.default.string(),
    endTime: zod_1.default.string(),
    allDay: zod_1.default.boolean(),
    status: zod_1.default.string(),
    carId: zod_1.default.number(),
    securityDeposit: zod_1.default.string().optional(),
    dailyRentalPrice: zod_1.default.number(),
    advancePayment: zod_1.default.number().optional(),
    totalEarnings: zod_1.default.number().optional(),
    paymentMethod: zod_1.default.string().optional(),
    odometerReading: zod_1.default.string().optional(),
    notes: zod_1.default.string().optional(),
    customerName: zod_1.default.string(),
    customerContact: zod_1.default.string(),
    customerAddress: zod_1.default.string().optional(),
}));
exports.BookingStartSchema = zod_1.default.object({
    bookingAmountReceived: zod_1.default.number(),
    dailyRentalPrice: zod_1.default.number(),
    notes: zod_1.default.string().optional(),
    odometerReading: zod_1.default.string(),
    paymentMethod: zod_1.default.string(),
    returnDate: zod_1.default.string(),
    returnTime: zod_1.default.string(),
    securityDeposit: zod_1.default.string(),
    selectedCar: zod_1.default.number(),
    startDate: zod_1.default.string(),
    startTime: zod_1.default.string(),
    totalAmount: zod_1.default.number(),
    documents: zod_1.default.array(DocumentSchema).optional(),
    selfieUrl: zod_1.default.string().url().optional(),
    carImages: zod_1.default.array(DocumentSchema).optional(),
    customerAddress: zod_1.default.string(),
    customerName: zod_1.default.string(),
    customerContact: zod_1.default.string(),
});
exports.BookingEndSchema = zod_1.default.object({
    endDate: zod_1.default.string(),
    endTime: zod_1.default.string(),
    odometerReading: zod_1.default.string(),
});
exports.MultipleBookingDeleteSchema = zod_1.default.object({
    bookingIds: zod_1.default.array(zod_1.default.string()),
});
exports.CalendarUpdateSchema = zod_1.default.object({
    startDate: zod_1.default.string().optional(),
    endDate: zod_1.default.string().optional(),
    startTime: zod_1.default.string().optional(),
    endTime: zod_1.default.string().optional(),
    allDay: zod_1.default.boolean().optional(),
    customerName: zod_1.default.string().optional(),
});
exports.CustomerCreateSchema = zod_1.default.object({
    name: zod_1.default.string(),
    contact: zod_1.default.string(),
    address: zod_1.default.string(),
    folderId: zod_1.default.string(),
    joiningDate: zod_1.default.string(),
    documents: zod_1.default.array(DocumentSchema).optional(),
});
exports.CustomerUpdateSchema = zod_1.default.object({
    name: zod_1.default.string(),
    contact: zod_1.default.string(),
    address: zod_1.default.string(),
    email: zod_1.default.string().optional(),
    folderId: zod_1.default.string().optional(),
    joiningDate: zod_1.default.string().optional(),
    documents: zod_1.default.array(DocumentSchema).optional(),
    deletedPhotos: zod_1.default.array(zod_1.default.object({
        id: zod_1.default.number(),
        url: zod_1.default.string().url()
    })).optional(),
    kycStatus: zod_1.default.string().optional()
});
exports.CustomerBookingSchema = zod_1.default.object({
    startDate: zod_1.default.string(),
    endDate: zod_1.default.string(),
    startTime: zod_1.default.string(),
    endTime: zod_1.default.string(),
    allDay: zod_1.default.boolean(),
    carId: zod_1.default.number(),
    totalAmount: zod_1.default.number(),
});
exports.CustomerProfileSchema = zod_1.default.object({
    name: zod_1.default.string().optional(),
    contact: zod_1.default.string().optional(),
    password: zod_1.default.string().optional(),
    imageUrl: zod_1.default.string().optional()
});
