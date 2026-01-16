# Cost Manager API

A microservices-based cost management system built with
Node.js, Express, and MongoDB. This project implements a
distributed architecture with four independent services
for managing users, costs, reports, and system logs.

**Authors:** Guy Cohen, Baruch Ilyayev, Michael Chernyak

## Video Demonstration

Watch a walkthrough of this project on YouTube:
[Cost Manager Backend Project]
(https://www.youtube.com/watch?v=To858N_lf24)

## Live Deployment (Render)

The application is deployed on Render
with each service running independently:

- **Logs Service:** https://logs-service-t1n1.onrender.com/
- **Users Service:** https://users-service-9tgp.onrender.com/
- **Costs Service:** https://costs-service-t808.onrender.com/
- **About Service:** https://about-service-m2sw.onrender.com/

## Architecture Overview

The application is divided into four independent
processes, each running on its own port:

- **Logs Service** (Port 3001) - HTTP request logging
- **Users Service** (Port 3002) - User management
- **Costs Service** (Port 3003) - Cost tracking and reporting
- **About Service** (Port 3004) - Developer information

## Technology Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose ODM
- **Logging:** Pino
- **Environment:** dotenv for configuration
- **Testing:** Jest with Supertest

## Installation

```bash
npm install
```

## Running the Application

### Development Mode (All Services)
```bash
npm run dev
```

### Individual Services
```bash
npm run dev:logs    # Logs service only
npm run dev:users   # Users service only
npm run dev:costs   # Costs service only
npm run dev:about   # About service only
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

**Note on Test Execution**  
Unit tests are designed to be executed locally using
`npm test` with valid MongoDB credentials.

## API Documentation

All endpoints are prefixed with `/api`.

---

### 1. Logs Service (Port 3001)

Retrieves HTTP request logs from all services.

#### **GET** `/api/logs`

Returns all HTTP request logs sorted by time (most recent first).

**Response:** `200 OK`
```json
[
  {
    "service": "Users",
    "method": "POST",
    "url": "/api/add",
    "time": "2024-01-15T10:30:00.000Z",
    "message": "Endpoint accessed: POST /api/add (user)"
  }
]
```

---

### 2. Users Service (Port 3002)

Manages user creation and retrieval.

#### **POST** `/api/add`

Create a new user.

**Request Body:**
```json
{
  "id": 123456,
  "first_name": "John",
  "last_name": "Doe",
  "birthday": "1990-05-15"
}
```

**Validation Rules:**
- `id`: Must be a positive integer
- `first_name`: Required, non-empty string
- `last_name`: Required, non-empty string
- `birthday`: Valid date, cannot be in the future

**Responses:**
- `201 Created` - User successfully created
- `400 Bad Request` - Invalid or missing fields
- `409 Conflict` - User ID already exists

#### **GET** `/api/users`

Retrieve all users.

**Response:** `200 OK`
```json
[
  {
    "id": 123456,
    "first_name": "John",
    "last_name": "Doe",
    "birthday": "1990-05-15T00:00:00.000Z"
  }
]
```

#### **GET** `/api/users/:id`

Retrieve a specific user with their total costs.

**Response:** `200 OK`
```json
{
  "id": 123456,
  "first_name": "John",
  "last_name": "Doe",
  "total": 1250.50
}
```

**Responses:**
- `200 OK` - User found
- `400 Bad Request` - Invalid user ID
- `404 Not Found` - User doesn't exist

---

### 3. Costs Service (Port 3003)

Handles cost tracking and report generation with intelligent caching.

#### **POST** `/api/add`

Create a new cost entry.

**Request Body:**
```json
{
  "description": "Grocery shopping",
  "category": "food",
  "userid": 123456,
  "sum": 85.50,
  "date": "2024-01-15"
}
```

**Valid Categories:**
- `food`
- `health`
- `housing`
- `sport`
- `education`

**Validation Rules:**
- `description`: Required, non-empty string
- `category`: Must be from valid categories list (case-insensitive)
- `userid`: Must reference an existing user, positive integer
- `sum`: Non-negative finite number
- `date`: Optional (defaults to current date), cannot be in the past

**Responses:**
- `201 Created` - Cost successfully created
- `400 Bad Request` - Invalid fields, non-existent user, or past date

#### **GET** `/api/report`

Generate a monthly cost report for a user.

**Query Parameters:**
- `id` or `userid`: User ID (positive integer)
- `year`: Year (positive integer)
- `month`: Month number 1-12

**Example:** `/api/report?userid=123456&year=2024&month=1`

**Response:** `200 OK`
```json
{
  "userid": 123456,
  "year": 2024,
  "month": 1,
  "costs": [
    {
      "food": [
        {
          "day": 15,
          "description": "Grocery shopping",
          "sum": 85.50
        }
      ]
    },
    {
      "health": []
    },
    {
      "housing": []
    }
  ]
}
```

**Computed Design Pattern:**
This endpoint implements intelligent caching:
- **Past months:** Reports are cached in the database after first generation
- **Current/future months:** Always computed on-demand (data may change)
- Significantly improves performance for historical data

**Responses:**
- `200 OK` - Report generated/retrieved
- `400 Bad Request` - Invalid parameters or non-existent user

---

### 4. About Service (Port 3004)

Provides information about the development team.

#### **GET** `/api/about`

Returns the list of developers who built this application.

**Response:** `200 OK`
```json
[
  {
    "first_name": "Guy",
    "last_name": "Cohen"
  },
  {
    "first_name": "Baruch",
    "last_name": "Ilyayev"
  },
  {
    "first_name": "Michael",
    "last_name": "Chernyak"
  }
]
```

---

## Features

### Logging System
- All HTTP requests are automatically logged to MongoDB
- Logs include service name, method, URL, timestamp, and message
- Centralized log retrieval through Logs service

### Data Validation
- Comprehensive input validation on all endpoints
- Prevents future-dated costs and birthdays
- Category enforcement for cost entries
- Foreign key validation (user existence checks)

### Performance Optimization
- **Computed Design Pattern** for report caching
- MongoDB aggregation for efficient total cost calculation
- Lean queries for improved performance

### Error Handling
- Consistent error response format
- Appropriate HTTP status codes
- Internal error logging with Pino

## Database Models

### User
```javascript
{
  id: Number,          // Unique user identifier
  first_name: String,  // User's first name
  last_name: String,   // User's last name
  birthday: Date       // User's date of birth
}
```

### Cost
```javascript
{
  description: String, // Cost description
  category: String,    // Category (food, health, etc.)
  userid: Number,      // Reference to user
  sum: Number,         // Cost amount
  date: Date          // Cost date
}
```

### Report (Cached)
```javascript
{
  userid: Number,     // User ID
  year: Number,       // Report year
  month: Number,      // Report month (1-12)
  costs: Array        // Grouped costs by category
}
```

### Log
```javascript
{
  service: String,    // Service name
  method: String,     // HTTP method
  url: String,        // Request URL
  time: Date,         // Request timestamp
  message: String     // Log message
}
```

## Project Structure

```
nodejs_final_project/
├── .workspace/                  # Workspace configuration
│   ├── .gitignore              # Workspace Git ignore rules
│   └── settings.local.json     # Local workspace settings
├── config/                      # Configuration files
│   ├── categories.js           # Valid cost categories
│   ├── developers.js           # Team information
│   └── mongo_conn.js           # MongoDB connection configuration
├── models/                      # Mongoose models
│   ├── cost.model.js           # Cost entry schema
│   ├── log.model.js            # HTTP request log schema
│   ├── report.model.js         # Cached report schema
│   └── user.model.js           # User schema
├── routes/                      # Express route handlers
│   ├── about.routes.js         # About endpoint routes
│   ├── add_cost.routes.js      # Cost creation routes
│   ├── add_user.routes.js      # User creation routes
│   ├── log.routes.js           # Log retrieval routes
│   ├── report.routes.js        # Report generation routes
│   └── user.routes.js          # User retrieval routes
├── tests/                       # Jest test suites
│   ├── unit/                   # Unit tests
│   │   ├── about.test.js       # About service tests
│   │   ├── add_cost.test.js    # Cost creation tests
│   │   ├── add_user.test.js    # User creation tests
│   │   ├── logs.test.js        # Logs service tests
│   │   ├── report.test.js      # Report generation tests
│   │   ├── user_by_id.test.js  # User by ID retrieval tests
│   │   └── users.test.js       # User listing tests
│   ├── setup.js                # Jest global setup
│   └── teardown.js             # Jest global teardown
├── utils/                       # Utility functions
│   ├── createServiceApp.js     # Service app factory
│   ├── logger.js               # Pino logger configuration
│   └── startService.js         # Service initialization
├── .env                         # Environment variables (not in git)
├── .gitignore                   # Git ignore rules
├── about_app.js                 # About service entry point
├── costs_app.js                 # Costs service entry point
├── db.js                        # Database initialization
├── logs_app.js                  # Logs service entry point
├── users_app.js                 # Users service entry point
├── package.json                 # NPM dependencies and scripts
└── README.md                    # This file
```

## Development Notes

- All services use ES Modules (`"type": "module"` in package.json)
- MongoDB connection is established on service startup
- Each service can be developed and tested independently
- Pino logger provides structured JSON logging
- Jest tests use isolated database connections

## License

ISC
