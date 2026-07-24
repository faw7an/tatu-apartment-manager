import crypto from 'node:crypto';


export function addDays(date:Date, days:number): Date{
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

// generateOtp()     → returns random 6 digit string e.g "482910"
// getOtpExpiry()    → returns new Date() + 10 minutes

export function generateOtp(): string{
    return crypto.randomInt(10000,100000).toString();
}

export function getOtpExpiry(): Date{
    const currentDate = new Date();
    const minutesToAdd = 10;


    return new Date(currentDate.getTime() + minutesToAdd * 60 * 1000 );
}


// export function verifyOtp(
//     otp: string, otpExpiresAt:string, 
// ) : boolean{

// }