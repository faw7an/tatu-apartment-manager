import type { Response } from 'express';


// 200
export const ok = (
    res: Response,
    data: unknown,
    message?: string
) => res.status(200).json({
    success: true,
    message: message ?? "OK",
    data
});



// 201
export const created = (
    res: Response,
    data: unknown,
    message?: string
) => res.status(201).json({
    success: true,
    message: message ?? "Created successfully",
    data
});




// 204
export const noContent = (
    res: Response
) => res.status(204).send();



// 400
export const badRequest = (
    res: Response,
    message: String,
    error?: unknown
) => res.status(400).json({
    success: false,
    message,
    error
})



// 401
export const unauthorized = (
    res: Response,
    message: "Unauthorised"
) => res.status(401).json({
    success: false,
    message
})



// 403
export const forbidden = (
    res: Response,
    message: "Forbidden"
) => res.status(403).json({
    success: false,
    message
})

// 404
export const notFound = (
    res: Response,
    message: "Not found"
) => res.status(404).json({
    success: false,
    message
})


// 409
export const conflict = (
    res:Response,
    message:String
) => res.status(409).json({
    success: false,
    message
})


// 500
export const internalServerError = (
    res:Response,
    message: "Internal Server Error",
) => res.status(500).json({
    success: false,
    message
})
