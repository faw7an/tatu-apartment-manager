import { Request, Response } from 'express';
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from "../utils/prisma";
import { addDays } from "../utils/helpers"

export async function getSubscriptions(req: Request, res: Response): Promise<void> {
    const user = req.user;


    const existingSubscription = await prisma.apartmentSubscriptions.findMany({
        where: {
            apartmentId: user!.apartmentId!
        }
    });

    if (existingSubscription.length === 0) {
        notFound(
            res, "No available subscriptions for this apartment"
        );
        return;
    };

    const subs = Array.from(existingSubscription, (_, index) => {
        var sub = existingSubscription[index];
        const daysUntilRenawal = Math.ceil(
            (sub.renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            id: sub.id,
            apartmentId: sub.apartmentId,
            name: sub.name,
            amount: sub.amount,
            renewalDate: sub.renewalDate,
            isExpiringSoon: daysUntilRenawal <= sub.alertDaysBefore,
            alertDaysBefore: sub.alertDaysBefore,
            isActive: sub.isActive,
        }
    })

    ok(
        res, subs
    );
}

export async function createSubscription(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { name, amount, renewalDate, alertDaysBefore } = req.body;

    const existingSub = await prisma.apartmentSubscriptions.findUnique({
        where: {
            apartmentId_name: {
                apartmentId: user!.apartmentId!,
                name: name
            }
        }
    });

    if (existingSub) {
        conflict(
            res, `A subscription named "${name}" already exists for this apartment.`
        );
        return;
    }

    const results = await prisma.apartmentSubscriptions.create({
        data: {
            apartmentId: user!.apartmentId!,
            name,
            renewalDate,
            amount,
            ...(alertDaysBefore && ({ alertDaysBefore }))
        }
    });

    created(
        res, results, "Subscription created successfully"
    );
}

// update subs
export async function updateSubscription(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;
    const { name, amount, alertDaysBefore, renewalDate } = req.body;


    if (!id || typeof id !== 'string') {
        badRequest(
            res, 'Invalid subscription id'
        );
        return;
    }

    // sub exist for specific apartment
    const existingSubscription = await prisma.apartmentSubscriptions.findUnique({
        where: {
            id,
            apartmentId: user!.apartmentId!
        }
    });

    if (!existingSubscription) {
        notFound(
            res, "Subscription not found"
        );
        return;
    }

    const results = await prisma.apartmentSubscriptions.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(amount && { amount }),
            ...(alertDaysBefore && { alertDaysBefore }),
            ...(renewalDate && { renewalDate })
        }
    });

    ok(
        res, results, "Subscription updated sucessfully"
    )
}


// update renewal
export async function updateRenewal(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;
    // const { logAsExpense } = req.body;


    if (!id || typeof id !== 'string') {
        badRequest(
            res, 'Invalid subscription id'
        );
        return;
    }

    // sub exist for specific apartment
    const existingSubscription = await prisma.apartmentSubscriptions.findUnique({
        where: { id }
    });

    if (!existingSubscription) {
        notFound(
            res, "Subscription not found"
        );
        return;
    };

    const renewalDate = addDays(new Date(), 30);

    // console.log(renewalDate);

    const results = await prisma.$transaction(async (tx) => {
        const updateSubscription = await tx.apartmentSubscriptions.update({
            where: {
                id,
                apartmentId: user!.apartmentId!
            },
            data: {
                renewalDate
            }
        });

        const logExpense = await tx.expenses.create({
            data: {
                subscriptionId: id,
                apartmentId: user!.apartmentId!,
                category: updateSubscription.name,
                description: `${updateSubscription.name} renewal`,
                amount: updateSubscription.amount,
                date: new Date()
            }
        });
    });

    ok(
        res, "Subscription renewed successfully"
    );
}


// delete subs
export async function deleteSubscription(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;


    if (!id || typeof id !== 'string') {
        badRequest(
            res, 'Invalid subscription id'
        );
        return;
    }

    // sub exist for specific apartment
    const existingSubscription = await prisma.apartmentSubscriptions.findUnique({
        where: {
            id,
            apartmentId: user!.apartmentId!
        }
    });

    if (!existingSubscription) {
        notFound(
            res, "Subscription not found"
        );
        return;
    };

    await prisma.apartmentSubscriptions.delete({
        where: { id }
    }
    );

    ok(
        res, "Subscription deleted successfully"
    );
}