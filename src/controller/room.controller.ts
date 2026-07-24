import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ok, created, unauthorized, conflict, badRequest, notFound } from "../utils/response";
import { z } from 'zod';
import { initializeRoomsSchema } from '../routes/room.route';


type InitializeRoomInput = z.infer<typeof initializeRoomsSchema>;

// get all rooms
export async function getRooms(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const rooms = await prisma.rooms.findMany({
        where: { apartmentId: user!.apartmentId! }
    });

    if (!rooms || rooms.length === 0) {
        notFound(
            res, "No rooms found for this apartment");
        return;
    };

    ok(
        res, {
        rooms: rooms
    }
    );
}

export async function initializeRooms(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { floors, basePrice, padding }: InitializeRoomInput = req.body;
    const apartmentId = user!.apartmentId!;
    const rentAmount = basePrice;

    const roomsToCreate = Array.from(floors, (floorConfig) => {
        const currentFloor = floorConfig.floor;
        const floorStartingNumber = floorConfig.startNumber;
        return Array.from({ length: floorConfig.roomsPerFloor }, (_, roomIndex) => {
            const rawNumber = floorStartingNumber + roomIndex;
            // console.log(rawNumber);
            // console.log(startNumber);

            const paddedNumber = String(rawNumber).padStart(padding, '0');

            return {
                apartmentId,
                rentAmount,
                roomNumber: `${floorConfig.prefix ? floorConfig.prefix + '-' : currentFloor + '-'}${paddedNumber}`,
                floor: String(currentFloor),

            }
        })
    }).flat();

    // for (const room of roomsToCreate) {
    //     console.log(room.roomNumber)
    // }

    const roomNumbersToCheck = roomsToCreate.map((r) => r.roomNumber);

    const existingRooms = await prisma.rooms.findMany({
        where: {
            apartmentId,
            roomNumber: {
                in: roomNumbersToCheck
            }
        },
        select: {
            roomNumber: true
        }
    });

    if (existingRooms.length > 0) {
        const duplicates = existingRooms.map((d) => d.roomNumber);

        conflict(
            res, " Failed to initialize batch: some rooms already exist", duplicates
        );

        return;
    }

    const results = await prisma.rooms.createMany({
        data: roomsToCreate,
        skipDuplicates: true
    })
    console.log(roomsToCreate);
    created(
        res, results, "Rooms initialized successfully"
    );

}


// will make it update more than rent later on:
export async function updateRent(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { rentAmount } = req.body;

    if (!rentAmount) {
        badRequest(
            res, 'Rent amount required'
        );
        return;
    }

    // apartment has rooms?
    const existingRooms = await prisma.rooms.findMany({
        where: { apartmentId: user!.apartmentId! }
    });

    if (!existingRooms) {
        notFound(
            res, "Rooms not found for this apartment"
        );
        return;
    }

    const results = await prisma.rooms.updateMany({
        where: {
            apartmentId: user!.apartmentId!
        },
        data: { rentAmount }
    });

    ok(
        res,
        results,
        "Rent updated successfully",
    );
}

// nuclear
export async function deleteRooms(req: Request, res: Response): Promise<void> {
    const user = req.user;

    await prisma.rooms.deleteMany({
        where: {
            apartmentId: user!.apartmentId!,
        },
    });

    ok(
        res, "All rooms deleted"
    );
}