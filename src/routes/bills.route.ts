import { Router } from "express";
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role, NoticeType } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as bills from '../controller/bills.controller';

const router = Router();

const monthSchema = z.object({
    month: z.string().refine((val) => {
        if (val.length !== 7 || !val.includes("-")) return false;

        const [yearStr, monthStr] = val.split('-');

        const yr = Number(yearStr);
        const month = Number(monthStr);

        if (isNaN(yr) || isNaN(month)) return false;

        return yearStr.length === 4 && month >= 1 && month <= 12;
    }, {
        message: "Month must be in YYYY-MM format (e.g., '2026-08')"
    })
});

const unitSchema = z.object({
    units:z.coerce.number().min(0)
})

router.post('/bills/generate', verifyJwt, requireRole(Role.LANDLORD), validate(monthSchema), bills.generateBills);
router.get('/bills', verifyJwt, requireRole(Role.LANDLORD), validate(monthSchema), bills.getBills);
router.patch('/bills/:billId/line-items/:lineItemId', verifyJwt, requireRole(Role.LANDLORD), validate(unitSchema), bills.updateLineItem);
router.post('/bills/send-invoices', verifyJwt, requireRole(Role.LANDLORD), validate(monthSchema), bills.sendInvoices);

router.get('/bills/mine/current', verifyJwt, requireRole(Role.TENANT), validate(monthSchema), bills.getCurrentBill);
router.get('/bills/mine', verifyJwt, requireRole(Role.TENANT), bills.getMyBills);



export default router;