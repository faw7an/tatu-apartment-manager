import { Request, Response } from 'express';
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";
import { addDays, generateOtp, getOtpExpiry } from "../utils/helpers";
import { Role } from '../generated/prisma/client';
import { OtpPurpose } from '../generated/prisma/client';


// get all tenants
export async function getTenants(req: Request, res: Response): Promise<void> {
    const user = req.body;

    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    const tenant = await prisma.users.findMany({
        where: {
            apartmentId: user!.apartmentId!,
            role: Role.TENANT,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isEmailVerified: true,
            room: true,
            bills: {
                where: {
                    month: currentMonth
                },
                take: 1,
                include: {
                    billLineItems: true
                }
            }
        },

    });

    if (tenant.length === 0) {
        notFound(
            res, "Tenants not found for this apartment"
        );
        return;
    }

    ok(
        res, tenant
    )

}


export async function getTenantById(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;


    if (!id || typeof id !== 'string') {
        badRequest(
            res, 'Invalid tenant Id'
        );
        return;
    }

    const tenant = await prisma.users.findFirst({
        where: {
            id,
            role: Role.TENANT
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isEmailVerified: true,
            room: {
                include: {
                    issues: true
                }
            },
            bills: {
                where: {
                    month: currentMonth
                },
                take: 1,
                include: {
                    billLineItems: true
                }
            }
        }
    });

    if (!tenant) {
        notFound(
            res, "Tenant not found"
        );
        return;
    }

    ok(
        res, tenant
    )
}


// add tenant
export async function createTenant(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { fullName, email, phone, roomId } = req.body;

    const emailExists = await prisma.users.findUnique({
        where: { email }
    });

    if (emailExists) {
        conflict(
            res, "Email already exists"
        );
        return;
    }

    const roomExists = await prisma.rooms.findUnique({
        where: {
            id: roomId,
            apartmentId: user!.apartmentId!
        }
    });

    if (!roomExists) {
        notFound(
            res, "Room not found"
        );
        return;
    }

    if (roomExists.isOccupied) {
        conflict(
            res, "Room is currently occupied"
        );
        return;
    }

    const tempPassword = `$fullName001`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const leaseStart = new Date();

    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry(43200);

    const results = await prisma.$transaction(async (tx) => {
        const createTenant = await tx.users.create({
            data: {
                fullName,
                email,
                phone,
                role: Role.TENANT,
                passwordHash,
                apartmentId: user!.apartmentId!,
                roomId,
                otp,
                otpExpiresAt,
                otpPurpose: OtpPurpose.EMAIL_VERIFICATION
            },
            select: {
                fullName: true,
                email: true,
                phone: true,
                role: true,
                roomId: true
            }
        });

        // update room
        const updateRoom = await tx.rooms.update({
            where: {
                id: roomId
            },
            data: {
                isOccupied: true,
                leaseStart
            },
            select: {
                roomNumber: true
            }
        })

        return {
            tenant: createTenant, room: updateRoom
        }
    })

    created(
        res, results, "Tenant created successfully"
    );
}

// get tenant by Id
export async function removeTenantById(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        badRequest(
            res, 'Invalid tenant Id'
        );
        return;
    }

    const tenant = await prisma.users.findFirst({
        where: {
            id,
            role: Role.TENANT
        },
    })

    if (!tenant) {
        notFound(
            res, "Tenant not found"
        );
        return;
    }

    await prisma.$transaction(async (tx) => {
        await prisma.refreshTokens.deleteMany({
            where: {
                userId: tenant.id
            }
        });

        if (tenant.roomId) {
            await prisma.users.delete({
                where: {
                    id: tenant.id
                }
            });

            await prisma.rooms.update({
                where: {
                    id: tenant.roomId
                },
                data: {
                    isOccupied: false,
                    leaseStart: null,
                    leaseEnd: null
                }
            });
        }
    });

    ok(
        res, "Tenant deleted successfully"
    )

}

// nuke
export async function deleteTenants(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const tenant = await prisma.users.findMany({
        where: {
            role: Role.TENANT
        },
        select: {
            id: true,
            roomId: true
        }
    })

    if (!tenant) {
        notFound(
            res, "Tenant not found"
        );
        return;
    }

    const tenantIds = tenant.map(t => t.id)
    const roomIds = tenant.map(t => t.roomId).filter((roomId): roomId is string => roomId !== null);


    await prisma.$transaction(async (tx) => {
        await prisma.refreshTokens.deleteMany({
            where: {
                userId: {
                    in: tenantIds
                }
            },
        });

        if (roomIds.length > 0) {
            await prisma.rooms.updateMany({
                where: {
                    id: {
                        in: roomIds
                    }
                },
                data: {
                    isOccupied: false,
                    leaseStart: null,
                    leaseEnd: null
                }
            })
        }

        await prisma.users.deleteMany({
            where: {
                id: {
                    in: tenantIds
                }
            }
        });

    });

    ok(
        res, "Deleted all tenants successfully"
    )
}