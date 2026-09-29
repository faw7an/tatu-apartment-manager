import { Request, Response } from 'express';
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from "../utils/prisma";
import { Role, BillStatus  } from '../generated/prisma/client';
import {getAccessToken , initiateStkPush} from '../services/mpesa.service';


export async function stkPush(req: Request, res:Response):Promise<void>{
    const userId = req.user;
    const billId = req.body;

    if(!billId){
        badRequest(
            res,
            "Bill Id is required.",
        )
        return;
    }
    
    const existingBill = await prisma.bills.findUnique({
        where: {
            id: billId,
            userId: userId
        }
    });

    if(!existingBill){
        notFound(
            res,
            "Bill not found."
        );
        return;
    }


    if(existingBill.status!==BillStatus.UNPAID){
        conflict(
            res,
            "Bill has already been paid or is under process."
        )
        return
    }


    ok(
        res,
        "Stk-pushed successfully"
    );
}

export async function test(req:Request , res:Response):Promise<void>{
    const results = initiateStkPush(
          '254708374149', 3000,'string', 'string','string',
    );

    ok(
        res, results
    );
}