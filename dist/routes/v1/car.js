"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.carRouter = void 0;
const express_1 = require("express");
const types_1 = require("../../types");
const middleware_1 = require("../../middleware");
const folder_1 = require("./folder");
const src_1 = __importDefault(require("../../store/src"));
const delete_1 = require("./delete");
exports.carRouter = (0, express_1.Router)();
function calculateEarnings(bookings) {
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
exports.carRouter.post("/", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
  }),
);
exports.carRouter.get("/all", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const cars = yield src_1.default.car.findMany({
        where: {
          userId: req.userId,
        },
      });
      const formatedCars = cars.map((car) => {
        return {
          id: car.id,
          brand: car.brand,
          model: car.model,
          plateNumber: car.plateNumber,
          imageUrl: car.imageUrl,
          colorOfBooking: car.colorOfBooking,
          price: car.price,
        };
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
  }),
);
exports.carRouter.get("/:id", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const car = yield src_1.default.car.findFirst({
        where: {
          id: parseInt(req.params.id),
          userId: req.userId,
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
      const formatedCars = Object.assign(Object.assign({}, car), {
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
      });
      res.json({
        message: "Car fetched successfully",
        car: formatedCars,
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
  }),
);
exports.carRouter.get("/earnings/:id", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const car = yield src_1.default.car.findFirst({
        where: {
          id: parseInt(req.params.id),
          userId: req.userId,
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
  }),
);
exports.carRouter.get(
  "/thismonth/earnings/all",
  middleware_1.middleware,
  (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const cars = yield src_1.default.car.findMany({
          where: {
            userId: req.userId,
          },
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
    }),
);
exports.carRouter.put("/:id", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
          userId: req.userId,
        },
      });
      if (!car) {
        res.status(404).json({ message: "Car not found" });
        return;
      }
      yield src_1.default.car.update({
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
        yield (0, delete_1.deleteFile)(car.imageUrl);
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
  }),
);
exports.carRouter.delete("/:id", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const car = yield src_1.default.car.findFirst({
        where: {
          id: parseInt(req.params.id),
          userId: req.userId,
        },
      });
      if (!car) {
        res.status(404).json({ message: "Car not found" });
        return;
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
    } catch (e) {
      res.status(400).json({
        message: "Internal server error",
        error: e,
      });
      return;
    }
  }),
);
