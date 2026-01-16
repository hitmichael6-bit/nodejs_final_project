/*
 * Log Routes
 * Handles GET requests for retrieving HTTP request logs.
 * Logs are sorted by time in descending order (most recent first).
 */
import express from 'express';
import Log from '../models/log.model.js';
import { logEndpointAccess } from '../utils/logger.js';

const router = express.Router();

/*
 * GET /logs
 * Returns all logs from the database.
 * Excludes MongoDB internal fields (_id, __v).
 * Sorted by time descending (newest first).
 */
router.get('/logs', async (req, res) => {
    try {
        // Log the incoming request
        logEndpointAccess(req, 'Endpoint accessed: GET /api/logs');

        // Query database for all logs
        const logs = await Log.find({})
            // Exclude MongoDB internal fields
            .select({ _id: 0, __v: 0 })
            // Sort by timestamp descending
            .sort({ time: -1 })
            // Return plain JavaScript objects
            .lean();

        // Return logs array with 200 status
        return res.status(200).json(logs);
    } catch (err) {
        // Handle any database or server errors
        return res.status(500).json({
            id: 500,
            message: 'Internal server error.'
        });
    }
});

export default router;