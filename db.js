/*
 * Database Connection Module
 * Manages MongoDB connection using Mongoose.
 * Ensures connection is established before services start.
 */
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';

/*
 * Connects to MongoDB using the provided connection string.
 * Checks if already connected to avoid duplicate connections.
 */
export async function connectDb(mongoUri) {
    try {
        // Validate that connection string is provided
        if (!mongoUri) {
            logger.error('Missing MongoDB connection string.');
            throw new Error('Missing MongoDB connection string.');
        }

        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            logger.info('MongoDB is already connected.');
            return;
        }

        // Establish connection to MongoDB Atlas
        await mongoose.connect(mongoUri);

        // Verify connection succeeded
        if (mongoose.connection.readyState === 1) {
            logger.info('MongoDB connected.');
        }
    } catch (err) {
        // Log error and re-throw to prevent service from starting
        logger.error({ err }, 'MongoDB connection error.');
        throw err;
    }
}
