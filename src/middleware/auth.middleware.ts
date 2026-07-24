import { Request, Response, NextFunction } from 'express'
import { unauthorized, forbidden } from '../utils/response';
import jwt from "jsonwebtoken";
import { Role } from '../generated/prisma/client';

export interface JwtPayload {
    userId: string;
    role: Role;
    apartmentId: string | null;
    roomId: string | null;
};

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload
        }
    }
}

export function verifyJwt(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    // console.log("hello")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        unauthorized(res, "No token provided");
        return
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
        // console.log("hell");

        req.user = payload;

        next();


    } catch (e) {
        unauthorized(res, "Invalid or expired token");
        return;
    }
};


export function requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            unauthorized(res);
            return
        }

        if (!roles.includes(req.user.role)) {
            forbidden(res, "Insufficient Permission");
            return
        }
        next();
    }
}