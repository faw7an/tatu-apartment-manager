import { Request, Response, } from 'express';
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";


export async function updateProfile(req: Request, res: Response): Promise<void> {
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
     const user = req.user;
    const { password, confirmPassword } = req.body;

    const existingUser = await prisma.users.findUnique({
        where: { id: user!.userId }
    });

    if (!existingUser) {
        notFound(res, "User not found");
        return;
    }

    if (!password || !confirmPassword) {
        badRequest(res, "Password and confirm password are required")
        return;
    }

    if (password !== confirmPassword) {
        badRequest(res, "Passwords do not match")
        return;
    }

    const existPass = await bcrypt.compare(password, existingUser.passwordHash);

    if (existPass) {
        badRequest(
            res, "New password cannot be the same as your previous password"
        )
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // console.log(existingUser);
    const results = await prisma.users.update({
        where: { id: existingUser.id },
        data: {
            passwordHash
        }
    });

    ok(
        res, "Password changed successfully"
    );
}

