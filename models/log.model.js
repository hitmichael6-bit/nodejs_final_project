/*
 * Log Model
 * Defines the schema for HTTP request logs stored in MongoDB.
 * Logs track every HTTP request received by the server.
 */
// MongoDB library for schema definition and database operations
import mongoose from 'mongoose';

// Schema definition for log documents
const schema = {
    // Timestamp when the request was received
    time: {
        type: Date,
        default: Date.now
    },
    // HTTP method (GET, POST, etc.)
    method: {
        type: String,
        required: true
    },
    // Port number the service is running on
    port: {
        type: Number,
        required: true,
    },
    // Request path/URL
    path: {
        type: String,
        required: true
    },
    // HTTP status code (e.g., 200, 404, 500)
    status: {
        type: Number
    },
    // Request processing time in milliseconds
    duration_ms: {
        type: Number
    },
    // Log message or description
    message: {
        type: String,
        required: true
    }
};

// Create Mongoose schema for the logs collection
const logSchema = new mongoose.Schema(schema, {
    collection: 'logs',
    versionKey: false
});

// Create and export the Log model
const Log = mongoose.model('Log', logSchema);

export default Log;
