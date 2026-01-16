/*
 * Cost Categories Configuration
 * Defines the valid categories for cost items.
 * Used for validation in Cost model and report generation.
 */

// Array of all valid cost categories
const CATEGORIES = [
    'food',       // Food and groceries expenses
    'health',     // Health and medical expenses
    'housing',    // Housing and rent expenses
    'sports',     // Sports and fitness expenses
    'education'   // Education and learning expenses
];

// Export categories array for use in models and routes
export default CATEGORIES;
