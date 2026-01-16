/*
 * About Service Entry Point
 * Process providing developer team information.
 * Runs on port 3004 (configurable via ABOUT_PORT env variable).
 */

// Load environment variables from .env file
import dotenv from 'dotenv';

// Initialize environment configuration
dotenv.config();

// Import service utilities
import { startService } from './utils/startService.js';
import { logger } from './utils/logger.js';

// Import route handlers
import aboutRoutes from './routes/about.routes.js';

// Start the About process with error handling
try {
    // Configure and launch the About service
    await startService({
        serviceName: 'About',
        port: process.env.PORT || process.env.ABOUT_PORT || 3004,
        routers: [aboutRoutes]
    });
} catch (err) {
    // Log fatal error and exit process on startup failure
    logger.fatal({ err }, 'About service failed to start.');
    process.exit(1);
}
