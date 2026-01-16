/*
 * User Model
 * Defines the schema for user documents in MongoDB.
 * 
 * IMPORTANT: 'id' and '_id' are different properties
 * - id: Application-level user ID (Number, unique)
 * - _id: MongoDB's internal ObjectId (auto-generated)
 */
import mongoose from 'mongoose';

// Schema definition for user documents
const schema = {
    // Application-level user ID (different from MongoDB's _id)
    id: {
        type: Number,
        required: true,
        unique: true,
        // Validate ID is a positive integer
        validate: {
            validator: value => (Number.isInteger(value) && value > 0),
            message: "User ID must be a positive integer."
        }
    },
    // User's first name
    first_name: {
        type: String,
        required: true
    },
    // User's last name
    last_name: {
        type: String,
        required: true
    },
    // User's date of birth
    birthday: {
        type: Date,
        required: true,
        // Validate birthday is not in the future
        validate: {
            validator: value => {
                // Get start of today (midnight)
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                // Birthday must be today or earlier
                return value <= startOfToday;
            },
            message: 'Birthday cannot be in the future.'
        }
    }
};

// Create Mongoose schema for the users collection
const userSchema = new mongoose.Schema(schema, {
    collection: 'users',
    versionKey: false
});

// Create and export the User model
const User = mongoose.model('User', userSchema);

export default User;
