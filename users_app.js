/*
 * Users Service Entry Point
 * Process handling user management operations.
 * Runs on port 3002 (configurable via USERS_PORT env variable).
 */

// Load environment variables from .env file
import dotenv from 'dotenv';

// Initialize environment configuration
dotenv.config();

// Import service utilities
import { startService } from './utils/startService.js';
import { logger } from './utils/logger.js';

// Import route handlers for user operations
import userRoutes from './routes/user.routes.js';
import addUserRoutes from './routes/add_user.routes.js';

// Start the Users process with error handling
try {
    // Configure and launch the Users service with both routers
    await startService({
        serviceName: 'Users',
        port: process.env.PORT || process.env.USERS_PORT || 3002,
        routers: [addUserRoutes, userRoutes]
    });
} catch (err) {
    // Log fatal error and exit process on startup failure
    logger.fatal({ err }, 'Users service failed to start.');
    process.exit(1);
}
