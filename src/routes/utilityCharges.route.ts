import { Router } from 'express';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import * as utility from '../controller/utilityCharges.controller';
import { Role } from '../generated/prisma/client';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware'

const router = Router();

const createUtilitySchema = z.object({
    name: z.string().min(2).max(100),
    chargeType: z.enum(["FIXED", "RATE_BASED"]),
    amount: z.number().positive().optional(),
    rate: z.number().positive().optional(),
}).refine((data) => {
    if (data.chargeType === "FIXED") return data.amount !== undefined;
    if (data.chargeType === "RATE_BASED") return data.rate !== undefined;

    return true;
}, {
    message: "FIXED requires amount, RATE_BASED requires rate"
});


const updateUtilitySchema = z.object({
    name: z.string().min(2).max(100),
    amount: z.number().positive().optional(),
    rate: z.number().positive().optional(),
})

router.get('/utility-charges', verifyJwt, requireRole(Role.LANDLORD), utility.getUtilities);
router.post('/utility-charges', verifyJwt, requireRole(Role.LANDLORD), validate(createUtilitySchema), utility.createCharge);
router.patch('/utility-charges/:id', verifyJwt, requireRole(Role.LANDLORD), validate(updateUtilitySchema), utility.updateUtility);
router.patch('/utility-charges/:id/toggle', verifyJwt, requireRole(Role.LANDLORD), utility.toggleCharge);
router.delete('/utility-charges/:id', verifyJwt, requireRole(Role.LANDLORD), utility.deleteUtility);


export default router;