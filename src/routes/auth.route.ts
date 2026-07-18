import {z} from "zod";
import {Router} from 'express';
import {validate} from "../middleware/validate";
import * as auth from '../controller/auth.controller';

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
    email:  z.string().email(),
    password:  z.string().min(6)
})

router.post('/register',validate(registerSchema), auth.register);

export default router;