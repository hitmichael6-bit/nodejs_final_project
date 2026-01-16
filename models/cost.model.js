/*
 * Cost Model
 * Defines the schema for cost item documents in MongoDB.
 * Includes validation to prevent costs with past dates.
 */
import mongoose from 'mongoose';
import CATEGORIES from '../config/categories.js';

// Schema definition for cost documents
const schema = {
    // Description field for the cost item
    description: {
        type: String,
        required: true
    },
    // Category must be one of: food, health, housing, sports, education
    category: {
        type: String,
        required: true,
        enum: CATEGORIES
    },
    // User ID field linking cost to a user
    userid: {
        type: Number,
        required: true,
        // Validate that userid is an integer
        validate: {
            validator: Number.isInteger,
            message: 'User ID must be an integer.'
        },
        // Ensure userid is positive
        min: [1, 'User ID must be a positive integer.']
    },
    // Sum (amount) of the cost item
    sum: {
        type: Number,
        required: true,
        // Validate that sum is a finite number
        validate: {
            validator: Number.isFinite,
            message: 'Sum must be a finite number.'
        },
        // Ensure sum is non-negative
        min: [0, 'Sum must be a non-negative number.']
    },
    /*
     * Date validation: prevents adding costs with past dates.
     * Compares against start of today (00:00:00 server local time).
     */
    date: {
        type: Date,
        default: Date.now,
        validate: {
            validator: value => {
                // Get today's date at midnight
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                // Ensure date is not in the past
                return value >= startOfToday;
            },
            message: 'Date cannot be in the past.'
        }
    }
};

// Create Mongoose schema for the costs collection
const costSchema = new mongoose.Schema(schema, {
    collection: 'costs',
    versionKey: false
});

// Create and export the Cost model
const Cost = mongoose.model('Cost', costSchema);

export default Cost;
