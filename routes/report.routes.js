/*
 * Report Routes - Generates monthly cost reports grouped by category.
 * Implements the Computed Design Pattern: past month reports are cached,
 * current/future months are computed on-demand. Cached reports are
 * retrieved from database; new past-month reports are auto-cached.
 */
// Import Express framework for routing
import express from 'express';
// Import Cost model for querying cost data
import Cost from '../models/cost.model.js';
// Import Report model for caching reports
import Report from '../models/report.model.js';
// Import User model for user validation
import User from '../models/user.model.js';
// Import valid categories list
import CATEGORIES from '../config/categories.js';
// Import logging utility for endpoint access tracking
import { logEndpointAccess } from '../utils/logger.js';
/*
 * Determines if a given year/month is in the past.
 * Returns true if the month has already ended.
 */
function isPastMonth(year, month) {
    // Get current date
    const now = new Date();
    // Calculate start of current month
    const currentMonthStart =
        new Date(now.getFullYear(), now.getMonth(), 1);
    // Calculate start of target month
    const targetMonthStart = new Date(year, month - 1, 1);
    // Return true if target month has ended
    return targetMonthStart < currentMonthStart;
}

// Create Express router
const router = express.Router();
/*
 * GET /report
 * Generates a monthly cost report for a specific user.
 * Query params: id (or userid), year, month
 */
// Handler for GET requests to /report endpoint
router.get('/report', async (req, res) => {
    try {
        logEndpointAccess(req, 'Endpoint accessed: GET /api/report');

        // Extract and validate query parameters
        const { id, userid, year, month } = req.query;
        // Support both 'id' and 'userid' parameter names
        const userIdValue = userid ?? id;

        // Check all required parameters are present
        if (!userIdValue || !year || !month) {
            return res.status(400).json({
                id: 400,
                message: 'Missing required fields.'
            });
        }
        // Convert parameters to numbers
        const numericUserId = Number(userIdValue);
        const numericYear = Number(year);
        const numericMonth = Number(month);

        // Validate that all parameters are valid numbers
        if (
            !Number.isInteger(numericUserId) || numericUserId <= 0 ||
            !Number.isInteger(numericYear) || numericYear <= 0 ||
            !Number.isInteger(numericMonth) || numericMonth <= 0
        ) {
            // Return error for invalid numeric values
            return res.status(400).json({
                id: 400,
                // Error message for invalid parameter types
                message:
                    'User ID, year and month must be ' +
                    'positive integers.'
            });
        }

        // Validate that month number is valid
        if (numericMonth > 12) {
            return res.status(400).json({
                id: 400,
                message: 'Month number must be between 1 and 12.'
            });
        }
        // Validate that id refers to an existing user
        const userExists = await User.exists({ id: numericUserId });

        // Return error if user doesn't exist
        if (!userExists) {
            return res.status(400).json({
                id: 400,
                message: `User ${numericUserId} does not exist.`
            });
        }
        // Determine if this month is in the past
        const isPastMonthBool = isPastMonth(numericYear, numericMonth);
        /*
         * COMPUTED PATTERN: Check cache for past months
         * If report exists in database, return it immediately
         */
        if (isPastMonthBool) {
            // Query for cached report
            const cachedReport = await Report.findOne({
                userid: numericUserId,
                year: numericYear,
                month: numericMonth
            });

            // Return cached report if found
            if (cachedReport) {
                return res.status(200).json(cachedReport);
            }
            // End of cache lookup block
        }
        /*
         * Report not in cache (or not a past month)
         * Generate report by querying all costs for this user
         */
        // Initialize empty arrays for each category
        const groupedCats =
            Object.fromEntries(CATEGORIES.map(cat => [cat, []]));

        // Retrieve all costs for this user
        const costs = await Cost.find({ userid: numericUserId });

        // Filter costs by year/month and group by category
        for (const cost of costs) {
            const date = new Date(cost.date);

            // Check if cost is in target month
            if (
                date.getFullYear() === numericYear &&
                (date.getMonth() + 1) === numericMonth
            ) {
                // Add cost to appropriate category
                groupedCats[cost.category]?.push({
                    // Cost amount
                    sum: cost.sum,
                    // Cost description text
                    description: cost.description,
                    // Day of month extracted from date
                    day: date.getDate()
                });
            }
        }

        // Build report object matching required JSON format
        const report = {
            // User identifier
            userid: numericUserId,
            // Report year
            year: numericYear,
            // Report month
            month: numericMonth,
            // Costs grouped by category
            costs: CATEGORIES.map(cat => ({ [cat]: groupedCats[cat] }))
        };
        /*
         * COMPUTED PATTERN: Cache report for past months
         * Future requests for this month will retrieve from cache
         */
        // Only cache reports for past months
        if (isPastMonthBool) {
            // Save report to database for caching
            await Report.create(report);
        }

        // Return generated report
        return res.status(200).json(report);
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
