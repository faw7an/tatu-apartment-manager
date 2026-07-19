import { Request, Response, } from 'express';
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { JwtPayload } from '../middleware/auth.middleware';
import { ok, created, unauthorized, conflict, badRequest, notFound } from "../utils/response";
import jwt from 'jsonwebtoken';
import { addDays } from "../utils/helpers";

function buildPayload(
    user: {
        id: string,
        role: import('../generated/prisma/client').Role,
        apartmentId: string | null,
        roomId: string | null
    }): JwtPayload {
    return {
        userId: user.id,
        role: user.role,
        apartmentId: user.apartmentId,
        roomId: user.roomId
    }
}

function signRefresh(payload: JwtPayload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '15m'
    } as jwt.SignOptions);
}


function signAccess(payload: JwtPayload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    } as jwt.SignOptions);
}

// Register (landlords only)
export async function register(req: Request, res: Response): Promise<void> {
    const { fullName, email, phone, password, apartmentName, apartmentAddress } = req.body;

    const existingLandLord = await prisma.users.findFirst({
        where: { role: "LANDLORD" }
    });

    if (existingLandLord) {
        conflict(
            res,
            "A Landlord already exists for this deployment"
        );
        return;
    }

    const existingEmail = await prisma.users.findFirst({
        where: {
            email: email
        }
    });

    if (existingEmail) {
        conflict(res, "Email already in use");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);


    const results = await prisma.$transaction(async (tx) => {
        const apartment = await tx.apartment.create({
            data: {
                name: apartmentName,
                address: apartmentAddress
            }
        });

        const landlord = await tx.users.create({
            data: {
                fullName,
                email,
                passwordHash,
                phone,
                role: "LANDLORD",
                apartmentId: apartment.id
            }
        });
        return { apartment, landlord };
    });

    const payload = buildPayload(results.landlord);
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    await prisma.refreshTokens.create({
        data: {
            userId: results.landlord.id,
            token: refreshToken,
            expiresAt: addDays(new Date(), 30)
        }
    })

    created(
        res,
        {
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: {
                id: results.landlord.id,
                fullName: results.landlord.fullName,
                email: results.landlord.email,
                phoneNumber: results.landlord.phone,
                role: results.landlord.role,
                apartmentId: results.landlord.apartmentId,

            }
        },
        "Registered successfully"
    );

};


// login
export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
        notFound(
            res,
            "User not found"
        );
        return;
    }

    const validUser = await bcrypt.compare(password, user.passwordHash);

    if (!validUser) {
        unauthorized(
            res,
            "Invalid email or password"
        );
        return;
    }

    const payload = buildPayload(user);
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    await prisma.refreshTokens.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: addDays(new Date(), 30)
        }
    })

    ok(
        res,
        {
            'accessToken': accessToken,
            'refreshToken': refreshToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                apartmentId: user.apartmentId,
                roomId: user.roomId,
            },
        },
        "Login successfully"
    )
}

// logout
export async function logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (refreshToken) {
        await prisma.refreshTokens.deleteMany({ where: refreshToken });
    }
    ok(res, null, "Log out Successfully");
}

// refresh
export async function refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        badRequest(
            res,
            "refresh token required",
        );
        return;
    }

    let payload: JwtPayload;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
        
    } catch (e) {
        unauthorized(
            res,
            "Invalid refresh token or expired"
        );
        return;
    }

    const storedToken = await prisma.refreshTokens.findUnique({ where: { token: refreshToken } });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {

        unauthorized(
            res, "Invalid refresh token or expired"
        );
        return;
    }
    

    // rotate delete old provide new
    await prisma.refreshTokens.delete({ where: { token: refreshToken } });

    const user = await prisma.users.findUnique({ where: { id: payload.userId } });

    if (!user) {
        notFound(
            res, "User not found"
        );
        return;
    }

    const newPayload = buildPayload(user);
    const newAccessToken = signAccess(newPayload);
    const newRefreshToken = signRefresh(newPayload);

    await prisma.refreshTokens.create({
        data: {
            token: newRefreshToken,
            userId: user.id,
            expiresAt: addDays(new Date(), 30)
        }
    });

    ok(
        res,
        {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }
    )
}

// profile
export async function profile(req: Request, res: Response): Promise<void> {
    console.log("hell");
    console.log("hell");
    console.log("hell");

    const user = req.user;

    const profile = await prisma.users.findUnique({
        where: { id: user!.userId },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            apartmentId: true,
            roomId: true,
            createdAt: true
        }
    });

    if (!profile) {
        notFound(
            res, "User not found"
        );
        return;
    }

    ok(
        res, profile
    )
}