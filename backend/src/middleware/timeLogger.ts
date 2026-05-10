import { Request, Response, NextFunction } from 'express';

export const timeLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    
    // Listen for the response to finish
    res.on('finish', () => {
        const duration = performance.now() - start;
        console.log(`[PERF] ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
    });

    next();
};
