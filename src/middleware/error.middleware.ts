import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client"
import { ok, created, unauthorized, forbidden, conflict, internalServerError, badRequest, notFound } from "../utils/response";

export function errorHandler(
    err: Error, req: Request, res: Response, next: NextFunction
) {
    console.error(err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return badRequest(
            res, "Database operation failed"
        );
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
        return internalServerError(
            res, 'Service temporarily unavailable'
        );

    }

    // Validation errors
    if (err.name === 'ZodError') {
        return badRequest(
            res, 'Validation failed'
        )

    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return unauthorized(
            res, 'Invalid token'
        )

    }

    if (err.name === 'TokenExpiredError') {
        return unauthorized(
            res, 'Token expired'
        )
    }

    return internalServerError(
        res,
        err.message 
    );
}

