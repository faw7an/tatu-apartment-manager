import crypto from 'node:crypto';


export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

// generateOtp()     → returns random 6 digit string e.g "482910"
// getOtpExpiry()    → returns new Date() + 10 minutes

export function generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
}

export function getOtpExpiry(minutes: number = 10): Date {
    const currentDate = new Date();
    const minutesToAdd = minutes;


    return new Date(currentDate.getTime() + minutesToAdd * 60 * 1000);
}


export function billTotal(
    bill: {
        rentAmount: number
        billLineItems: { amount: number }[]
    }
): number {
    return bill.rentAmount + bill.billLineItems.reduce(
        (sum,item)=> sum + item.amount, 0
    );
}


// export function verifyOtp(
//     otp: string, otpExpiresAt:string, 
// ) : boolean{

// }