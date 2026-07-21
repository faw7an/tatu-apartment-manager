import { Request, Response, } from 'express';
import { ok, created, unauthorized, conflict, badRequest, notFound } from "../utils/response";
import {prisma} from '../utils/prisma';


// get apartment details
export async function getApartment( req: Request, res: Response): Promise<void> {
    const user = req.user;

    const apartment = await prisma.apartment.findUnique({
        where:{ id : user!.apartmentId!}
    });

    if(!apartment){
        notFound(
            res, "Apartment not found"
        );
        return;
    }

    ok(
        res, apartment
    );
}

export async function updateApartment( req:Request, res:Response): Promise<void>{
    const user = req.user;
    const {name, address} = req.body;

    if(!name && !address){
        badRequest(res, "Update field required");
    };
    
    const existingApartment = await prisma.apartment.findUnique({
        where:{id: user!.apartmentId!}
    });

    if(!existingApartment){
        notFound(res, "Apartment not found");
        return;
    }

    const results = await prisma.apartment.update({
        where:{ id: existingApartment.id},
        data:{
            ...(name&&{name}),
            ...(address&&{address})
        }
    });

    ok(
        res,results, "Apartment details updated successfully"
    );
}