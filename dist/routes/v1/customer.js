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
const express_1 = require("express");
const src_1 = __importDefault(require("../../store/src"));
const middleware_1 = require("../../middleware");
const types_1 = require("../../types");
const folder_1 = require("./folder");
const delete_1 = require("./delete");
exports.customerRouter = (0, express_1.Router)();
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
exports.customerRouter.post("/", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerCreateSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Wrong Input type" });
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
exports.customerRouter.put("/:id", middleware_1.middleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = types_1.CustomerUpdateSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Wrong Input type" });
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
        if (parsedData.data.documents) {
            for (const document of parsedData.data.documents) {
                yield src_1.default.document.create({
                    data: {
                        name: document.name,
                        url: document.url,
                        type: document.type,
                        customerId: customer.id,
                    },
                });
            }
        }
        const updatedCustomer = yield src_1.default.customer.update({
            data: {
                name: parsedData.data.name,
                contact: parsedData.data.contact,
                address: parsedData.data.address,
                folderId: parsedData.data.folderId,
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
