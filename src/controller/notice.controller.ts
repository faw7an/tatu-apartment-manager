import { Request, Response } from 'express';
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import { prisma } from "../utils/prisma";
import { Role, NoticeType } from '../generated/prisma/client';


export async function getNotices(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const notices = await prisma.notices.findMany({
        where: {
            apartmentId: user!.apartmentId!
        },
        select: {
            type: true,
            title: true,
            body: true,
            tenantId: true,
            noticeReads: true
        }
    });

    if (notices.length === 0) {
        notFound(
            res, "No notices found for this apartment"
        );
        return;
    }

    ok(
        res, notices, "Notice fetched successfully"
    );
}

export async function createNotice(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { tenantId, type, title, body } = req.body;

    let tenantIds: string[] = [];

    if (tenantId) {
        const existingTenant = await prisma.users.findFirst({
            where: {
                id: tenantId,
                apartmentId: user!.apartmentId!,
                role: Role.TENANT
            }, select: {
                id: true
            }
        });

        if (!existingTenant) {
            notFound(
                res, "Tenant not found in your apartment"
            );
            return;
        };

        tenantIds = [existingTenant.id];
    } else {
        // get all tenants id
        const tenants = await prisma.users.findMany({
            where: {
                apartmentId: user!.apartmentId!,
                role: Role.TENANT
            },
            select: {
                id: true
            }
        });

        if (tenants.length === 0) {
            notFound(res, "No tenants found to send notices to");
            return;
        }

        tenantIds = tenants.map(t => t.id);
    }



    const sendNotice = await prisma.notices.createMany({
        data: tenantIds.map(t => ({
            title,
            body,
            type,
            apartmentId: user!.apartmentId!,
            tenantId: t
        }))
    });

    created(
        res, sendNotice, "Notice sent successfully"
    );

}


export async function getMyNotices(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const notices = await prisma.notices.findMany({
        where: {
            tenantId: user!.userId!
        },
        select: {
            id: true,
            tenantId: true,
            type: true,
            title: true,
            body: true,
            noticeReads: {
                where: {
                    tenantId: user!.userId!
                }
            }
        }
    });

    if (notices.length === 0) {
        notFound(
            res, "No available notice for you"
        );
        return;
    }

    const formattedNotice = notices.map((notice) => {
        const { noticeReads, ...noticeData } = notice;

        return {
            ...noticeData,
            isRead: noticeReads.length > 0
        }
    });

    ok(
        res, formattedNotice,
    )
}


export async function markAsRead(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const { id } = req.params;

    if (!id || typeof id !== "string") {
        badRequest(
            res, "Invalid notice Id"
        );
        return;
    }

    const notice = await prisma.notices.findUnique({
        where: {
            id,
            apartmentId: user!.apartmentId!,
            tenantId: user!.userId
        }
    });

    if (!notice) {
        notFound(
            res, "Notice not found"
        );
        return;
    }

    const results = await prisma.noticeRead.upsert({
        where: {
            noticeId_tenantId: {
                noticeId: id,
                tenantId: user!.userId
            }
        },
        update: {},
        create: {
            noticeId: id,
            tenantId: user!.userId,
            readAt: new Date()
        }

    });

    ok(
        res, "Notice read successfully"
    );
}


export async function markAllAsRead(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const unreadNotices = await prisma.notices.findMany({
        where: {
            apartmentId: user!.apartmentId!,
            tenantId: user!.userId,

            noticeReads: {
                none: {
                    tenantId: user!.userId,
                }
            }
        },
    });

    if (unreadNotices.length === 0) {
        notFound(
            res, "No available Notices for this user"
        );
        return;
    };

    const markAllRead = await prisma.noticeRead.createMany({
        data: unreadNotices.map((notice) => ({
            noticeId: notice.id,
            tenantId: user!.userId,
            readAt: new Date()
        })),
        skipDuplicates: true
    });

    ok(
        res, {
        results: markAllRead.count
    }, "All notices marked as read successfully"
    )
}