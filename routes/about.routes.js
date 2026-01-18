/*
 * About Routes
 * Returns information about the development team.
 * Provides first_name and last_name for each team member.
 */
// Web framework for creating HTTP routes and middleware
import express from 'express';
// Array of developer objects containing team member information
import DEVELOPERS from '../config/developers.js';
// Function to log HTTP request details to console and database
import { logEndpointAccess } from '../utils/logger.js';

// Create a new Express router instance for about routes
const router = express.Router();

/*
 * GET /about
 * Returns array of developer objects with first_name and last_name.
 */
// Handler for GET requests to /about endpoint
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
            // Generic error message returned to client
            message: 'Internal server error.'
        });
    }
});

// Export router for use in main application
export default router;
