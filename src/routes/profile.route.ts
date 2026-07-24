import {z} from "zod";
import { Router } from 'express';
import { validate } from "../middleware/validate.middleware";
import { verifyJwt , requireRole} from '../middleware/auth.middleware';
import * as profile from '../controller/profile.controller';


const router = Router();

router.post('/profile/password',verifyJwt, profile.updatePassword);

export default router;

