/*
 * Logger Utility
 * Integrates Pino logging with MongoDB persistence.
 * All logs are written to both console (via Pino) and database.
 */
// Fast, low-overhead JSON logger for Node.js
import pino from 'pino';
// Mongoose model for persisting logs to MongoDB
import Log from '../models/log.model.js';

// Create Pino logger instance with configurable level
const logger = pino({
    // Use LOG_LEVEL env variable or default to 'info'
    level: process.env.LOG_LEVEL || 'info'
});
/*
 * Save a log document to MongoDB asynchronously.
 * Errors during save are logged but don't block execution.
 */
// Persists log entry to database without awaiting completion
function saveLogToDb(logDoc) {
    // Create log entry in database
    Log.create(logDoc).catch(err => {
        // Log error if database write fails
        logger.error(
            // Include error object for structured logging
            { err },
            // User-friendly message describing the failure
            'Failed to write log to database.'
        );
        // End of error handler for database write failure
    });
}
/*
 * Log endpoint access to both Pino and MongoDB.
 * Called at the start of request handlers.
 */
// Logs HTTP request details to console and database
function logEndpointAccess(req, message) {
    // Endpoint-access logs run at handler start,
    // so status/duration aren't known yet.
    const logDoc = {
        time: new Date(),
        method: req.method,
        // Use optional chaining in case socket not available
        port: req.socket?.localPort || null,
        path: req.originalUrl,
        message
    };

    // Log to console via Pino
    logger.info(logDoc, message);

    // Persist to MongoDB asynchronously
    saveLogToDb(logDoc);
}

export { logger, saveLogToDb, logEndpointAccess };
