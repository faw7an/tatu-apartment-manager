import {z} from "zod";
import { Router } from 'express';
import { validate } from "../middleware/validate.middleware";
import { verifyJwt , requireRole} from '../middleware/auth.middleware';
import * as apartment from '../controller/apartment.controller';
import {Role} from '../generated/prisma/client';

const router = Router();


router.get('/apartment', verifyJwt, apartment.getApartment);
router.patch('/apartment', verifyJwt, requireRole(Role.LANDLORD), apartment.updateApartment);


export default router;