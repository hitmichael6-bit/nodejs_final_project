/*
 * Report Endpoint Tests
 * Tests the GET /api/report endpoint including
 * Computed Design Pattern caching.
 */

// Import testing utilities
import request from 'supertest';
import mongoose from 'mongoose';

// Import application utilities
import { createServiceApp } from '../../utils/createServiceApp.js';
import { connectDb } from '../../db.js';
import getMongoUri from '../../config/mongo_conn.js';

// Import models, routes, and config to test
import Cost from '../../models/cost.model.js';
import Report from '../../models/report.model.js';
import User from '../../models/user.model.js';
import reportRoutes from '../../routes/report.routes.js';
import CATEGORIES from '../../config/categories.js';

// App instance for testing
let app;

// Setup before all tests run
beforeAll(async () => {
    // Get MongoDB URI with fallback for local testing
    const mongoUri = getMongoUri() ||
        'mongodb://localhost:27017/cost_manager_test';

    // Connect to test database
    await connectDb(mongoUri);

    // Create Express app with middleware
    app = createServiceApp();
    // Mount report routes under /api prefix
    app.use('/api', reportRoutes);
});

// Cleanup after all tests complete
afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
});

// Setup before each individual test
beforeEach(async () => {
    // Clear all collections before each test
    await Cost.deleteMany({});
    await Report.deleteMany({});
    await User.deleteMany({});
});

describe('GET /api/report', () => {
    // Test successful report generation
    test(
        'should generate report for current month with valid data',
        async () => {
            // Create user first
            const user = await User.create({
                id: 123,
                first_name: 'John',
                last_name: 'Doe',
                birthday: new Date('1990-01-01')
            });
            // Extract user ID for cost creation
            const userid = user.id;
            // Get current date for time-based queries
            const now = new Date();
            // Extract year for report filtering
            const year = now.getFullYear();
            // Extract month (1-indexed) for report filtering
            const month = now.getMonth() + 1;

            // Create test costs for current month
            await Cost.create([
                {
                    // Cost item description
                    description: 'Pizza',
                    // Expense category type
                    category: 'food',
                    // Reference to user who made the expense
                    userid,
                    // Cost amount in currency units
                    sum: 50,
                    // Date when expense occurred
                    date: now
                },
                {
                    // Cost item description
                    description: 'Gym',
                    // Expense category type
                    category: 'sports',
                    // Reference to user who made the expense
                    userid,
                    // Cost amount in currency units
                    sum: 100,
                    // Date when expense occurred
                    date: now
                }
            ]);

            // Make GET request for report
            const response = await request(app).get(
                `/api/report?userid=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify successful response
            expect(response.status).toBe(200);
            // Check userid matches requested user
            expect(response.body).toHaveProperty('userid', userid);
            // Check year matches requested year
            expect(response.body).toHaveProperty('year', year);
            // Check month matches requested month
            expect(response.body).toHaveProperty('month', month);
            // Check costs array is present
            expect(response.body).toHaveProperty('costs');
            // Verify costs is an array
            expect(Array.isArray(response.body.costs)).toBe(true);
        }
    );

    // Test report structure matches requirements
    test(
        'should return report in correct JSON format',
        async () => {
            // Create user first
            const user = await User.create({
                id: 124,
                first_name: 'Jane',
                last_name: 'Smith',
                birthday: new Date('1992-05-15')
            });
            // Extract user ID for cost creation
            const userid = user.id;
            // Get current date for time-based queries
            const now = new Date();
            // Extract year for report filtering
            const year = now.getFullYear();
            // Extract month (1-indexed) for report filtering
            const month = now.getMonth() + 1;

            // Create education cost for testing
            await Cost.create({
                // Cost item description
                description: 'Book',
                // Expense category type
                category: 'education',
                // Reference to user who made the expense
                userid,
                // Cost amount in currency units
                sum: 75,
                // Date when expense occurred
                date: now
            });

            // Request report
            const response = await request(app).get(
                `/api/report?userid=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify 200 response
            expect(response.status).toBe(200);

            // Verify costs is array of objects with category keys
            const costs = response.body.costs;
            expect(Array.isArray(costs)).toBe(true);
            expect(costs.length).toBe(CATEGORIES.length);

            // Each element should be object with single category key
            const educationObj =
                costs.find(obj => 'education' in obj);

            // Verify education category structure
            // Check education category object exists
            expect(educationObj).toBeDefined();
            // Check education array has one item
            expect(educationObj.education).toHaveLength(1);
            // Check sum is 75
            expect(educationObj.education[0])
                .toHaveProperty('sum', 75);
            // Check description is Book
            expect(educationObj.education[0])
                .toHaveProperty('description', 'Book');
            // Check day property exists
            expect(educationObj.education[0])
                .toHaveProperty('day');
        }
        // End of test case
    );

    /*
     * CRITICAL: Test Computed Design Pattern caching
     * Past month reports should be cached in database
     */
    // Begin caching behavior test
    test(
        'should cache past month reports (Computed Pattern)',
        async () => {
            // Create user first
            const user = await User.create({
                id: 456,
                first_name: 'Alice',
                last_name: 'Johnson',
                birthday: new Date('1988-03-20')
            });
            // Extract user ID for cost creation
            const userid = user.id;
            // Get current date to calculate past month
            const pastDate = new Date();
            // Set date to 2 months ago for caching test
            pastDate.setMonth(pastDate.getMonth() - 2);
            // Extract year for report filtering
            const year = pastDate.getFullYear();
            // Extract month (1-indexed) for report filtering
            const month = pastDate.getMonth() + 1;

            // Create cost for past month
            // (bypass validation using direct insertion)
            await Cost.collection.insertOne(
                {
                    // Cost item description
                    description: 'Old expense',
                    // Expense category type
                    category: 'health',
                    // Reference to user who made the expense
                    userid,
                    // Cost amount in currency units
                    sum: 200,
                    // Date when expense occurred
                    date: pastDate
                },
                { bypassDocumentValidation: true }
            );

            // First request - should generate and cache report
            const response1 = await request(app).get(
                `/api/report?userid=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify successful response
            expect(response1.status).toBe(200);

            // Verify report was cached in database
            const cachedReport = await Report.findOne(
                { userid, year, month }
            );

            // Verify cached report exists and is correct
            expect(cachedReport).not.toBeNull();
            expect(cachedReport.userid).toBe(userid);
            expect(cachedReport.year).toBe(year);
            expect(cachedReport.month).toBe(month);

            // Second request - should retrieve from cache
            const response2 = await request(app).get(
                `/api/report?userid=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify cached response is correct
            expect(response2.status).toBe(200);
            expect(response2.body.userid).toBe(userid);

            // Verify only one cached report exists (not duplicated)
            const reportCount = await Report.countDocuments(
                { userid, year, month }
            );

            // Should be exactly 1 report in cache
            expect(reportCount).toBe(1);
        }
    );

    // Test current month is NOT cached
    test(
        'should NOT cache current month reports',
        async () => {
            // Create user first
            const user = await User.create({
                id: 789,
                first_name: 'Bob',
                last_name: 'Williams',
                birthday: new Date('1995-07-10')
            });
            // Extract user ID for cost creation
            const userid = user.id;
            // Get current date for time-based queries
            const now = new Date();
            // Extract year for report filtering
            const year = now.getFullYear();
            // Extract month (1-indexed) for report filtering
            const month = now.getMonth() + 1;

            // Create cost for current month
            await Cost.create({
                // Cost item description
                description: 'Current expense',
                // Expense category type
                category: 'food',
                // Reference to user who made the expense
                userid,
                // Cost amount in currency units
                sum: 30,
                // Date when expense occurred
                date: now
            });

            // Request current month report
            const response = await request(app).get(
                `/api/report?userid=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify successful response
            expect(response.status).toBe(200);

            // Verify report was NOT cached
            const cachedReport = await Report.findOne(
                { userid, year, month }
            );

            // Current month should not be cached
            expect(cachedReport).toBeNull();
        }
    );

    // Test missing required parameters
    test(
        'should return 400 if userid is missing',
        async () => {
            // Request without userid parameter
            const response = await request(app)
                .get('/api/report?year=2025&month=1');

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'Missing required fields.'
            );
        }
    );

    // Test missing year parameter
    test(
        'should return 400 if year is missing',
        async () => {
            // Create user first to ensure we're testing
            // missing year validation
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request without year parameter
            const response = await request(app)
                .get('/api/report?userid=123&month=1');

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'Missing required fields.'
            );
        }
    );

    // Test missing month parameter
    test(
        'should return 400 if month is missing',
        async () => {
            // Create user first to ensure we're testing
            // missing month validation
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request without month parameter
            const response = await request(app)
                .get('/api/report?userid=123&year=2025');

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'Missing required fields.'
            );
        }
    );

    // Test invalid parameter formats
    test(
        'should return 400 if userid is not a number',
        async () => {
            // Request with string userid
            const response = await request(app).get(
                '/api/report?userid=abc&year=2025&month=1'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test invalid year format
    test(
        'should return 400 if year is not a number',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with string year
            const response = await request(app).get(
                '/api/report?userid=123&year=abc&month=1'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test invalid month format
    test(
        'should return 400 if month is not a number',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with string month
            const response = await request(app).get(
                '/api/report?userid=123&year=2025&month=abc'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test negative userid
    test(
        'should return 400 if userid is not a positive integer',
        async () => {
            // Request with negative userid
            const response = await request(app).get(
                '/api/report?userid=-5&year=2025&month=1'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test zero userid
    test(
        'should return 400 if userid is zero',
        async () => {
            // Request with userid=0
            const response = await request(app).get(
                '/api/report?userid=0&year=2025&month=1'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test invalid year value
    test(
        'should return 400 if year is not a positive integer',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with negative year
            const response = await request(app).get(
                '/api/report?userid=123&year=-2025&month=1'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test invalid month value
    test(
        'should return 400 if month is not a positive integer',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with negative month
            const response = await request(app).get(
                '/api/report?userid=123&year=2025&month=-1'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test month out of range
    test(
        'should return 400 if month is greater than 12',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with month=13
            const response = await request(app).get(
                '/api/report?userid=123&year=2025&month=13'
            );

            // Verify 400 error with specific message
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'Month number must be between 1 and 12.'
            );
        }
    );

    // Test non-existent user
    test(
        'should return 400 if user does not exist',
        async () => {
            // Request with non-existent userid
            const response = await request(app).get(
                '/api/report?userid=999999&year=2025&month=1'
            );

            // Verify user not found error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User 999999 does not exist.'
            );
        }
    );

    // Test empty report
    test(
        'should return empty arrays for categories with no costs',
        async () => {
            // Create user first
            const user = await User.create({
                id: 999,
                first_name: 'Charlie',
                last_name: 'Brown',
                birthday: new Date('1993-11-25')
            });
            // Extract user ID for cost creation
            const userid = user.id;
            // Get current date for time-based queries
            const now = new Date();
            // Extract year for report filtering
            const year = now.getFullYear();
            // Extract month (1-indexed) for report filtering
            const month = now.getMonth() + 1;

            // Request report with no costs
            const response = await request(app).get(
                `/api/report?userid=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify 200 response
            expect(response.status).toBe(200);

            // All categories should have empty arrays
            const costs = response.body.costs;
            const foodObj = costs.find(obj => 'food' in obj);
            // Verify food category has an empty array
            expect(foodObj.food).toEqual([]);
        }
    );

    // Test id parameter (alternative to userid)
    test(
        'should accept id parameter instead of userid',
        async () => {
            // Create user first
            const user = await User.create({
                id: 111,
                first_name: 'Diana',
                last_name: 'Prince',
                birthday: new Date('1991-06-18')
            });
            // Extract user ID for cost creation
            const userid = user.id;
            // Get current date for time-based queries
            const now = new Date();
            // Extract year for report filtering
            const year = now.getFullYear();
            // Extract month (1-indexed) for report filtering
            const month = now.getMonth() + 1;

            // Request using 'id' instead of 'userid'
            const response = await request(app).get(
                `/api/report?id=${userid}` +
                `&year=${year}&month=${month}`
            );

            // Verify 'id' parameter works
            expect(response.status).toBe(200);
            expect(response.body.userid).toBe(userid);
        }
    );

    // Test month = 0 (should fail)
    test(
        'should return 400 if month is zero',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with month=0
            const response = await request(app).get(
                '/api/report?userid=123&year=2025&month=0'
            );

            // Verify 400 error
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test very large year (should work)
    test(
        'should accept very large year values',
        async () => {
            // Create user first
            const user = await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with year=9999
            const response = await request(app).get(
                '/api/report?userid=123&year=9999&month=12'
            );

            // Verify large year accepted
            expect(response.status).toBe(200);
            expect(response.body.year).toBe(9999);
            expect(response.body.month).toBe(12);
        }
    );

    // Test decimal year (should fail)
    test(
        'should return 400 for decimal year',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with decimal year
            const response = await request(app).get(
                '/api/report?userid=123&year=2025.5&month=1'
            );

            // Verify 400 error for decimal year
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );

    // Test decimal month (should fail)
    test(
        'should return 400 for decimal month',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Request with decimal month
            const response = await request(app).get(
                '/api/report?userid=123&year=2025&month=6.5'
            );

            // Verify 400 error for decimal month
            expect(response.status).toBe(400);
            // Check error id is 400
            expect(response.body).toHaveProperty('id', 400);
            // Check error message matches expected
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );
});
