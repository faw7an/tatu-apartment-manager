import { Request, Response } from 'express';
import { ok, created, unauthorized, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from '../utils/prisma';



// get all utils
export async function getUtilities(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const results = await prisma.utilityCharges.findMany({
        where: { apartmentId: user!.apartmentId! }
    });

    if (results.length === 0) {
        notFound(
            res, "No utility charges found for this apartment."
        );
        return;
    }

    ok(
        res, results, "Utility charges retrieved successfully."
    )
}


// create util
export async function createCharge(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { name, amount, rate, chargeType } = req.body;

    const existingUtility = await prisma.utilityCharges.findUnique({
        where: {
            apartmentId_name: {
                apartmentId: user!.apartmentId!,
                name: name
            }
        }
    });

    if (existingUtility) {
        badRequest(
            res, "Utility charge name already in use."
        );
        return;
    }

    const results = await prisma.utilityCharges.create({
        data: {
            apartmentId: user!.apartmentId!,
            name,
            chargeType,
            amount: chargeType === "FIXED" ? amount : null,
            rate: chargeType === "RATE_BASED" ? rate : null
        }
    });

    created(
        res, results, "Utility charge created successfully"
    );
}


// update util
export async function updateUtility(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;
    const { name, amount, rate } = req.body;

    if (typeof id !== "string") {
        badRequest(
            res, "Invalid utility charge id provided."
        );

        return;
    }

    const existingUtility = await prisma.utilityCharges.findFirst({
        where: {
            id,
            apartmentId: user!.apartmentId!,
        }
    });


    if (!existingUtility) {
        notFound(
            res, "Utility not found for this apartment"
        );
        return;
    }

    const results = await prisma.utilityCharges.update({
        where: {
            id,
            apartmentId: user!.apartmentId!
        },
        data: {
            ...(name && { name }),
            ...(amount && { amount }),
            ...(rate && { rate })
        }
    });

    ok(
        res, results, "Utility charge updated successfully"
    );
}


// update util toggle
export async function toggleCharge(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;

    if (typeof id !== "string") {
        badRequest(
            res, "Invalid utility charge id provided."
        );

        return;
    }

    const existingUtility = await prisma.utilityCharges.findFirst({
        where: {
            id,
            apartmentId: user!.apartmentId!,
        }
    });


    if (!existingUtility) {
        notFound(
            res, "Utility not found for this apartment"
        );
        return;
    }

    const results = await prisma.utilityCharges.update({
        where: {
            id,
        },
        data: { 
            isActive: !existingUtility.isActive
        }, 
        select:{
            id:true,
            name:true,
            isActive:true
        }
    });

    ok(
        res, results, "Toggle updated successfully"
    );
}

// delete util
export async function deleteUtility(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const {id} = req.params;

     if (typeof id !== "string") {
        badRequest(
            res, "Invalid utility charge id provided."
        );

        return;
    }

    const existingUtility = await prisma.utilityCharges.findFirst({
        where: {
            id,
            apartmentId: user!.apartmentId!,
        }
    });


    if (!existingUtility) {
        notFound(
            res, "Utility not found for this apartment"
        );
        return;
    }

    await prisma.utilityCharges.delete({
        where:{
            id, 
            apartmentId: user!.apartmentId!,
        }
    });

    ok(
        res,"Utility charge deleted successfully"
    );
}
