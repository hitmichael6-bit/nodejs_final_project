/*
 * About Routes
 * Returns information about the development team.
 * Provides first_name and last_name for each team member.
 */
import express from 'express';
import DEVELOPERS from '../config/developers.js';
import { logEndpointAccess } from '../utils/logger.js';

const router = express.Router();

/*
 * GET /about
 * Returns array of developer objects with first_name and last_name.
 */
router.get('/about', (req, res) => {
    try {
        // Log the endpoint access
        logEndpointAccess(req, 'Endpoint accessed: GET /api/about');

        // Return developers list
        return res.status(200).json(DEVELOPERS);
    } catch (err) {
        // Handle any errors
        return res.status(500).json({
            id: 500,
            message: 'Internal server error.'
        });
    }
});

export default router;