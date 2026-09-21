import { Router } from 'express';
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role, NoticeType } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as notice from '../controller/notice.controller';



const router = Router();


// router.get('/notices', verifyJwt, requireRole(Role.LANDLORD), notice.getNotices);
router.post('/payment/stk-push', verifyJwt, requireRole(Role.TENANT), );





export default router;