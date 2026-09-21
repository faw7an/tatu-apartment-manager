import axios from 'axios';
import { error } from 'node:console';
import { base64 } from 'zod';


export async function getAccessToken() {
    try {
        const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
        const OAuthKey = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');

        const response = await axios.get(
            url, {
            headers: {
                Authorization: `Basic ${OAuthKey}`
            }
        }
        );

        console.log(response);

        // return access

    } catch (error) {
        if (axios.isAxiosError(error)) {
            // TypeScript now safely knows 'error' has a .response and .message
            console.error('Axios API Error:', error.response?.data || error.message);
        }
        // 2. Check if it's a standard JavaScript Error
        else if (error instanceof Error) {
            console.error('General Error:', error.message);
        }
        // 3. Fallback for anything else
        else {
            console.error('An unknown error occurred:', String(error));
        }
    }
}

export function generatePassword() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');

    console.log(password);

    return { password, timestamp };
}

export async function initiateStkPush(
    phone: string,
    amount: number,
    billId: string,
    accountRef: string,
    description: string,
)
    : Promise<{ checkoutRequestId: string, merchantRequestId: string }> {

    const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const formattedPhoneNo = (phone: string): string => {
        if (phone.startsWith('0')) return `254${phone.slice(1)}`
        if (phone.startsWith('+')) return phone.slice(1)
        return phone;
    }

    const { password, timestamp } = generatePassword();
    const reqBody = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount), // must be whole number
        PartyA: formattedPhoneNo,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhoneNo,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: accountRef,
        TransactionDesc: description
    }
    const response = axios.post(
        url, reqBody
    )

    console.log(response);
    // return 
    return { checkoutRequestId: 'string', merchantRequestId: 'string' }
}



