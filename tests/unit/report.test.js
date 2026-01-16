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
            const userid = user.id;
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            // Create test costs for current month
            await Cost.create([
                {
                    description: 'Pizza',
                    category: 'food',
                    userid,
                    sum: 50,
                    date: now
                },
                {
                    description: 'Gym',
                    category: 'sports',
                    userid,
                    sum: 100,
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
            expect(response.body).toHaveProperty('userid', userid);
            expect(response.body).toHaveProperty('year', year);
            expect(response.body).toHaveProperty('month', month);
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
            const userid = user.id;
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            // Create education cost for testing
            await Cost.create({
                description: 'Book',
                category: 'education',
                userid,
                sum: 75,
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
            expect(educationObj).toBeDefined();
            expect(educationObj.education).toHaveLength(1);
            expect(educationObj.education[0])
                .toHaveProperty('sum', 75);
            expect(educationObj.education[0])
                .toHaveProperty('description', 'Book');
            expect(educationObj.education[0])
                .toHaveProperty('day');
        }
    );

    /*
     * CRITICAL: Test Computed Design Pattern caching
     * Past month reports should be cached in database
     */
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
            const userid = user.id;
            // Create date 2 months in the past
            const pastDate = new Date();
            pastDate.setMonth(pastDate.getMonth() - 2);
            const year = pastDate.getFullYear();
            const month = pastDate.getMonth() + 1;

            // Create cost for past month
            // (bypass validation using direct insertion)
            await Cost.collection.insertOne(
                {
                    description: 'Old expense',
                    category: 'health',
                    userid,
                    sum: 200,
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
            const userid = user.id;
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            // Create cost for current month
            await Cost.create({
                description: 'Current expense',
                category: 'food',
                userid,
                sum: 30,
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            const userid = user.id;
            const now = new Date();
            const year = now.getFullYear();
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
            const userid = user.id;
            const now = new Date();
            const year = now.getFullYear();
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
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
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe(
                'User ID, year and month must be positive integers.'
            );
        }
    );
});