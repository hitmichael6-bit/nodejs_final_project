/*
 * Logs Endpoint Tests
 * Tests the GET /api/logs endpoint.
 */

// Import testing utilities
import request from 'supertest';
import mongoose from 'mongoose';

// Import application utilities
import { createServiceApp } from '../../utils/createServiceApp.js';
import { connectDb } from '../../db.js';
import getMongoUri from '../../config/mongo_conn.js';

// Import models and routes to test
import Log from '../../models/log.model.js';
import logRoutes from '../../routes/log.routes.js';

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
    // Mount log routes under /api prefix
    app.use('/api', logRoutes);
});

// Cleanup after all tests complete
afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
});

// Setup before each individual test
beforeEach(async () => {
    // Clear logs collection before each test
    await Log.deleteMany({});
});

// Test suite for GET /api/logs endpoint
describe('GET /api/logs', () => {
    // Test successful retrieval
    test(
        'should return all logs',
        async () => {
            // Create test logs in database
            await Log.create([
                {
                    // Timestamp of the log entry
                    time: new Date(),
                    // HTTP method used
                    method: 'GET',
                    // Server port number
                    port: 3001,
                    // Request path
                    path: '/api/test',
                    // HTTP response status code
                    status: 200,
                    // Request duration in milliseconds
                    duration_ms: 50,
                    // Log message description
                    message: 'Test log 1'
                },
                {
                    // Timestamp of the log entry
                    time: new Date(),
                    // HTTP method used
                    method: 'POST',
                    // Server port number
                    port: 3002,
                    // Request path
                    path: '/api/add',
                    // HTTP response status code
                    status: 201,
                    // Request duration in milliseconds
                    duration_ms: 100,
                    // Log message description
                    message: 'Test log 2'
                }
            ]);

            // Make GET request to /api/logs
            const response = await request(app).get('/api/logs');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify response body is an array
            expect(Array.isArray(response.body)).toBe(true);

            // Filter for our test logs (ignoring logs from request)
            const testLogs = response.body.filter(log =>
                log.message &&
                ['Test log 1', 'Test log 2'].includes(log.message)
            );

            // Verify we got both test logs back
            expect(testLogs.length).toBe(2);
        }
    );

    // Test empty logs
    test(
        'should return empty array when no logs exist',
        async () => {
            // Extra safety: ensure DB is truly clean before request.
            // This catches race conditions from other test files.
            await Log.deleteMany({});

            // Make GET request to /api/logs
            const response = await request(app).get('/api/logs');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify response body is an array
            expect(Array.isArray(response.body)).toBe(true);

            // The request itself may create a log entry
            // asynchronously, so we accept either 0 (log not yet
            // written) or 1 (log written from this request)
            expect(response.body.length).toBeLessThanOrEqual(1);

            // If logs exist, ALL must be from THIS request
            response.body.forEach(log => {
                // Verify path is from this request
                expect(log.path).toBe('/api/logs');
                // Verify method is GET
                expect(log.method).toBe('GET');
            });
        }
    );

    // Test logs are sorted by time descending
    test(
        'should return logs sorted by time (newest first)',
        async () => {
            // Create three different timestamps
            // for testing sort order
            const time1 = new Date('2025-01-01T10:00:00Z');
            const time2 = new Date('2025-01-01T12:00:00Z');
            const time3 = new Date('2025-01-01T11:00:00Z');

            // Create logs with different timestamps (not in order)
            await Log.create([
                {
                    // Oldest log (10:00)
                    time: time1,
                    // HTTP method used
                    method: 'GET',
                    // Server port number
                    port: 3001,
                    // Request path
                    path: '/1',
                    // Log message description
                    message: 'Log 1'
                },
                {
                    // Newest log (12:00)
                    time: time2,
                    // HTTP method used
                    method: 'GET',
                    // Server port number
                    port: 3001,
                    // Request path
                    path: '/2',
                    // Log message description
                    message: 'Log 2'
                },
                {
                    // Middle log (11:00)
                    time: time3,
                    // HTTP method used
                    method: 'GET',
                    // Server port number
                    port: 3001,
                    // Request path
                    path: '/3',
                    // Log message description
                    message: 'Log 3'
                }
            ]);

            // Make GET request to /api/logs
            const response = await request(app).get('/api/logs');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);
            // Verify we have at least 3 logs
            expect(response.body.length).toBeGreaterThanOrEqual(3);

            // Find our test logs
            // (might have logs from the request itself)
            const testLogs = response.body.filter(log =>
                log.message &&
                ['Log 1', 'Log 2', 'Log 3'].includes(log.message)
            );

            // Verify we got all 3 test logs
            expect(testLogs.length).toBe(3);

            // First log should be the newest (time2)
            expect(new Date(testLogs[0].time).getTime())
                .toBe(time2.getTime());

            // Second should be time3 (middle timestamp)
            expect(new Date(testLogs[1].time).getTime())
                .toBe(time3.getTime());

            // Third should be time1 (oldest timestamp)
            expect(new Date(testLogs[2].time).getTime())
                .toBe(time1.getTime());
        }
    );

    // Test response excludes MongoDB fields
    test(
        'should not include _id and __v fields',
        async () => {
            // Create a test log entry
            await Log.create({
                // Timestamp of the log entry
                time: new Date(),
                // HTTP method used
                method: 'GET',
                // Server port number
                port: 3001,
                // Request path
                path: '/test',
                // HTTP response status code
                status: 200,
                // Log message description
                message: 'Test'
            });

            // Make GET request to /api/logs
            const response = await request(app).get('/api/logs');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);

            // Verify each log doesn't have MongoDB internal fields
            response.body.forEach(log => {
                // Check _id is not present
                expect(log).not.toHaveProperty('_id');
                // Check __v is not present
                expect(log).not.toHaveProperty('__v');
            });
        }
    );

    // Test log structure
    test(
        'should return logs with required fields',
        async () => {
            // Create a test log with all fields
            await Log.create({
                // Timestamp of the log entry
                time: new Date(),
                // HTTP method used
                method: 'POST',
                // Server port number
                port: 3002,
                // Request path
                path: '/api/add',
                // HTTP response status code
                status: 201,
                // Request duration in milliseconds
                duration_ms: 75,
                // Log message description
                message: 'Test log for field validation'
            });

            // Make GET request to /api/logs
            const response = await request(app).get('/api/logs');

            // Verify status code is 200 OK
            expect(response.status).toBe(200);

            // Find our specific test log
            const createdLog = response.body.find(log =>
                log.message === 'Test log for field validation'
            );

            // Verify log was found
            expect(createdLog).toBeDefined();
            // Verify all required fields are present
            // Check timestamp exists
            expect(createdLog).toHaveProperty('time');
            // Check HTTP method is POST
            expect(createdLog).toHaveProperty('method', 'POST');
            // Check port number is 3002
            expect(createdLog).toHaveProperty('port', 3002);
            // Check request path is /api/add
            expect(createdLog).toHaveProperty('path', '/api/add');
            // Check status code is 201
            expect(createdLog).toHaveProperty('status', 201);
            // Check duration is 75ms
            expect(createdLog).toHaveProperty('duration_ms', 75);
            // Check message exists
            expect(createdLog).toHaveProperty('message');
        }
    );
});
