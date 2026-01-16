/*
 * Logger Utility
 * Integrates Pino logging with MongoDB persistence.
 * All logs are written to both console (via Pino) and database.
 */
import pino from 'pino';
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
function saveLogToDb(logDoc) {
    // Create log entry in database
    Log.create(logDoc).catch(err => {
        // Log error if database write fails
        logger.error({ err }, 'Failed to write log to database.');
    });
}

/*
 * Log endpoint access to both Pino and MongoDB.
 * Called at the start of request handlers.
 */
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
