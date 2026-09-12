import { Router } from 'express';
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as subscription from '../controller/subscription.controller';

const router = Router();

const createSubscriptionSchema = z.object({
    name: z.string().min(1).max(100),
    amount: z.number().positive().gt(0, "Amount must be greater than 0"),
    renewalDate: z.coerce.date(),
    alertDaysBefore: z.number().int().positive().default(7),
})

const updateSubscriptionSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    amount: z.number().gt(0, "Amount must be greater than 0").optional(),
    renewalDate: z.coerce.date().optional(),
    alertDaysBefore: z.number().int().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "Atleast one field must be provided to update"
})

// const updateRenewalSchema = z.object({
//     logAsExpense: z.boolean().default(true)
// });


router.get('/subscriptions', verifyJwt, requireRole(Role.LANDLORD), subscription.getSubscriptions);
router.post('/subscriptions', verifyJwt, requireRole(Role.LANDLORD), validate(createSubscriptionSchema), subscription.createSubscription);
router.patch('/subscriptions/:id', verifyJwt, requireRole(Role.LANDLORD), validate(updateSubscriptionSchema), subscription.updateSubscription);
router.patch('/subscriptions/:id/renew', verifyJwt, requireRole(Role.LANDLORD), subscription.updateRenewal);
router.delete('/subscriptions/:id', verifyJwt, requireRole(Role.LANDLORD), subscription.deleteSubscription);


export default router;