import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client"
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";

export function errorHandler(
    err: Error, req: Request, res: Response, next: NextFunction
) {
    console.error(err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        badRequest(
            res, "Database operation failed"
        );
        return;
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
        badRequest(
            res, 'Service temporarily unavailable'
        );
        return;
    }

    // Validation errors
    if (err.name === 'ZodError') {
        res.status(400).json({
            success: false,
            message: 'Validation failed'
        })
        return
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        })
        return
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token expired'
        })
        return
    }

    res.status(500).json({
        success: false,
        message: err.message || 'Internal server'
    });
}

