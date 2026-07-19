import { z } from "zod";
import { Router } from 'express';
import { validate } from "../middleware/validate";
import * as auth from '../controller/auth.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const router = Router();

const registerSchema = z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    password: z.string().min(6),
    apartmentName: z.string().min(2).max(100),
    apartmentAddress: z.string().min(2).max(200),
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1)
})
router.post('/auth/register', validate(registerSchema), auth.register);
router.post('/auth/refresh', validate(refreshTokenSchema), auth.refresh);
router.post('/auth/login', validate(loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/profile',verifyJwt, auth.profile);




export default router;