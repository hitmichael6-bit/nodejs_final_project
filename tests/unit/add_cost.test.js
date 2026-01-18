/*
 * Add Cost Endpoint Tests
 * Tests the POST /api/add endpoint for creating cost items.
 */

// Import testing utilities
import request from 'supertest';
import mongoose from 'mongoose';

// Import application utilities
import { createServiceApp } from '../../utils/createServiceApp.js';
import { connectDb } from '../../db.js';
import getMongoUri from '../../config/mongo_conn.js';

// Import models and routes to test
import Cost from '../../models/cost.model.js';
import User from '../../models/user.model.js';
import addCostRoutes from '../../routes/add_cost.routes.js';

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
    // Mount add cost routes under /api prefix
    app.use('/api', addCostRoutes);
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
    await User.deleteMany({});
});

describe('POST /api/add (Cost)', () => {
    // Test successful cost creation
    test(
        'should create cost with valid data',
        async () => {
            // Create user first (required for foreign key)
            await User.create({
                id: 123,
                first_name: 'John',
                last_name: 'Doe',
                birthday: new Date('1990-01-01')
            });
            // Define valid cost data
            const costData = {
                description: 'Groceries',
                category: 'food',
                userid: 123,
                sum: 50.5
            };
            // Make POST request to create cost
            const response = await request(app)
                .post('/api/add')
                .send(costData);

            // Verify response status is 201 Created
            expect(response.status).toBe(201);
            // Verify description field matches input
            expect(response.body)
                .toHaveProperty('description', 'Groceries');
            // Verify category field matches input
            expect(response.body).toHaveProperty('category', 'food');
            // Verify userid field matches input
            expect(response.body).toHaveProperty('userid', 123);
            // Verify sum field matches input
            expect(response.body).toHaveProperty('sum', 50.5);
            // Verify date field is present
            expect(response.body).toHaveProperty('date');
        }
    );

    // Test cost with specific date
    test(
        'should create cost with specific date (today)',
        async () => {
            // Create user first (required for foreign key)
            await User.create({
                id: 456,
                first_name: 'Jane',
                last_name: 'Smith',
                birthday: new Date('1992-05-15')
            });
            // Define cost data with today's date
            const today = new Date();
            const costData = {
                description: 'Medicine',
                category: 'health',
                userid: 456,
                sum: 100,
                // Convert today's date to ISO string format for API
                date: today.toISOString()
            };

            // Make POST request to create cost
            const response = await request(app)
                .post('/api/add')
                .send(costData);

            // Verify response status is 201 Created
            expect(response.status).toBe(201);
            // Verify description field is correct
            expect(response.body)
                .toHaveProperty('description', 'Medicine');
        }
    );

    // Test missing required fields
    test(
        'should return 400 if description is missing',
        async () => {
            // Send request without description field
            const response = await request(app)
                .post('/api/add')
                .send({ category: 'food', userid: 123, sum: 50 });

            // Verify 400 Bad Request status
            expect(response.status).toBe(400);
            // Verify error response structure
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test empty description string
    test(
        'should return 400 if description is empty string',
        async () => {
            // Send request with whitespace-only description
            const response = await request(app)
                .post('/api/add')
                // Send cost data with whitespace-only
                // description to test validation
                .send({
                    description: '   ',
                    category: 'food',
                    userid: 123,
                    sum: 50
                });
            // Verify 400 error for empty description
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test missing category field
    test(
        'should return 400 if category is missing',
        async () => {
            // Send request without category
            const response = await request(app)
                .post('/api/add')
                .send({ description: 'Test', userid: 123, sum: 50 });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test empty category string
    test(
        'should return 400 if category is empty string',
        async () => {
            // Send whitespace-only category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with whitespace-only
                // category to test validation
                .send({
                    description: 'Test',
                    category: '   ',
                    userid: 123,
                    sum: 50
                });
            // Verify 400 error for empty category
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test missing userid field
    test(
        'should return 400 if userid is missing',
        async () => {
            // Send request without userid
            const response = await request(app)
                .post('/api/add')
                .send({ description: 'Test', category: 'food', sum: 50 });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test missing sum field
    test(
        'should return 400 if sum is missing',
        async () => {
            // Send request without sum
            const response = await request(app)
                .post('/api/add')
                // Send cost data without a "sum"
                // property to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123
                });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Missing required fields.');
        }
    );

    // Test invalid category
    test(
        'should return 400 for invalid category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send invalid category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with an invalid
                // category to test validation
                .send({
                    description: 'Test',
                    category: 'invalid_category',
                    userid: 123,
                    sum: 50
                });
            // Verify 400 error with category message
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toContain('not in the list of accepted categories');
        }
    );
    // Test invalid userid format
    test(
        'should return 400 if userid is not an integer',
        async () => {
            // Send string userid
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a non-numeric
                // userid to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 'abc',
                    sum: 50
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );
    // Test negative userid
    test(
        'should return 400 if userid is not positive',
        async () => {
            // Send negative userid
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a negative
                // userid to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: -5,
                    sum: 50
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );
    // Test zero userid
    test(
        'should return 400 if userid is zero',
        async () => {
            // Send zero as userid
            const response = await request(app)
                .post('/api/add')
                // Send cost data with userid
                // set to 0 to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 0,
                    sum: 50
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );
    // Test decimal userid
    test(
        'should return 400 if userid is a decimal',
        async () => {
            // Send decimal userid
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a non-integer
                // userid to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123.5,
                    sum: 50
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('User ID must be a positive integer.');
        }
    );
    // Test invalid sum values
    test(
        'should return 400 if sum is not a number',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send string as sum
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a non-numeric
                // sum to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123,
                    sum: 'abc'
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('Sum must be a non-negative finite number.');
        }
    );
    // Test negative sum
    test(
        'should return 400 if sum is negative',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send negative sum
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a negative
                // sum to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123,
                    sum: -10
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('Sum must be a non-negative finite number.');
        }
    );
    // Test infinity sum
    test(
        'should return 400 if sum is Infinity',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send Infinity as sum
            const response = await request(app)
                .post('/api/add')
                // Send cost data with an Infinity
                // sum to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123,
                    sum: Infinity
                });
            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('Sum must be a non-negative finite number.');
        }
    );
    // Test zero sum acceptance
    test(
        'should accept sum of zero',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send zero sum (free item)
            const response = await request(app)
                .post('/api/add')
                // Send cost data with the "sum" property
                // set to 0 to test validation
                .send({
                    description: 'Free item',
                    category: 'food',
                    userid: 123,
                    sum: 0
                });
            // Verify zero is accepted
            expect(response.status).toBe(201);
            expect(response.body.sum).toBe(0);
        }
    );

    // Test invalid date format
    test(
        'should return 400 for invalid date format',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send invalid date string
            const response = await request(app)
                .post('/api/add')
                // Send cost data with an invalid
                // date to test validation
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123,
                    sum: 50,
                    // Set the date property
                    // to an invalid date string
                    date: 'invalid-date'
                });

            // Verify 400 error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message).toBe('Invalid date format.');
        }
    );

    // Test past date rejection
    test(
        'should reject past dates',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Create yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            // Send past date
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a past
                // date to test date validation
                .send({
                    description: 'Past expense',
                    category: 'food',
                    userid: 123,
                    sum: 50,
                    // Convert yesterday's date to ISO string format
                    date: yesterday.toISOString()
                });

            // Verify past date is rejected
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('Date cannot be in the past.');
        }
    );
    // Test user existence validation
    test(
        'should return 400 if user does not exist',
        async () => {
            // Send request with non-existent user
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a userid
                // that does not exist in database
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 999999,
                    sum: 50
                });
            // Verify user not found error
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('id', 400);
            expect(response.body.message)
                .toBe('User 999999 does not exist.');
        }
    );
    // Test all valid categories
    test(
        'should accept food category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send food category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with valid food category
                .send({
                    description: 'Lunch',
                    category: 'food',
                    userid: 123,
                    sum: 20
                });
            // Verify food category accepted
            expect(response.status).toBe(201);
        }
    );

    // Test health category
    test(
        'should accept health category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send health category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with valid health category
                .send({
                    description: 'Doctor',
                    category: 'health',
                    userid: 123,
                    sum: 200
                });
            // Verify health category accepted
            expect(response.status).toBe(201);
        }
    );

    // Test housing category
    test(
        'should accept housing category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send housing category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with valid housing category
                .send({
                    description: 'Rent',
                    category: 'housing',
                    userid: 123,
                    sum: 1000
                });
            // Verify housing category accepted
            expect(response.status).toBe(201);
        }
    );

    // Test sports category
    test(
        'should accept sports category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send sports category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with valid sports category
                .send({
                    description: 'Gym membership',
                    category: 'sports',
                    userid: 123,
                    sum: 100
                });
            // Verify sports category accepted
            expect(response.status).toBe(201);
        }
    );

    // Test education category
    test(
        'should accept education category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send education category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with valid education category
                .send({
                    description: 'Textbook',
                    category: 'education',
                    userid: 123,
                    sum: 75
                });
            // Verify education category accepted
            expect(response.status).toBe(201);
        }
    );

    // Test category normalization
    test(
        'should normalize category to lowercase',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send uppercase category
            const response = await request(app)
                .post('/api/add')
                // Send cost data with uppercase
                // category to test normalization
                .send({
                    description: 'Test',
                    category: 'FOOD',
                    userid: 123,
                    sum: 20
                });
            // Verify category normalized to lowercase
            expect(response.status).toBe(201);
            expect(response.body.category).toBe('food');
        }
    );

    // Test whitespace trimming
    test(
        'should trim whitespace from description and category',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send description and category with whitespace
            const response = await request(app)
                .post('/api/add')
                // Send cost data with leading/trailing
                // whitespace to test trimming
                .send({
                    description: '  Groceries  ',
                    category: '  food  ',
                    userid: 123,
                    sum: 20
                });
            // Verify fields are trimmed
            expect(response.status).toBe(201);
            expect(response.body.description).toBe('Groceries');
            expect(response.body.category).toBe('food');
        }
    );

    // Test cost persisted to database
    test(
        'should persist cost to database',
        async () => {
            // Create user first
            await User.create({
                id: 999,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Define cost data
            const costData = {
                description: 'Test cost',
                category: 'food',
                userid: 999,
                sum: 25
            };
            // Create cost via API
            await request(app)
                .post('/api/add')
                .send(costData);

            // Query database to verify persistence
            const savedCost = await Cost.findOne({ userid: 999 });
            expect(savedCost).not.toBeNull();
            expect(savedCost.description).toBe('Test cost');
            expect(savedCost.sum).toBe(25);
        }
    );
    // Test future date (should be accepted)
    test(
        'should accept future dates',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Create tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Send future date
            const response = await request(app)
                .post('/api/add')
                // Send cost data with a future
                // date to verify it is accepted
                .send({
                    description: 'Future expense',
                    category: 'food',
                    userid: 123,
                    sum: 50,
                    // Convert tomorrow's date to ISO string format
                    date: tomorrow.toISOString()
                });

            // Verify future date accepted
            expect(response.status).toBe(201);
            expect(response.body.description).toBe('Future expense');
        }
    );

    // Test cost without date field (should default to now)
    test(
        'should default to current date when date not provided',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Capture time before request
            const beforeRequest = new Date();

            // Send request without date field
            const response = await request(app)
                .post('/api/add')
                // Send cost data without date
                // field to test default behavior
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 123,
                    sum: 50
                });
            // Capture time after request
            const afterRequest = new Date();

            // Verify date was auto-set to current time
            expect(response.status).toBe(201);
            const responseDate = new Date(response.body.date);
            expect(responseDate >= beforeRequest).toBe(true);
            expect(responseDate <= afterRequest).toBe(true);
        }
    );
    // Test decimal sum (should work)
    test(
        'should accept decimal sum values',
        async () => {
            // Create user first
            await User.create({
                id: 123,
                first_name: 'Test',
                last_name: 'User',
                birthday: new Date('1990-01-01')
            });
            // Send decimal sum value
            const response = await request(app)
                .post('/api/add')
                // Send cost data with decimal
                // sum to test precision handling
                .send({
                    description: 'Decimal cost',
                    category: 'food',
                    userid: 123,
                    sum: 123.45
                });
            // Verify decimal sum accepted
            expect(response.status).toBe(201);
            expect(response.body.sum).toBe(123.45);
        }
    );
});
