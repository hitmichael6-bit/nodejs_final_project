/*
 * Add User Endpoint Tests
 * Tests the POST /api/add endpoint for creating users.
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
import addUserRoutes from '../../routes/add_user.routes.js';

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
    // Mount add user routes under /api prefix
    app.use('/api', addUserRoutes);
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

describe('POST /api/add (User)', () => {
    // Test successful user creation
    test(
        'should create user with valid data',
        async () => {
            // Define valid user data for testing
            const userData = {
                id: 123,
                first_name: 'John',
                last_name: 'Doe',
                birthday: '1990-01-15'
            };
            // Make POST request to create user
            const response = await request(app)
                .post('/api/add')
                .send(userData);

            // Verify response status is 201 Created
            expect(response.status).toBe(201);
            // Verify all user fields are in response
            expect(response.body).toHaveProperty('id', 123);
            expect(response.body).toHaveProperty('first_name', 'John');
            expect(response.body).toHaveProperty('last_name', 'Doe');
            expect(response.body).toHaveProperty('birthday');
        }
    );
    // Test missing required fields
    test(
        'should return 400 if id is missing',
        async () => {
            // Send request without id field
            const response = await request(app)
                .post('/api/add')
                // Send user data without id
                // field to test validation
                .send({
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });

            // Verify 400 Bad Request status
            expect(response.status).toBe(400);
            // Verify error response structure
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test missing first_name
    test(
        'should return 400 if first_name is missing',
        async () => {
            // Send request without first_name field
            const response = await request(app)
                .post('/api/add')
                // Send user data without first_name
                // field to test validation
                .send({
                    id: 123,
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test empty first_name
    test(
        'should return 400 if first_name is empty string',
        async () => {
            // Send whitespace-only first_name
            const response = await request(app)
                .post('/api/add')
                // Send user data with whitespace-only
                // first_name to test validation
                .send({
                    id: 123,
                    first_name: '   ',
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test missing last_name
    test(
        'should return 400 if last_name is missing',
        async () => {
            // Send request without last_name
            const response = await request(app)
                .post('/api/add')
                // Send user data without last_name
                // field to test validation
                .send({
                    id: 123,
                    first_name: 'John',
                    birthday: '1990-01-15'
                });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test empty last_name
    test(
        'should return 400 if last_name is empty string',
        async () => {
            // Send whitespace-only last_name
            const response = await request(app)
                .post('/api/add')
                // Send user data with whitespace-only
                // last_name to test validation
                .send({
                    id: 123,
                    first_name: 'John',
                    last_name: '   ',
                    birthday: '1990-01-15'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test missing birthday
    test(
        'should return 400 if birthday is missing',
        async () => {
            // Send request without birthday
            const response = await request(app)
                .post('/api/add')
                // Send user data without birthday
                // field to test validation
                .send({
                    id: 123,
                    first_name: 'John',
                    last_name: 'Doe'
                });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test invalid ID formats
    test(
        'should return 400 for invalid ID format (string)',
        async () => {
            // Send string ID instead of number
            const response = await request(app)
                .post('/api/add')
                // Send user data with string
                // id to test validation
                .send({
                    id: 'abc',
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );

    // Test negative ID
    test(
        'should return 400 if id is not positive',
        async () => {
            // Send negative ID
            const response = await request(app)
                .post('/api/add')
                // Send user data with negative
                // id to test validation
                .send({
                    id: -5,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );

    // Test zero ID
    test(
        'should return 400 if id is zero',
        async () => {
            // Send zero as ID
            const response = await request(app)
                .post('/api/add')
                // Send user data with zero
                // id to test validation
                .send({
                    id: 0,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );

    // Test decimal ID
    test(
        'should return 400 if id is a decimal',
        async () => {
            // Send decimal ID
            const response = await request(app)
                .post('/api/add')
                // Send user data with decimal
                // id to test validation
                .send({
                    id: 123.5,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: '1990-01-15'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );

    // Test invalid birthday formats
    test(
        'should return 400 for invalid birthday format',
        async () => {
            // Send invalid date string
            const response = await request(app)
                .post('/api/add')
                // Send user data with invalid
                // birthday format to test validation
                .send({
                    id: 123,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: 'invalid-date'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message).toBe('Invalid birthday format.');
        }
    );

    // Test future birthday
    test(
        'should return 400 for future birthday',
        async () => {
            // Create tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Send future birthday
            const response = await request(app)
                .post('/api/add')
                // Send user data with future
                // birthday to test validation
                .send({
                    id: 123,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: tomorrow.toISOString()
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            // Verify error message
            expect(response.body.message)
                .toBe('Birthday cannot be in the future.');
        }
    );

    // Test today as birthday
    test(
        'should accept birthday as today',
        async () => {
            // Create today's date at midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Send request with today's date
            const response = await request(app)
                .post('/api/add')
                // Send user data with today as
                // birthday to verify acceptance
                .send({
                    id: 123,
                    first_name: 'John',
                    last_name: 'Doe',
                    birthday: today.toISOString()
                });
            // Verify 201 Created
            expect(response.status).toBe(201);
        }
    );

    // Test user persisted to database
    test(
        'should persist user to database',
        async () => {
            // Define user data
            const userData = {
                id: 456,
                first_name: 'Jane',
                last_name: 'Smith',
                birthday: '1995-06-20'
            };
            // Create user via API
            await request(app)
                .post('/api/add')
                .send(userData);

            // Query database to verify persistence
            const savedUser = await User.findOne({ id: 456 });
            // Verify user exists in DB
            expect(savedUser).not.toBeNull();
            expect(savedUser.first_name).toBe('Jane');
            expect(savedUser.last_name).toBe('Smith');
        }
    );

    // Test various date formats
    test(
        'should accept ISO date format',
        async () => {
            // Send ISO 8601 date format
            const response = await request(app)
                .post('/api/add')
                // Send user data with ISO 8601
                // formatted birthday to test parsing
                .send({
                    id: 789,
                    first_name: 'Bob',
                    last_name: 'Johnson',
                    birthday: '2000-12-31T00:00:00.000Z'
                });
            // Verify 201 Created
            expect(response.status).toBe(201);
        }
    );

    // Test duplicate user ID
    test(
        'should return 409 if user ID already exists',
        async () => {
            // Create first user in database
            await User.create({
                id: 123,
                first_name: 'John',
                last_name: 'Doe',
                birthday: new Date('1990-01-01')
            });
            // Try to create another user with same ID
            const response = await request(app)
                .post('/api/add')
                // Send user data with duplicate
                // id to test conflict handling
                .send({
                    id: 123,
                    first_name: 'Jane',
                    last_name: 'Smith',
                    birthday: '1992-05-15'
                });
            // Verify 409 Conflict
            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('id', 409);
            // Verify error message
            expect(response.body.message).toBe('User 123 already exists.');
        }
    );

    // Test trimming whitespace
    test(
        'should trim whitespace from first_name and last_name',
        async () => {
            // Send names with leading/trailing whitespace
            const response = await request(app)
                .post('/api/add')
                // Send user data with whitespace
                // in names to test trimming
                .send({
                    id: 123,
                    first_name: '  John  ',
                    last_name: '  Doe  ',
                    birthday: '1990-01-15'
                });
            // Verify names are trimmed in response
            expect(response.status).toBe(201);
            expect(response.body.first_name).toBe('John');
            expect(response.body.last_name).toBe('Doe');
        }
    );

    // Test numeric ID
    test(
        'should convert numeric string ID to number',
        async () => {
            // Send request with numeric ID
            const response = await request(app)
                .post('/api/add')
                // Send user data with numeric
                // id to verify type conversion
                .send({
                    id: 999,
                    first_name: 'Alice',
                    last_name: 'Williams',
                    birthday: '1985-03-10'
                });
            // Verify ID is stored as number
            expect(response.status).toBe(201);
            expect(response.body.id).toBe(999);
            expect(typeof response.body.id).toBe('number');
        }
    );

    // Test very old birthday (should work)
    test(
        'should accept very old birthdays',
        async () => {
            // Send request with 1900 birth year
            const response = await request(app)
                .post('/api/add')
                // Send user data with very old
                // birthday to test date range
                .send({
                    id: 456,
                    first_name: 'Ancient',
                    last_name: 'Person',
                    birthday: '1900-01-01'
                });
            // Verify old date is accepted
            expect(response.status).toBe(201);
            expect(response.body.first_name).toBe('Ancient');
        }
    );
});
