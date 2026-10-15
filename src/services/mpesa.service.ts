import axios from 'axios';
import { prisma } from "../utils/prisma";
import { PaymentStatus, BillStatus } from '../generated/prisma/client';



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

        // console.log(response.data.access_token);

        return response.data.access_token;

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
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    // console.log(password);

    return { password, timestamp };
}

export async function initiateStkPush(
    phone: string,
    amount: number,
    billId: string,
    accountRef: string,
    description: string,
): Promise<{ checkoutRequestId: string, merchantRequestId: string }> {

    const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const formattedPhoneNo = (phone: string): string => {
        if (phone.startsWith('0')) return `254${phone.slice(1)}`
        if (phone.startsWith('+')) return phone.slice(1)
        return phone;
    }

    const accessToken = await getAccessToken();

    const { password, timestamp } = generatePassword();
    const reqBody = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount), // must be whole number
        PartyA: formattedPhoneNo(phone),
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhoneNo(phone),
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: accountRef,
        TransactionDesc: description
    }
    const response = await axios.post(
        url, reqBody, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"

        }
    }
    )


    // console.log("MPESA RESPONSE:");
    // console.log(response.status);
    // console.log(response.data);
    return { checkoutRequestId: response.data.CheckoutRequestID, merchantRequestId: response.data.MerchantRequestID }
}

export async function processCallback(callbackData: any): Promise<void> {
    const stkCallback = callbackData?.Body?.stkCallback

    if (!stkCallback) {
        console.warn('Callback ignored: no stkCallback in body');
        return;
    }

    const { ResultCode, CheckoutRequestID, ResultDesc } = stkCallback;

    const txn = await prisma.mpesaTxns.findUnique({
        where: {
            checkoutRequestId: CheckoutRequestID
        }
    });

    if (!txn) {
        console.log("CheckoutRequestId not found");
        return
    }

    if (txn.status !== PaymentStatus.PENDING) return;

    if (ResultCode !== 0) {
        await prisma.mpesaTxns.update({
            where: {
                checkoutRequestId: CheckoutRequestID
            },
            data: {
                status: PaymentStatus.FAILED
            }
        });
        console.log("Failed to complete payment");
        return;
    }
    
    const mpesaReceiptNumber = stkCallback.CallbackMetadata?.Item?.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;

    console.log(mpesaReceiptNumber);


    const amountPaid = stkCallback.CallbackMetadata?.Item?.find((item: any) => item.Name === "Amount")?.Value;


    // if(amountPaid !== txn.amount){
    //     console.error("Amount mismatch");
    //     return;
    // }


    const bill = await prisma.bills.findUnique({
        where: {
            id: txn.billId
        },
        include: {
            room: true,
        }
    });

    if(!bill) {
        console.log("Bill not found");
        return;
    };

    // console.log(bill.room);

    const updateBilling = await prisma.$transaction(async (tx) => {
        const date = new Date();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const receiptNumber = `RCP-${bill.month.replace('-', '')}-${bill.room.roomNumber}`
        console.log(receiptNumber);

        const updateTxnStatus = await tx.mpesaTxns.update({
            where: {
                checkoutRequestId: CheckoutRequestID
            },
            data: {
                status: PaymentStatus.SUCCESS,
                resultCode: ResultCode,
                resultDesc: ResultDesc,
                mpesaReceiptNumber
            }
        });

        const updateBillStatus = await tx.bills.update({
            where: {
                id: txn.billId
            },
            data: {
                status: BillStatus.PAID,
                mpesaCode: mpesaReceiptNumber,
                paidAt: date,
            }
        })

        const receipt = await tx.receipts.create({
            data: {
                amountPaid,
                billId: txn.billId,
                month:bill.month,
                mpesaCode: mpesaReceiptNumber,
                receiptNumber,
                tenantId: bill.tenantId,
                paidAt: date
            }
        });

    })

    console.log("STK CALLBACK:", stkCallback);

    return;
}


// POST /api/payment/callback HTTP/1.1
// Host: 7bc9-41-90-34-177.ngrok-free.app
// Accept: */*
// Businessshortcode: 174379
// Content-Length: 450
// Content-Type: application/json;charset=UTF-8
// User-Agent: ReactorNetty/1.2.9
// X-Forwarded-For: 196.201.212.69
// X-Forwarded-Host: 7bc9-41-90-34-177.ngrok-free.app
// X-Forwarded-Proto: https

// {
//   "Body": {
//     "stkCallback": {
//       "MerchantRequestID": "07e0-40a2-8aa6-a85c104d97cc565441",
//       "CheckoutRequestID": "ws_CO_061020261110579114307530",
//       "ResultCode": 0,
//       "ResultDesc": "The service request is processed successfully.",
//       "CallbackMetadata": {
//         "Item": [
//           {
//             "Name": "Amount",
//             "Value": 1.0
//           },
//           {
//             "Name": "MpesaReceiptNumber",
//             "Value": "UJ63Y9UTN2"
//           },
//           {
//             "Name": "Balance",
//             "Value": 0.0
//           },
//           {
//             "Name": "TransactionDate",
//             "Value": 20261006111110
//           },
//           {
//             "Name": "PhoneNumber",
//             "Value": 254114307530
//           }
//         ]
//       }
//     }
//   }
// }