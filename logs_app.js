/*
 * Logs Service Entry Point
 * Process for retrieving HTTP request logs.
 * Runs on port 3001 (configurable via LOGS_PORT env variable).
 */

// Load environment variables from .env file
import dotenv from 'dotenv';

// Initialize environment configuration
dotenv.config();

// Import service utilities
import { startService } from './utils/startService.js';
import { logger } from './utils/logger.js';

// Import route handlers
import logRoutes from './routes/log.routes.js';

// Start the Logs process with error handling
try {
    // Configure and launch the Logs service
    await startService({
        serviceName: 'Logs',
        port: process.env.PORT || process.env.LOGS_PORT || 3001,
        routers: [logRoutes]
    });
} catch (err) {
    // Log fatal error and exit process on startup failure
    logger.fatal({ err }, 'Logs service failed to start.');
    process.exit(1);
}
