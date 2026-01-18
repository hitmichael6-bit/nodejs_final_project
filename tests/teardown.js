/*
 * Jest Global Teardown
 * Runs after all tests complete to clean the database.
 * Leaves only the required user (id: 123123, mosh israeli)
 * in the users collection.
 */
// Import environment configuration
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import database connection utilities
import { connectDb } from '../db.js';
import getMongoUri from '../config/mongo_conn.js';

// Import all models for database cleanup
import User from '../models/user.model.js';
import Cost from '../models/cost.model.js';
import Log from '../models/log.model.js';
import Report from '../models/report.model.js';

// Load environment variables for database connection
dotenv.config();

// Global teardown function executed after all tests
export default async function globalTeardown() {
    try {
        // Connect to database if not already connected
        if (mongoose.connection.readyState === 0) {
            // Get MongoDB connection URI from config
            const mongoUri = getMongoUri();

            // Check if URI is available
            if (!mongoUri) {
                // Log warning message when MongoDB URI is not configured
                console.log(
                    '⚠️ No MongoDB URI found. ' +
                    'Skipping database cleanup.'
                );
                return;
            }
            // Establish database connection
            await connectDb(mongoUri);
        }

        // Clear all collections to ensure clean state
        await Cost.deleteMany({});
        await Log.deleteMany({});
        await Report.deleteMany({});
        await User.deleteMany({});

        // Create the required final user for assignment verification
        await User.create({
            id: 123123,
            first_name: 'mosh',
            last_name: 'israeli',
            birthday: new Date('2000-01-01')
        });
        // Log successful cleanup
        console.log('\n✅ Database cleaned successfully!');
        console.log(
            '📝 Final state: Only user 123123 (mosh israeli) ' +
            'remains in users collection.\n'
        );

        // Close the database connection to free resources
        await mongoose.connection.close();
    } catch (error) {
        // Log and re-throw any errors that occur
        console.error('Error during global teardown:', error);
        throw error;
    }
}
