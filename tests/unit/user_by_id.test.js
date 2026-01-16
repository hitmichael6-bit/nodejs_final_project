/*
 * User By ID Endpoint Tests
 * Tests the GET /api/users/:id endpoint including
 * total costs calculation.
 */

// Import testing utilities
import request from 'supertest';
import mongoose from 'mongoose';

// Import application utilities
import { createServiceApp } from '../../utils/createServiceApp.js';
import { connectDb } from '../../db.js';
import getMongoUri from '../../config/mongo_conn.js';

// Import models and routes to test
import User from '../../models/user.model.js';
import Cost from '../../models/cost.model.js';
import userRoutes from '../../routes/user.routes.js';

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
    // Mount user routes under /api prefix
    app.use('/api', userRoutes);
});

// Cleanup after all tests complete
afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
});

// Setup before each individual test
beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    await Cost.deleteMany({});
});

// Test suite for GET /api/users/:id endpoint
describe('GET /api/users/:id', () => {
    // Test successful retrieval with total costs
    test(
        'should return user with total costs',
        async () => {
            // Define user ID for testing
            const userId = 123;

            // Create test user
            await User.create({
                id: userId,
                first_name: 'John',
                last_name: 'Doe',
                birthday: new Date('1990-01-15')
            });

            // Create multiple costs for this user
            await Cost.create([
                {
                    // First cost item
                    description: 'Food',
                    category: 'food',
                    userid: userId,
                    sum: 50,
                    date: new Date()
                },
                {
                    // Second cost item
                    description: 'Gym',
                    category: 'sports',
                    userid: userId,
                    sum: 100,
                    date: new Date()
                }
            ]);

            // Make GET request to /api/users/:id
            const response = await request(app).get(
                `/api/users/${userId}`
            );

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify user ID is correct
            expect(response.body).toHaveProperty('id', userId);
            // Verify first name is correct
            expect(response.body).toHaveProperty('first_name', 'John');
            // Verify last name is correct
            expect(response.body).toHaveProperty('last_name', 'Doe');
            // Verify total costs sum (50 + 100 = 150)
            expect(response.body).toHaveProperty('total', 150);
        }
    );

    // Test user with no costs
    test(
        'should return total of 0 for user with no costs',
        async () => {
            // Define user ID for testing
            const userId = 456;

            // Create test user without any costs
            await User.create({
                id: userId,
                first_name: 'Jane',
                last_name: 'Smith',
                birthday: new Date('1995-06-20')
            });

            // Make GET request to /api/users/:id
            const response = await request(app).get(
                `/api/users/${userId}`
            );

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify total is 0 when user has no costs
            expect(response.body).toHaveProperty('total', 0);
        }
    );

    // Test non-existent user
    test(
        'should return 404 for non-existent user',
        async () => {
            // Make GET request with non-existent user ID
            const response = await request(app).get(
                '/api/users/999999'
            );

            // Verify status code is 404 Not Found
            expect(response.status).toBe(404);
            // Verify error response has id field
            expect(response.body).toHaveProperty('id', 404);
            // Verify error message is correct
            expect(response.body.message).toBe(
                'User 999999 does not exist.'
            );
        }
    );

    // Test invalid ID format
    test(
        'should return 400 for invalid ID format (string)',
        async () => {
            // Make GET request with string ID
            const response = await request(app).get(
                '/api/users/abc'
            );

            // Verify status code is 400 Bad Request
            expect(response.status).toBe(400);
            // Verify error response has id field
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message is correct
            expect(response.body.message).toBe(
                'User ID must be a positive integer.'
            );
        }
    );

    // Test negative ID
    test(
        'should return 400 for negative ID',
        async () => {
            // Make GET request with negative ID
            const response = await request(app).get('/api/users/-5');

            // Verify status code is 400 Bad Request
            expect(response.status).toBe(400);
            // Verify error response has id field
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message is correct
            expect(response.body.message).toBe(
                'User ID must be a positive integer.'
            );
        }
    );

    // Test zero ID
    test(
        'should return 400 for ID of zero',
        async () => {
            // Make GET request with zero ID
            const response = await request(app).get('/api/users/0');

            // Verify status code is 400 Bad Request
            expect(response.status).toBe(400);
            // Verify error response has id field
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message is correct
            expect(response.body.message).toBe(
                'User ID must be a positive integer.'
            );
        }
    );

    // Test decimal ID
    test(
        'should return 400 for decimal ID',
        async () => {
            // Make GET request with decimal ID
            const response = await request(app).get(
                '/api/users/123.5'
            );

            // Verify status code is 400 Bad Request
            expect(response.status).toBe(400);
            // Verify error response has id field
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message is correct
            expect(response.body.message).toBe(
                'User ID must be a positive integer.'
            );
        }
    );

    // Test correct total calculation
    test(
        'should calculate total correctly for multiple costs',
        async () => {
            // Define user ID for testing
            const userId = 789;

            // Create test user
            await User.create({
                id: userId,
                first_name: 'Bob',
                last_name: 'Johnson',
                birthday: new Date('1988-03-10')
            });

            // Create multiple costs with decimal values
            await Cost.create([
                {
                    // First cost with decimal sum
                    description: 'Item 1',
                    category: 'food',
                    userid: userId,
                    sum: 25.50,
                    date: new Date()
                },
                {
                    // Second cost with decimal sum
                    description: 'Item 2',
                    category: 'health',
                    userid: userId,
                    sum: 100.75,
                    date: new Date()
                },
                {
                    // Third cost with decimal sum
                    description: 'Item 3',
                    category: 'education',
                    userid: userId,
                    sum: 50.25,
                    date: new Date()
                }
            ]);

            // Make GET request to /api/users/:id
            const response = await request(app).get(
                `/api/users/${userId}`
            );

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify total is correct (25.50 + 100.75 + 50.25 = 176.5)
            expect(response.body.total).toBe(176.5);
        }
    );

    // Test response format
    test(
        'should return only first_name, last_name, id, and total',
        async () => {
            // Define user ID for testing
            const userId = 111;

            // Create test user
            await User.create({
                id: userId,
                first_name: 'Alice',
                last_name: 'Williams',
                birthday: new Date('1992-07-05')
            });

            // Make GET request to /api/users/:id
            const response = await request(app).get(
                `/api/users/${userId}`
            );

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify response has only expected fields
            expect(Object.keys(response.body).sort()).toEqual(
                ['first_name', 'id', 'last_name', 'total'].sort()
            );
            // Verify birthday is not included
            expect(response.body).not.toHaveProperty('birthday');
            // Verify MongoDB _id is not included
            expect(response.body).not.toHaveProperty('_id');
        }
    );

    // Test doesn't include other users' costs
    test(
        'should only calculate costs for specified user',
        async () => {
            // Define two different user IDs
            const userId1 = 123;
            const userId2 = 456;

            // Create two test users
            await User.create([
                {
                    // First user
                    id: userId1,
                    first_name: 'User',
                    last_name: 'One',
                    birthday: new Date('1990-01-01')
                },
                {
                    // Second user
                    id: userId2,
                    first_name: 'User',
                    last_name: 'Two',
                    birthday: new Date('1995-01-01')
                }
            ]);

            // Create costs for both users
            await Cost.create([
                {
                    // Cost for user 1
                    description: 'User1 cost',
                    category: 'food',
                    userid: userId1,
                    sum: 50,
                    date: new Date()
                },
                {
                    // Cost for user 2
                    description: 'User2 cost',
                    category: 'food',
                    userid: userId2,
                    sum: 200,
                    date: new Date()
                }
            ]);

            // Make GET request for user 1 only
            const response = await request(app).get(
                `/api/users/${userId1}`
            );

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify total includes only user 1's costs (not user 2's)
            expect(response.body.total).toBe(50);
        }
    );
});