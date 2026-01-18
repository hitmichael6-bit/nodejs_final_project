/*
 * Add User Routes
 * Handles POST /api/add for creating new users.
 * Validates user data before saving to database.
 */
// Import Express framework for routing
import express from 'express';
// Import User model for database operations
import User from '../models/user.model.js';
// Import logging utility for endpoint access tracking
import { logEndpointAccess } from '../utils/logger.js';
const router = express.Router();
/*
 * POST /add
 * Creates a new user with id, first_name, last_name, and birthday.
 */
// Handler for POST requests to /add endpoint
router.post('/add', async (req, res) => {
    try {
        logEndpointAccess(req, 'Endpoint accessed: POST /api/add (user)');

        // Extract user data from request body
        const { id, first_name, last_name, birthday } = req.body || {};

        const firstNameTrimmed = first_name?.trim();
        const lastNameTrimmed = last_name?.trim();

        // Validate required fields are present
        if (
            typeof id === 'undefined' ||
            !firstNameTrimmed ||
            !lastNameTrimmed ||
            typeof birthday === 'undefined'
        ) {
            // Return error for missing fields
            return res.status(400).json({
                id: 400,
                message: 'Missing required fields.'
            });
        }

        // Convert ID to number and validate
        const numericId = Number(id);

        // Ensure ID is a positive integer
        if (!Number.isInteger(numericId) || numericId <= 0) {
            return res.status(400).json({
                id: 400,
                message: 'User ID must be a positive integer.'
            });
        }
        // Parse and validate birthday date
        const birthdayDate = new Date(birthday);

        // Check if date parsing succeeded
        if (Number.isNaN(birthdayDate.getTime())) {
            return res.status(400).json({
                id: 400,
                message: 'Invalid birthday format.'
            });
            // End of birthday format validation
        }
        /*
         * Prevent future birthday dates:
         * Compare against start of today (00:00:00 server local time).
         */
        const startOfToday = new Date();
        // Set time to midnight
        startOfToday.setHours(0, 0, 0, 0);

        // Reject if birthday is after today
        if (birthdayDate > startOfToday) {
            return res.status(400).json({
                id: 400,
                message: 'Birthday cannot be in the future.'
            });
        }
        // Check if a user with the same ID already exists
        const userExists = await User.exists({ id: numericId });

        // Return conflict error if user already exists
        if (userExists) {
            return res.status(409).json({
                id: 409,
                message: `User ${numericId} already exists.`
            });
        }
        // Create new user document
        const user = new User({
            id: numericId,
            first_name: firstNameTrimmed,
            last_name: lastNameTrimmed,
            birthday: birthdayDate
        });
        // Save user to database
        const savedUser = await user.save();

        // Return created user with 201 status
        return res.status(201).json(savedUser);
    } catch (err) {
        // Handle any database or server errors
        return res.status(500).json({
            id: 500,
            message: 'Internal server error.'
        });
    }
});
// Export router for use in main application
export default router;
