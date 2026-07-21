import { resend } from '../utils/mailer';
import { OtpPurpose } from '../generated/prisma/client';

interface OtpParams {
    to: string
    otp: string
    purpose: string
    name: string
}

// Add logo later
export async function sendOtpEmail({ otp, to, purpose, name }: OtpParams): Promise<boolean> {
    try {

        const emailPurpose: string = purpose === OtpPurpose.EMAIL_VERIFICATION ? "email verification" : "password reset";

        const title = `Verification Code for ${emailPurpose}`;
        const subtitle = `Use the code below to complete your request for ${emailPurpose}.`;
        let helpText = "Need help with your account? Contact our support team.";

        
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_EMAIL!,
            // to: [to],
            to: [process.env.TEMP_EMAIL!],
            subject: `Otp code for ${emailPurpose}`,
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Tatu — Verification Code</title>
            </head>
            <body style="margin:0;padding:0;background:#0d0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 16px;">
                <tr>
                <td align="center">

                    <!-- Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1b1e26;border-radius:20px;border:1px solid #2a2f40;overflow:hidden;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding:36px 40px 28px;border-bottom:1px solid #2a2f40;">
                        <table cellpadding="0" cellspacing="0">
                            <tr>
                            <td style="background:#1de88c14;border:1.5px solid #1de88c30;border-radius:14px;padding:10px 18px;">                            
                                <span style="font-size:22px;font-weight:800;color:#f0ede8;letter-spacing:-0.5px;">Tatu</span>
                            </td>
                            </tr>
                        </table>
                        <p style="margin:16px 0 0;font-size:13px;color:#6e6e6e;letter-spacing:0.05em;text-transform:uppercase;">Apartment Management</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                       <p style="font-size: clamp(11px, 2vw, 13px); color: #888888; font-weight: 500; margin-bottom: 8px; letter-spacing: 0.02em;">hi ${name}! </p>

                        <!-- Title -->
                        <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#f0ede8;line-height:1.3;">
                            ${title}
                        </h1>

                        <!-- Subtitle -->
                        <p style="margin:0 0 28px;font-size:14px;color:#8a8a9a;line-height:1.6;">
                            ${subtitle}
                        </p>

                        <!-- OTP Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                            <tr>
                            <td align="center" style="background:#111318;border:1.5px solid #2a2f40;border-radius:16px;padding:28px;">
                                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#6e6e6e;text-transform:uppercase;letter-spacing:0.1em;">Your verification code</p>
                                <p style="margin:0;font-size:42px;font-weight:800;color:#1de88c;letter-spacing:10px;font-variant-numeric:tabular-nums;">
                                ${otp}
                                </p>
                                <p style="margin:12px 0 0;font-size:12px;color:#6e6e6e;">
                                Expires in <strong style="color:#f5a623;">10 minutes</strong>
                                </p>
                            </td>
                            </tr>
                        </table>

                        <!-- Warning -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                            <tr>
                            <td style="background:#f5a62310;border:1px solid #f5a62325;border-radius:12px;padding:14px 16px;">
                                <p style="margin:0;font-size:12px;color:#c8a96e;line-height:1.6;">
                                    <strong>Never share this code</strong> with anyone. Tatu staff will never ask for your OTP.
                                </p>
                            </td>
                            </tr>
                        </table>

                        <!-- Divider -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                            <tr>
                            <td style="border-top:1px solid #2a2f40;"></td>
                            </tr>
                        </table>

                        <!-- Help text -->
                        <div style="margin:0;font-size:13px;color:#6e6e6e;line-height:1.6;">
                            <p> ${helpText}</p>
                            <p>If you didn't request this, you can safely ignore this email.</p>                            
                        </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px 40px 28px;border-top:1px solid #2a2f40;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                            <td>
                                <p style="margin:0;font-size:11px;color:#4a4a5a;line-height:1.6;">
                                © 2025 Tatu Apartment Management. This is an automated email — please do not reply.
                                </p>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>

                    </table>
                    <!-- End Card -->

                </td>
                </tr>
            </table>

            </body>
            </html>`
        });

        if (error) {
            console.error('Failed to send Otp', error);
            return false;
        };

        console.log("OTP sent successfully. MessageID", data?.id);
        return true;
    } catch (e) {
        console.error('Unexpected error while sending OTP email:', e);
        return false;
    }
}