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

const resetForgottenSchema = z.object({
    email: z.string().email(),
    otp:z.string().min(1).max(6),
    password: z.string().min(6)
})

const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1)
})
router.post('/register', validate(registerSchema), auth.register);
router.post('/verify-email', auth.verifyEmail);

router.post('/resend-otp', auth.resendOtp);
router.post('/forgot-password', auth.forgotPass);
router.post('/reset-forgotten-password',validate(resetForgottenSchema), auth.resetForgottenPass);
router.post('/reset-password',verifyJwt, auth.resetPass);



router.post('/login', validate(loginSchema), auth.login);
router.post('/refresh', validate(refreshTokenSchema), auth.refresh);
router.post('/logout', auth.logout);
router.get('/profile',verifyJwt, auth.profile);




export default router;