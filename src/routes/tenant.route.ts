import { Router } from 'express';
import { z } from 'zod';
import { verifyJwt, requireRole } from '../middleware/auth.middleware';
import { Role } from '../generated/prisma/client';
import { validate } from "../middleware/validate.middleware";
import * as tenant from '../controller/tenant.controller';


const router = Router();

const createTenantSchema = z.object({
    fullName: z.string().min(3).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    roomId: z.string()
})

router.get("/tenants", verifyJwt, requireRole(Role.LANDLORD), tenant.getTenants);
router.get("/tenants/:id", verifyJwt, requireRole(Role.LANDLORD), tenant.getTenantById);
router.post("/tenants", verifyJwt, requireRole(Role.LANDLORD), validate(createTenantSchema), tenant.createTenant);

// delete a tenant
router.delete("/tenants/:id", verifyJwt, requireRole(Role.LANDLORD), tenant.removeTenantById);


// nuke (remove in prod)
router.delete("/tenants", verifyJwt, requireRole(Role.LANDLORD), tenant.deleteTenants);


export default router;