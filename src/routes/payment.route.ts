import { Router } from 'express';
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role, NoticeType } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as payment from '../controller/payment.controller';



const router = Router();


router.post('/payment/stk-push', verifyJwt, payment.stkPush); //  requireRole(Role.TENANT)
router.post('/payment/test', verifyJwt, payment.test);
router.post('/payment/callback', payment.callback)





export default router;