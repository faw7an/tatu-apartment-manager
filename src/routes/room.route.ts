import { Router } from 'express';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role } from '../generated/prisma/client';
import * as room from '../controller/room.controller';
import { z } from 'zod';
import { validate } from "../middleware/validate.middleware";

const router = Router();


export const initializeRoomsSchema = z.object({
    basePrice: z.coerce.number().positive(),
    padding: z.coerce.number().int().min(2).max(5).default(2),
    
    floors: z.array(
        z.object({
            prefix: z.string().optional().default(""),
            floor: z.coerce.number().int().min(0),
            roomsPerFloor: z.coerce.number().int().min(1),
            startNumber: z.coerce.number().int().min(0).default(1),
        })
    )

});


router.get('/rooms', verifyJwt, room.getRooms);
router.post('/rooms/initialize', verifyJwt, validate(initializeRoomsSchema), requireRole(Role.LANDLORD), room.initializeRooms);

router.delete('/rooms/', verifyJwt, requireRole(Role.LANDLORD), room.deleteRooms);



export default router;