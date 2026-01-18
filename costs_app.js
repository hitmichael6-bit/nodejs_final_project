/*
 * Costs Service Entry Point
 * Process handling cost management and report generation.
 * Implements the Computed Design Pattern for report caching.
 * Runs on port 3003 (configurable via COSTS_PORT env variable).
 */
// Load environment variables from .env file
import dotenv from 'dotenv';

// Initialize environment configuration
dotenv.config();

// Import service utilities
import { startService } from './utils/startService.js';
import { logger } from './utils/logger.js';

// Import route handlers for cost operations
import addCostRoutes from './routes/add_cost.routes.js';
import reportRoutes from './routes/report.routes.js';

// Start the Costs process with error handling
try {
    // Configure and launch the Costs service with both routers
    await startService({
        serviceName: 'Costs',
        port: process.env.PORT || process.env.COSTS_PORT || 3003,
        routers: [addCostRoutes, reportRoutes]
    });
} catch (err) {
    // Log fatal error and exit process on startup failure
    logger.fatal({ err }, 'Costs service failed to start.');
    process.exit(1);
}
