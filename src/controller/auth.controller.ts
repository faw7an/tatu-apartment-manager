import { Request, Response, } from 'express';
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { ok, created, unauthorized, conflict, badRequest, notFound } from "../utils/response";


// Register (landlords only)
export async function register(req: Request, res: Response): Promise<void> {
    const { fullName, email, phone, password, apartmentName, apartmentAddress } = req.body;

    const existingLandLord = await prisma.users.findFirst({
        where: {role: "LANDLORD"}
    });

    if(existingLandLord) {
         conflict(
            res,
            "A Landlord already exists for this deployment"
         );
         return;
    }

    const existingEmail = await prisma.users.findFirst({
        where: {
            email: email
        }
    });

    if(existingEmail){
        conflict( res, "Email already in use");
        return;
    }
    
    const passwordHash = await bcrypt.hash(password , 10);


    const results = await prisma.$transaction(async (tx) => {
        const apartment = await tx.apartment.create({
            data:{
                name:apartmentName,
                address:apartmentAddress
            }
        });

        const landlord = await tx.users.create({
            data:{
                fullName,
                email,
                passwordHash,
                phone,
                role:"LANDLORD",
                apartmentId: apartment.id
            }
        });
        return {apartment , landlord};
    });

    created(
        res,
        {
            user:{
                id: results.landlord.id,
                fullName: results.landlord.fullName,
                email: results.landlord.email,
                phoneNumber: results.landlord.phone,
                role: results.landlord.role,
                apartmentId: results.landlord.apartmentId,

            }
        },
        "Registered successfully"
    );

};