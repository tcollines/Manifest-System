import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
    // Attach a unique correlation ID to every incoming request
    (req as any).requestId = randomUUID();
    next();
};
