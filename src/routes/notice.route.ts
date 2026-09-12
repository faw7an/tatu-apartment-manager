import { Router } from 'express';
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role, NoticeType } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as notice from '../controller/notice.controller';


const router = Router();


const createNoticeSchema = z.object({
    tenantId: z.string().min(10).optional(),
    type: z.preprocess(
        (val) => typeof val === 'string' ? val.toUpperCase() : val
        , z.enum(NoticeType)),
    title: z.string().min(3).max(200),
    body: z.string().min(1).max(200)
})

router.get('/notices', verifyJwt, requireRole(Role.LANDLORD), notice.getNotices);
router.post('/notices', verifyJwt, requireRole(Role.LANDLORD), validate(createNoticeSchema), notice.createNotice);

router.get('/notices/mine', verifyJwt, requireRole(Role.TENANT), notice.getMyNotices);
router.post('/notices/read-all', verifyJwt, requireRole(Role.TENANT), notice.markAllAsRead);
router.post('/notices/:id/read', verifyJwt, requireRole(Role.TENANT), notice.markAsRead);



export default router;