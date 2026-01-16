/*
 * Service Starter Utility
 * Initializes and starts a microservice with database connection.
 * Handles route mounting and server startup.
 */
import { createServiceApp } from './createServiceApp.js';
import { connectDb } from '../db.js';
import getMongoUri from '../config/mongo_conn.js';
import { logger } from './logger.js';

/*
 * Starts a microservice with the given configuration.
 * Connects to MongoDB and starts listening on the specified port.
 */
export async function startService({ serviceName, port, routers = [] }) {
    // Create Express app with middleware
    const app = createServiceApp();

    // Mount all provided routers under /api prefix
    for (const router of routers) {
        app.use('/api', router);
    }

    // 404 handler for unmatched routes
    app.use((req, res) => {
        return res.status(404).json({
            id: 404,
            message: 'Route not found. Check port and path.'
        });
    });

    // Connect to MongoDB (throws error if connection fails)
    await connectDb(getMongoUri());

    // Start HTTP server
    app.listen(port, () => {
        logger.info(`Service "${serviceName}" running on port ${port}.`);
    });

    return app;
}