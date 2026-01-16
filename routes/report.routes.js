/*
 * Report Routes
 * Generates monthly cost reports grouped by category.
 *
 * COMPUTED DESIGN PATTERN IMPLEMENTATION:
 * This route implements the Computed Design Pattern for
 * caching.
 * - Reports for PAST months are cached in the 'reports'
 *   collection
 * - Reports for CURRENT/FUTURE months are computed on-demand
 *   (data may change)
 * - Cached reports are retrieved from database if available
 * - New reports for past months are automatically cached
 *   after generation
 */
import express from 'express';
import Cost from '../models/cost.model.js';
import Report from '../models/report.model.js';
import User from '../models/user.model.js';
import CATEGORIES from '../config/categories.js';
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

const router = express.Router();

/*
 * GET /report
 * Generates a monthly cost report for a specific user.
 * Query params: id (or userid), year, month
 */
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
                    sum: cost.sum,
                    description: cost.description,
                    day: date.getDate()
                });
            }
        }

        // Build report object matching required JSON format
        const report = {
            userid: numericUserId,
            year: numericYear,
            month: numericMonth,
            costs: CATEGORIES.map(cat => ({ [cat]: groupedCats[cat] }))
        };

        /*
         * COMPUTED PATTERN: Cache report for past months
         * Future requests for this month will retrieve from cache
         */
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

export default router;