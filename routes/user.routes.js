/*
 * User Routes
 * Handles GET requests for retrieving user information.
 * Includes total cost calculation for individual users.
 */
import express from 'express';
import User from '../models/user.model.js';
import Cost from '../models/cost.model.js';
import { logEndpointAccess } from '../utils/logger.js';

const router = express.Router();

/*
 * GET /users
 * Returns all users from the database.
 * Excludes MongoDB internal fields (_id, __v).
 */
router.get('/users', async (req, res) => {
    // Log incoming request
    logEndpointAccess(req, 'Endpoint accessed: GET /api/users');

    try {
        // Query all users from database
        const users = await User.find({})
            // Exclude internal MongoDB fields
            .select({ _id: 0, __v: 0 })
            // Convert to plain JavaScript objects
            .lean();

        // Return users array
        return res.status(200).json(users);
    } catch (err) {
        // Handle any database or server errors
        return res.status(500).json({
            id: 500,
            message: 'Internal server error.'
        });
    }
});

/*
 * GET /users/:id
 * Returns a specific user with their total costs.
 * Uses MongoDB aggregation to calculate the sum of all costs.
 */
router.get('/users/:id', async (req, res) => {
    try {
        logEndpointAccess(
            req,
            `Endpoint accessed: GET /api/users/${req.params.id}`
        );

        // Validate and convert user ID to number
        const id = Number(req.params.id);

        // Ensure ID is a positive integer
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                id: 400,
                message: 'User ID must be a positive integer.'
            });
        }

        // Find user by ID
        const user = await User.findOne({ id }).lean();

        // Return 404 if user not found
        if (!user) {
            return res.status(404).json({
                id: 404,
                message: `User ${id} does not exist.`
            });
        }

        /*
         * Calculate total costs using MongoDB aggregation.
         * Sums all cost amounts for this user.
         */
        const agg = await Cost.aggregate([
            // Match costs for this user
            { $match: { userid: id } },
            // Group and sum all cost amounts
            { $group: { _id: '$userid', total: { $sum: '$sum' } } }
        ]);

        // Extract total from aggregation result
        const total = agg.length ? agg[0].total : 0;

        // Build response object with user info and total
        const userObj = {
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            total
        };

        // Return user object with total costs
        return res.status(200).json(userObj);
    } catch (err) {
        // Handle any database or server errors
        return res.status(500).json({
            id: 500,
            message: 'Internal server error.'
        });
    }
});

export default router;