/*
 * MongoDB Connection Configuration
 * Constructs MongoDB connection URI from environment variables.
 * Used for database connection in production and test environments.
 */

// Function to build MongoDB connection URI from environment variables
export default function getMongoUri() {
    // Extract MongoDB connection parameters from environment
    const {
        MONGO_PROTOCOL,  // Protocol (mongodb or mongodb+srv)
        MONGO_USER,      // Database username
        MONGO_PASSWORD,  // Database password
        MONGO_HOST,      // Database host address
        MONGO_DBNAME,    // Database name
    } = process.env;

    // Choose database name based on environment
    let dbName;

    if (process.env.NODE_ENV === 'test') {
        dbName = process.env.MONGO_DBNAME_TEST || `${MONGO_DBNAME}_test`;
    } else {
        dbName = MONGO_DBNAME;
    }

    // Construct and return full MongoDB connection string
    return `${MONGO_PROTOCOL}://${MONGO_USER}:${MONGO_PASSWORD}` +
        `@${MONGO_HOST}/${dbName}`;
}