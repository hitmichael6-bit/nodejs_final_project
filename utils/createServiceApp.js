/*
 * Service App Factory
 * Creates Express applications with common middleware.
 * Includes JSON body parsing and request/response logging.
 */
import express from 'express';
import bodyParser from 'body-parser';
import { logger, saveLogToDb } from './logger.js';

/*
 * Creates an Express app with middleware configured.
 * Adds body parser and HTTP request logging middleware.
 */
export function createServiceApp() {
    const app = express();

    // Enable JSON body parsing for all requests
    app.use(bodyParser.json());

    /*
     * Logging middleware: tracks all HTTP requests.
     * Measures request duration and logs to both console and database.
     */
    app.use((req, res, next) => {
        // Capture start time using high-resolution timer
        const start = process.hrtime.bigint();

        // Log when response completes
        res.on('finish', () => {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1_000_000;

            // Build log document with request/response details
            const logDoc = {
                time: new Date(),
                method: req.method,
                port: req.socket.localPort,
                path: req.originalUrl,
                status: res.statusCode,
                // Round duration to nearest millisecond
                duration_ms: Math.round(durationMs),
                message: 'HTTP request received.'
            };

            // Log to console and database
            logger.info(logDoc, 'HTTP request received.');
            saveLogToDb(logDoc);
        });

        // Continue to next middleware
        next();
    });

    return app;
}
