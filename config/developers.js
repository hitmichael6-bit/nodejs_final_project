/*
 * Development Team Configuration
 * Contains information about the project team members.
 * Returned by the /api/about endpoint.
 */

// Array of team member objects with first and last names
const DEVELOPERS = [
    // Team member 1
    { first_name: 'Guy', last_name: 'Cohen' },
    // Team member 2
    { first_name: 'Baruch', last_name: 'Ilyayev' },
    // Team member 3
    { first_name: 'Michael', last_name: 'Chernyak' }
];

// Export developers array for use in about routes
export default DEVELOPERS;
