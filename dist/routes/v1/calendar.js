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
exports.calendarRouter = void 0;
const express_1 = require("express");
const types_1 = require("../../types");
const middleware_1 = require("../../middleware");
const src_1 = __importDefault(require("../../store/src"));
exports.calendarRouter = (0, express_1.Router)();
exports.calendarRouter.get("/all", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const bookings = yield src_1.default.booking.findMany({
        where: {
          userId: req.userId,
        },
        include: {
          car: true,
          customer: true,
        },
      });
      const formatedBookings = bookings.map((booking) => {
        return {
          id: booking.id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          startTime: booking.startTime,
          endTime: booking.endTime,
          color: booking.car.colorOfBooking,
          allDay: booking.allDay,
          customerName: booking.customer.name,
          customerContact: booking.customer.contact,
          carId: booking.carId,
          carName: booking.car.brand + " " + booking.car.model,
        };
      });
      res.json({
        message: "Bookings fetched successfully",
        bookings: formatedBookings,
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
exports.calendarRouter.put("/:id", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CalendarUpdateSchema.safeParse(req.body);
    if (!parsedData.success) {
      res
        .status(400)
        .json({ message: "Wrong Input type", error: parsedData.error });
      return;
    }
    try {
      const booking = yield src_1.default.booking.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId,
        },
        include: {
          car: true,
        },
      });
      if (!booking) {
        res.status(400).json({ message: "Booking not found" });
        return;
      }
      const updateData = {};
      if (parsedData.data.startDate !== undefined)
        updateData.startDate = parsedData.data.startDate;
      if (parsedData.data.endDate !== undefined)
        updateData.endDate = parsedData.data.endDate;
      if (parsedData.data.startTime !== undefined)
        updateData.startTime = parsedData.data.startTime;
      if (parsedData.data.endTime !== undefined)
        updateData.endTime = parsedData.data.endTime;
      if (parsedData.data.allDay !== undefined)
        updateData.allDay = parsedData.data.allDay;
      yield src_1.default.booking.update({
        data: updateData,
        where: {
          id: req.params.id,
        },
      });
      if (parsedData.data.customerName) {
        yield src_1.default.customer.update({
          where: {
            id: booking.customerId,
          },
          data: {
            name: parsedData.data.customerName,
          },
        });
      }
      res.json({
        message: "Booking updated successfully",
        BookingId: booking.id,
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
exports.calendarRouter.delete("/:id", middleware_1.middleware, (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const booking = yield src_1.default.booking.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId,
        },
        include: {
          car: true,
        },
      });
      if (!booking) {
        res.status(400).json({ message: "Booking not found" });
        return;
      }
      yield src_1.default.carImages.deleteMany({
        where: {
          bookingId: req.params.id,
        },
      });
      yield src_1.default.booking.delete({
        where: {
          id: req.params.id,
        },
      });
      res.json({
        message: "Booking deleted successfully",
        BookingId: booking.id,
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
exports.calendarRouter.put(
  "/change-color/:id",
  middleware_1.middleware,
  (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const car = yield src_1.default.car.findFirst({
          where: {
            id: parseInt(req.params.id),
            userId: req.userId,
          },
        });
        if (!car) {
          res.status(400).json({ message: "Car not found" });
          return;
        }
        yield src_1.default.car.update({
          data: {
            colorOfBooking: req.body.color,
          },
          where: {
            id: parseInt(req.params.id),
          },
        });
        res.json({
          message: "Booking color updated successfully",
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
