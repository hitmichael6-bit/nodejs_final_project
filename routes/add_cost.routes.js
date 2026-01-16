/*
 * Add Cost Routes
 * Handles POST /api/add for creating new cost items.
 * Validates cost data and prevents past-dated entries.
 */
import express from 'express';
// Import Cost model for database operations
import Cost from '../models/cost.model.js';
// Import User model for validation
import User from '../models/user.model.js';
// Import valid categories list
import CATEGORIES from '../config/categories.js';
// Import logging utility
import { logEndpointAccess } from '../utils/logger.js';

// Create Express router
const router = express.Router();

/*
 * POST /add
 * Creates a new cost item with description, category,
 * userid, sum, and optional date.
 */
router.post('/add', async (req, res) => {
    try {
        logEndpointAccess(req, 'Endpoint accessed: POST /api/add (cost)');

        // Extract cost data from request body
        const { description, category, userid, sum, date } =
            req.body || {};

        const descriptionTrimmed = description?.trim();
        const categoryTrimmed = category?.trim()?.toLowerCase();

        // Validate required fields are present
        if (
            !descriptionTrimmed ||
            !categoryTrimmed ||
            typeof userid === 'undefined' ||
            typeof sum === 'undefined'
        ) {
            // Return error for missing fields
            return res.status(400).json({
                id: 400,
                message: 'Missing required fields.'
            });
        }

        // Validate that category is in the list of accepted categories
        if (!CATEGORIES.includes(categoryTrimmed)) {
            // Build error message with valid categories list
            return res.status(400).json({
                id: 400,
                // Construct detailed message with category list
                message:
                    `Category '${categoryTrimmed}' is not in the ` +
                    `list of accepted categories. ` +
                    `The accepted categories are: ` +
                    `${CATEGORIES.join(', ')}.`
            });
        }

        // Convert user ID to number and validate
        const numericUserId = Number(userid);

        // Ensure user ID is a positive integer
        if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
            return res.status(400).json({
                id: 400,
                message: 'User ID must be a positive integer.'
            });
        }

        // Convert sum to number and validate
        const numericSum = Number(sum);

        // Check if sum is null, Infinity, -Infinity, NaN, or negative
        if (
            sum === null ||
            !Number.isFinite(numericSum) ||
            numericSum < 0
        ) {
            // Return error for invalid sum
            return res.status(400).json({
                id: 400,
                message: 'Sum must be a non-negative finite number.'
            });
        }

        // Use provided date or default to current server time
        const requestDate = date ? new Date(date) : new Date();

        // Validate date format
        if (Number.isNaN(requestDate.getTime())) {
            return res.status(400).json({
                id: 400,
                message: 'Invalid date format.'
            });
        }

        /*
         * Prevent past-dated costs:
         * Compare against start of today (00:00:00 server local time).
         */
        const startOfToday = new Date();
        // Set time to midnight
        startOfToday.setHours(0, 0, 0, 0);

        // Reject if cost date is before today
        if (requestDate < startOfToday) {
            return res.status(400).json({
                id: 400,
                message: 'Date cannot be in the past.'
            });
        }

        // Validate that id refers to an existing user
        const userExists = await User.exists({ id: numericUserId });

        // Return error if user not found
        if (!userExists) {
            return res.status(400).json({
                id: 400,
                message: `User ${numericUserId} does not exist.`
            });
        }

        // Create new cost document
        const cost = new Cost({
            description: descriptionTrimmed,
            category: categoryTrimmed,
            userid: numericUserId,
            sum: numericSum,
            // Use validated date
            date: requestDate
        });

        // Save cost to database
        const savedCost = await cost.save();

        // Return created cost with 201 status
        return res.status(201).json(savedCost);
    } catch (err) {
        // Handle any errors
        return res.status(500).json({
            id: 500,
            message: 'Internal server error.'
        });
    }
});

export default router;