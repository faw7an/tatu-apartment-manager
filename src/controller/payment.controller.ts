import { Request, Response } from 'express';
import { ok, internalServerError, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from "../utils/prisma";
import { Role, BillStatus, PaymentStatus } from '../generated/prisma/client';
import { getAccessToken, processCallback, initiateStkPush } from '../services/mpesa.service';
import { billTotal } from '../utils/helpers';

export async function stkPush(req: Request, res: Response): Promise<void> {
    try {
        const user = req.user;
        const { billId, phoneNumber } = req.body;


        if (!billId || !phoneNumber) {
            badRequest(
                res,
                "Bill Id and phoneNumber is required.",
            )
            return;
        }



        const existingBill = await prisma.bills.findUnique({
            where: {
                id: billId,
                tenantId: user?.userId
            },
            include: {
                billLineItems: true
            }
        });


        if (!existingBill) {
            notFound(
                res,
                "Bill not found."
            );
            return;
        }

        // console.log("EB",existingBill);

        if (existingBill.status !== BillStatus.UNPAID) {
            conflict(
                res,
                "Bill has already been paid or is under process."
            )
            return
        }

        const totalBill = billTotal(existingBill);

        // console.log(totalBill);

        const pending = await prisma.mpesaTxns.findFirst({
            where: {
                billId,
                status: PaymentStatus.PENDING
            }
        });

        if (pending) {
            conflict(
                res, "A payment is already in progress for this bill."
            );
            return;
        }

        const stk = await initiateStkPush(
            phoneNumber, totalBill, billId, 'string', 'House bill payment',
        );

        // console.log(stk);
        const updateMpesatxn = await prisma.mpesaTxns.create({
            data: {
                billId,
                checkoutRequestId: stk.checkoutRequestId,
                phoneNumber,
                amount: totalBill
            }
        });

        ok(
            res,
            {
                checkoutRequestId: stk.checkoutRequestId
            }
        );
    } catch (err) {
        console.error("STK push failed", err);
        internalServerError(
            res, "Could not start payment try again"
        )
    }
}

export async function test(req: Request, res: Response): Promise<void> {
    const results = await initiateStkPush(
        '254114307530', 3000, 'string', 'string', 'string',
    );

    ok(
        res, results
    );
}

export async function callback(req: Request, res: Response): Promise<void> {
    try {
        await processCallback(req.body);
    } catch (e) {
        console.error('Callback processing failed:', e);
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
} 