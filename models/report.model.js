/*
 * Report Model - Stores cached monthly cost reports.
 * Implements caching layer for the Computed Pattern:
 * - Past month reports are cached after first generation
 * - Current/future month reports are NOT cached (data may change)
 */
// MongoDB library for schema definition and database operations
import mongoose from 'mongoose';

// Schema for cached report documents
const schema = {
    // User ID for whom the report was generated
    userid: {
        type: Number,
        required: true,
        // Validate userid is a positive integer
        validate: {
            validator: value => (Number.isInteger(value) && value > 0),
            message: "User ID must be a positive integer."
        }
    },
    // Year of the report (e.g., 2025)
    year: {
        type: Number,
        required: true,
        // Validate year is a positive integer
        validate: {
            validator: value => (Number.isInteger(value) && value > 0),
            message: 'Year must be a positive integer.'
        }
    },
    // Month of the report (1-12)
    month: {
        type: Number,
        required: true,
        // Validate month is between 1 and 12
        validate: {
            validator: value =>
                (Number.isInteger(value) && value >= 1 && value <= 12),
            message: 'Month must be a positive integer between 1 and 12.'
        }
    },
    // Array of objects, each containing a category and its costs
    costs: {
        type: Array,
        required: true
    }
};

// Create Mongoose schema for the reports collection
const reportSchema = new mongoose.Schema(schema, {
    collection: 'reports',
    versionKey: false
});

// Create and export the Report model
const Report = mongoose.model('Report', reportSchema);

export default Report;
