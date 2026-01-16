/*
 * About Endpoint Tests
 * Tests the GET /api/about endpoint for developer information.
 */

// Import testing utilities
import request from 'supertest';
import mongoose from 'mongoose';

// Import application utilities
import { createServiceApp } from '../../utils/createServiceApp.js';
import { connectDb } from '../../db.js';
import getMongoUri from '../../config/mongo_conn.js';

// Import routes and config to test
import aboutRoutes from '../../routes/about.routes.js';
import DEVELOPERS from '../../config/developers.js';

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
    // Mount about routes under /api prefix
    app.use('/api', aboutRoutes);
});

// Cleanup after all tests complete
afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
});

// Test suite for GET /api/about endpoint
describe('GET /api/about', () => {
    // Test successful response
    test(
        'should return developer team information',
        async () => {
            // Make GET request to /api/about
            const response = await request(app).get('/api/about');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify response body is an array
            expect(Array.isArray(response.body)).toBe(true);
            // Verify array has correct number of developers
            expect(response.body.length).toBe(DEVELOPERS.length);
        }
    );

    // Test response format
    test(
        'should return array of objects with first_name and last_name',
        async () => {
            // Make GET request to /api/about
            const response = await request(app).get('/api/about');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);

            // Verify each developer object has required fields
            response.body.forEach(developer => {
                // Check for first_name property
                expect(developer).toHaveProperty('first_name');
                // Check for last_name property
                expect(developer).toHaveProperty('last_name');
                // Verify first_name is a string
                expect(typeof developer.first_name).toBe('string');
                // Verify last_name is a string
                expect(typeof developer.last_name).toBe('string');
            });
        }
    );

    // Test no extra fields
    test(
        'should only include first_name and last_name fields',
        async () => {
            // Make GET request to /api/about
            const response = await request(app).get('/api/about');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);

            // Verify each developer has only the required fields
            response.body.forEach(developer => {
                // Get all keys from developer object
                const keys = Object.keys(developer).sort();
                // Verify keys match expected fields exactly
                expect(keys).toEqual(['first_name', 'last_name'].sort());
            });
        }
    );

    // Test expected team members
    test(
        'should include expected team members',
        async () => {
            // Make GET request to /api/about
            const response = await request(app).get('/api/about');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);

            // Build array of full names from response
            const names = response.body.map(developer =>
                `${developer.first_name} ${developer.last_name}`
            );

            // Verify all expected developers are present
            DEVELOPERS.forEach(developer => {
                // Check each developer appears in response
                expect(names).toContain(
                    `${developer.first_name} ${developer.last_name}`
                );
            });
        }
    );
});