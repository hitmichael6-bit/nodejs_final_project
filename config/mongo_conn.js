/*
 * MongoDB Connection Configuration
 * Constructs MongoDB connection URI from environment variables.
 * Used for database connection in production and test environments.
 */

// Function to build MongoDB connection URI from environment variables
export default function getMongoUri() {
    // Extract MongoDB connection parameters from environment
    const {
        // Protocol (mongodb or mongodb+srv)
        MONGO_PROTOCOL,
        // Database username
        MONGO_USER,
        // Database password
        MONGO_PASSWORD,
        // Database host address
        MONGO_HOST,
        // Database name
        MONGO_DBNAME,
    } = process.env;

    // Choose database name based on environment
    let dbName;

    // Use test database when running in test environment
    if (process.env.NODE_ENV === 'test') {
        dbName = process.env.MONGO_DBNAME_TEST || `${MONGO_DBNAME}_test`;
    } else {
        dbName = MONGO_DBNAME;
    }

    // Construct and return full MongoDB connection string
    return `${MONGO_PROTOCOL}://${MONGO_USER}:${MONGO_PASSWORD}` +
        `@${MONGO_HOST}/${dbName}`;
}
