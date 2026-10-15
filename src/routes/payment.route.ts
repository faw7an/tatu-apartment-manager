import { Router } from 'express';
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role, NoticeType } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as payment from '../controller/payment.controller';



const router = Router();


router.post('/payment/stk-push', verifyJwt,requireRole(Role.TENANT), payment.stkPush); 
router.get('/payment/status/:checkoutRequestId', verifyJwt,requireRole(Role.TENANT), payment.getPaymentStatus); 
router.post('/payment/callback', payment.callback)

router.post('/payment/test', verifyJwt, payment.test);





export default router;