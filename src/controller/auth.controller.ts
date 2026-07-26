import { Request, Response, } from 'express';
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { OtpPurpose } from '../generated/prisma/client';
import { JwtPayload } from '../middleware/auth.middleware';
import { ok, created, unauthorized, forbidden, conflict, badRequest, notFound } from "../utils/response";
import jwt from 'jsonwebtoken';
import { addDays, generateOtp, getOtpExpiry } from "../utils/helpers";
import { sendOtpEmail } from '../services/email.service';


function buildPayload(
    user: {
        id: string,
        role: import('../generated/prisma/client').Role,
        apartmentId: string | null,
        roomId: string | null
    }): JwtPayload {
    return {
        userId: user.id,
        role: user.role,
        apartmentId: user.apartmentId,
        roomId: user.roomId
    }
}

function signRefresh(payload: JwtPayload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '15m'
    } as jwt.SignOptions);
}


function signAccess(payload: JwtPayload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    } as jwt.SignOptions);
}

// Register (landlords only) > remove otp (removed)
export async function register(req: Request, res: Response): Promise<void> {
    const { fullName, email, phone, password, apartmentName, apartmentAddress } = req.body;

    const existingLandLord = await prisma.users.findFirst({
        where: { role: "LANDLORD" }
    });

    if (existingLandLord) {
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

    if (existingEmail) {
        conflict(res, "Email already in use");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);


    try {
        const isApartmentNameExist = await prisma.apartment.findUnique({ where: { name: apartmentName } });

        if (isApartmentNameExist) {
            conflict(res, "Apartment with the same name exists");
            return;
        };


        const results = await prisma.$transaction(async (tx) => {

            const apartment = await tx.apartment.create({
                data: {
                    name: apartmentName,
                    address: apartmentAddress
                }
            });

            const otp = generateOtp();
            const otpExpiresAt = getOtpExpiry();
            const otpPurpose = OtpPurpose.EMAIL_VERIFICATION;

            const landlord = await tx.users.create({
                data: {
                    fullName,
                    email,
                    passwordHash,
                    phone,
                    otp,
                    otpExpiresAt,
                    otpPurpose,
                    role: "LANDLORD",
                    apartmentId: apartment.id
                }
            });

            if (landlord) {

            }
            return { apartment, landlord, otp, otpPurpose };
        });


        const emailSent = await sendOtpEmail({ otp: results.otp, to: results.landlord.email, purpose: results.otpPurpose, name: results.landlord.fullName })

        created(
            res,
            {
                user: {
                    id: results.landlord.id,
                    fullName: results.landlord.fullName,
                    email: results.landlord.email,
                    phoneNumber: results.landlord.phone,
                    role: results.landlord.role,
                    apartmentId: results.landlord.apartmentId,
                    // otp: results.landlord.otp,
                    // otpExpiresAt: results.landlord.otpExpiresAt,
                    // otpPurpose: results.landlord.otpPurpose,
                }
            },
            "Registered successfully"
        )

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        badRequest(res, errorMessage)
        return;
    }
}

// login
export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
        notFound(
            res,
            "Invalid credentials"
        );
        return;
    }

    const validUser = await bcrypt.compare(password, user.passwordHash);

    if (!validUser) {
        unauthorized(
            res,
            "Invalid email or password"
        );
        return;
    }

    if (!user.isEmailVerified) {
        forbidden(
            res,
            "Email not verified, please verify email before proceeding"
        );
        return;
    }

    const payload = buildPayload(user);
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    await prisma.refreshTokens.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: addDays(new Date(), 30)
        }
    })

    ok(
        res,
        {
            'accessToken': accessToken,
            'refreshToken': refreshToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                apartmentId: user.apartmentId,
                roomId: user.roomId,
            },
        },
        "Login successfully"
    )
}

// logout
export async function logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (refreshToken) {
        await prisma.refreshTokens.deleteMany({ where: {token:refreshToken} });
    }
    ok(res, null, "Log out Successfully");
}

// refresh
export async function refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        badRequest(
            res,
            "refresh token required",
        );
        return;
    }

    let payload: JwtPayload;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload;

    } catch (e) {
        unauthorized(
            res,
            "Invalid refresh token or expired"
        );
        return;
    }

    const storedToken = await prisma.refreshTokens.findUnique({ where: { token: refreshToken } });

    if (!storedToken || storedToken.expiresAt < new Date()) {

        unauthorized(
            res, "Invalid refresh token or expired"
        );
        return;
    }


    // rotate delete old provide new
    await prisma.refreshTokens.delete({ where: { token: refreshToken } });

    const user = await prisma.users.findUnique({ where: { id: payload.userId } });

    if (!user) {
        notFound(
            res, "User not found"
        );
        return;
    }

    const newPayload = buildPayload(user);
    const newAccessToken = signAccess(newPayload);
    const newRefreshToken = signRefresh(newPayload);

    await prisma.refreshTokens.create({
        data: {
            token: newRefreshToken,
            userId: user.id,
            expiresAt: addDays(new Date(), 30)
        }
    });

    ok(
        res,
        {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }
    )
}

// profile
export async function profile(req: Request, res: Response): Promise<void> {
    const user = req.user;

    const profile = await prisma.users.findUnique({
        where: { id: user!.userId },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            apartmentId: true,
            roomId: true,
            createdAt: true
        }
    });

    if (!profile) {
        notFound(
            res, "User not found"
        );
        return;
    }

    ok(
        res, profile
    )
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
    const { email, otp } = req.body;

    if (!otp || !email) {
        badRequest(res, "Email and Otp required");
        return;
    }
    const existingUser = await prisma.users.findUnique({ where: { email } });


    if (!existingUser) {
        notFound(res, "User not found");
        return;
    }

    if (!existingUser.otp || !existingUser.otpExpiresAt) {
        badRequest(
            res, "No active verification code found"
        )
        return;
    }

    if (otp !== existingUser.otp || new Date() > existingUser.otpExpiresAt || existingUser.otpPurpose !== OtpPurpose.EMAIL_VERIFICATION) {
        badRequest(
            res, "Invalid or expired verification code"
        )
        return;
    }


    const results = await prisma.users.update({
        where: { email },
        data: {
            isEmailVerified: true,
            otp: null,
            otpExpiresAt: null,
            otpPurpose:null
        },
        select: {
            id: true,
            role: true,
            apartmentId: true,
            roomId: true

        }
    });
    // console.log(results);

    const payload = buildPayload(results);
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    await prisma.refreshTokens.create({
        data: {
            userId: results.id,
            token: refreshToken,
            expiresAt: addDays(new Date(), 30)
        }
    })

    ok(
        res,
        { accessToken, refreshToken, user: results },
        "Verified email successfully"
    )


}


// resend email: remove otp (removed)
export async function resendOtp(req: Request, res: Response): Promise<void> {
    const { email, purpose } = req.body;


    if (!purpose || !email) {
        badRequest(res, "Email and purpose required");
        return;
    }
    const existingUser = await prisma.users.findUnique({ where: { email } });


    if (!existingUser) {
        notFound(res, "User not found");
        return;
    }

    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry();

    const results = await prisma.users.update({
        where: { email },
        data: {
            otp,
            otpExpiresAt,
            otpPurpose: purpose
        }
    });

    // console.log(results);

    await sendOtpEmail({ otp: otp, to: existingUser.email, purpose: purpose, name: existingUser.fullName });

    ok(
        res, "Otp resent successfully"
    )
}

// user doesnt remember pass: remove otp (removed)
export async function forgotPass(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
        badRequest(res, "Email required");
        return;
    }

    const existingUser = await prisma.users.findUnique({ where: { email } });


    if (!existingUser) {
        notFound(res, "User not found");
        return;
    }

    const otp = generateOtp();
    const otpExpiresAt = getOtpExpiry();

    const results = await prisma.users.update({
        where: { email },
        data: {
            otp,
            otpExpiresAt,
            otpPurpose: OtpPurpose.PASSWORD_RESET
        }
    });

    await sendOtpEmail({ otp: otp, to: existingUser.email, purpose: OtpPurpose.PASSWORD_RESET, name: existingUser.fullName });

    ok(
        res, "Forgotten password otp sent successfully"
    )
}

// set new pass for forgotten
export async function resetPass(req: Request, res: Response): Promise<void> {
    const { email, otp, password } = req.body;

    if (!email || !otp) {
        badRequest(res, "Email and otp required");
        return;
    }

    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (!existingUser) {
        notFound(res, "User not found");
        return;
    };

    if (!existingUser.otp || !existingUser.otpExpiresAt || existingUser.otpPurpose !== OtpPurpose.PASSWORD_RESET) {
        badRequest(res, "Verification code not found");
        return;
    }

    if (existingUser.otp !== otp || new Date() > existingUser.otpExpiresAt) {
        badRequest(res, "Invalid or expired Otp");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const results = await prisma.users.update({
        where: { email },
        data: {
            passwordHash: passwordHash,
            otp: null,
            otpExpiresAt: null
        }
    });

    await prisma.refreshTokens.deleteMany({
        where: { userId: existingUser.id }
    })

    ok(
        res, "Password changed successfully"
    );
}

// here user remembers pass
// export async function resetPass(req: Request, res: Response): Promise<void> {
//     const user = req.user;
//     const { password, confirmPassword } = req.body;

//     const existingUser = await prisma.users.findUnique({
//         where: { id: user!.userId }
//     });

//     if (!existingUser) {
//         notFound(res, "User not found");
//         return;
//     }

//     if (!password || !confirmPassword) {
//         badRequest(res, "Password and confirm password are required")
//         return;
//     }

//     if (password !== confirmPassword) {
//         badRequest(res, "Passwords do not match")
//         return;
//     }

//     const existPass = await bcrypt.compare(password, existingUser.passwordHash);

//     if (existPass) {
//         badRequest(
//             res, "New password cannot be the same as your previous password"
//         )
//         return;
//     }

//     const passwordHash = await bcrypt.hash(password, 10);

//     // console.log(existingUser);
//     const results = await prisma.users.update({
//         where: { id: existingUser.id },
//         data: {
//             passwordHash
//         }
//     });

//     ok(
//         res, "Password changed successfully"
//     );
// }