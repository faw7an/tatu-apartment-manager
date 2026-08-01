import { Request, Response } from "express";
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from "../utils/prisma";

export async function generateBills(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { month } = req.body;
    const [year, mon] = month.split("-").map(Number);

    const occupiedRooms = await prisma.rooms.findMany({
        where: {
            isOccupied: true,
            apartmentId: user!.apartmentId!,
        },
        select: {
            id: true,
            apartmentId: true,
            roomNumber: true,
            isOccupied: true,
            rentAmount: true,
            rentDueDate: true,
            tenant: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                }
            }

        }
    });

    // console.log(occupiedRooms);

    const activeUtilityCharges = await prisma.utilityCharges.findMany({
        where: {
            apartmentId: user!.apartmentId!,
            isActive: true
        },
        select: {
            id: true,
            name: true,
            chargeType: true,
            amount: true,
            rate: true,
            isActive: true,
        }
    });

    console.log(activeUtilityCharges);


    const tenantIds = occupiedRooms.map(room => room.tenant!.id).filter((id) => id !== undefined);

    const existingBills = await prisma.bills.findMany({
        where: {
            month,
            tenantId: {
                in: tenantIds
            }
        },
        select: {
            tenantId: true
        }
    });


    const existingTenantIds = new Set(
        existingBills.map(bill => bill.tenantId)
    );

    for (const room of occupiedRooms) {
        if (existingTenantIds.has(room.tenant!.id)) continue;

        const dueDay = room.rentDueDate ?? 5;
        const dueDate = new Date(year, mon, dueDay);

        const { bill, billLineItem } = await prisma.$transaction(async (tx) => {
            const bill = await tx.bills.create({
                data: {
                    roomId: room.id,
                    tenantId: room.tenant!.id,
                    month,
                    rentAmount: room.rentAmount,
                    dueDate
                },
                select: {
                    id: true
                }
            });

            const billLineItem = await tx.billLineItems.createMany({
                data: activeUtilityCharges.map(charge => ({
                    billId: bill.id,
                    name: charge.name,
                    chargeType: charge.chargeType,
                    amount: charge.chargeType === "FIXED" ? charge.amount! : 0,
                    rate: charge.chargeType === "RATE_BASED" ? charge.rate : null,
                    units: charge.chargeType === "RATE_BASED" ? 0 : null
                }))
            });

            return { bill, billLineItem }
        });

        // console.log(`Generating bills for ${room.tenant!.fullName}`);
    }

    created(
        res, "Bills genereated successfully"
    );

}

export async function getBills(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { month } = req.body;

    const bills = await prisma.bills.findMany({
        where: {
            month,
            room: {
                apartmentId: user!.apartmentId!,
            }
        },
        select: {
            id: true,
            rentAmount: true,
            tenant: {
                select: {
                    id: true,
                    fullName: true,
                }
            },
            room: {
                select: {
                    roomNumber: true
                }
            },
            billLineItems: true
        }
    });

    // console.log(bills);

    const billTotal = bills.map(bill => {
        const utilitiesTotalBill = bill.billLineItems.reduce(
            (sum, item) => sum + item.amount,
            0
        );
        const total = bill.rentAmount + utilitiesTotalBill;
        // console.log(total);

        return ({
            ...bill,
            total
        })
    });

    // console.log(billTotal);

    ok(
        res, billTotal, "Bills fetched successfully"
    );
}


export async function updateLineItem(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { units } = req.body;
    const { billId, lineItemId } = req.params


    if (!lineItemId || typeof lineItemId !== 'string') {
        badRequest(res, "Invalid lineItemId");
        return;
    }
    if (!billId || typeof billId !== 'string') {
        badRequest(res, "Invalid billId");
        return;
    }

    const billLineItem = await prisma.billLineItems.findFirst({
        where: {
            id: lineItemId,
            billId: billId
        }
    });

    // console.log(billLineItem);
    if(!billLineItem){
        notFound(
            res,"Bill line item not found"
        )
        return;
    }

    if(billLineItem.chargeType !== "RATE_BASED"){
        conflict(
            res,`Cannot update units on a ${billLineItem.chargeType.toLowerCase()} utility charge. Units can only be updated for rate-based charges.`
        )
        return;
    }

    const results = await prisma.billLineItems.update({
        where: {
            id: lineItemId,
            billId: billId
        },
        data: {
            units,
            amount: units * billLineItem.rate!
        }
    })

    ok(
        res, results,"Line Item updated successfully"
    )
}


export async function sendInvoices(req: Request, res: Response): Promise<void> {

}


export async function getMyBills(req: Request, res: Response): Promise<void> {

}


export async function getCurrentBill(req: Request, res: Response): Promise<void> {

}

