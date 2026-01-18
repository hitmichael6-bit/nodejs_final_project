/*
 * Cost Categories Configuration
 * Defines the valid categories for cost items.
 * Used for validation in Cost model and report generation.
 */

// Array of all valid cost categories
const CATEGORIES = [
    // Food and groceries expenses
    'food',
    // Health and medical expenses
    'health',
    // Housing and rent expenses
    'housing',
    // Sports and fitness expenses
    'sports',
    // Education and learning expenses
    'education'
];

// Export categories array for use in models and routes
export default CATEGORIES;
