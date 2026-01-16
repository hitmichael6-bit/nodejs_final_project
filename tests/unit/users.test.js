/*
 * Users List Endpoint Tests
 * Tests the GET /api/users endpoint.
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
import userRoutes from '../../routes/user.routes.js';

// App instance for testing
let app;

// Setup before all tests run
beforeAll(async () => {
    // Get MongoDB URI with fallback for local testing
    const mongoUri =
        getMongoUri() || 'mongodb://localhost:27017/cost_manager_test';

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
    // Clear users collection before each test
    await User.deleteMany({});
});

// Test suite for GET /api/users endpoint
describe('GET /api/users', () => {
    // Test successful retrieval
    test(
        'should return all users',
        async () => {
            // Create test users in database
            await User.create([
                {
                    // First test user
                    id: 1,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: new Date('1990-01-15')
                },
                {
                    // Second test user
                    id: 2,
                    first_name: 'Jane',
                    last_name: 'Smith',
                    birthday: new Date('1995-06-20')
                }
            ]);

            // Make GET request to /api/users
            const response = await request(app).get('/api/users');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify response body is an array
            expect(Array.isArray(response.body)).toBe(true);
            // Verify we got both users back
            expect(response.body).toHaveLength(2);
        }
    );

    // Test empty list
    test(
        'should return empty array when no users exist',
        async () => {
            // Make GET request to /api/users without creating any users
            const response = await request(app).get('/api/users');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify response body is an array
            expect(Array.isArray(response.body)).toBe(true);
            // Verify array is empty
            expect(response.body).toHaveLength(0);
        }
    );

    // Test response excludes MongoDB fields
    test(
        'should not include _id and __v fields',
        async () => {
            // Create a test user
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('2000-01-01')
            });

            // Make GET request to /api/users
            const response = await request(app).get('/api/users');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify MongoDB _id field is not present
            expect(response.body[0]).not.toHaveProperty('_id');
            // Verify MongoDB __v field is not present
            expect(response.body[0]).not.toHaveProperty('__v');
        }
    );

    // Test response includes required fields
    test(
        'should include id, first_name, last_name, birthday',
        async () => {
            // Create a test user with all fields
            await User.create({
                id: 456,
                first_name: 'Alice',
                last_name: 'Johnson',
                birthday: new Date('1988-12-25')
            });

            // Make GET request to /api/users
            const response = await request(app).get('/api/users');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify id field is present and correct
            expect(response.body[0]).toHaveProperty('id', 456);
            // Verify first_name field is present and correct
            expect(response.body[0])
                .toHaveProperty('first_name', 'Alice');
            // Verify last_name field is present and correct
            expect(response.body[0])
                .toHaveProperty('last_name', 'Johnson');
            // Verify birthday field is present
            expect(response.body[0]).toHaveProperty('birthday');
        }
    );
});
