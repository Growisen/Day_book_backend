# Personal Daybook Module - API Documentation

## Overview
The Personal Daybook module provides a centralized system for tracking personal income and expenses. Unlike the company daybook which is user-specific, the personal module uses a **tenant-based approach** with a special "Personal" tenant, allowing designated users and admins to access shared personal financial records.

---

## Table of Contents
- [Access Control](#access-control)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Request Examples](#request-examples)
- [Response Examples](#response-examples)
- [Error Handling](#error-handling)

---

## Access Control

### Who Can Access Personal Daybook?

1. **Users with `tenant: "Personal"`**
   - Can view, create, update, and delete all personal entries
   - Shares access with other "Personal" tenant users

2. **Admin Users (`role: "admin"`)**
   - Can access personal entries regardless of their own tenant
   - Full CRUD permissions

3. **Other Users (TATANursing, Dearcare, etc.)**
   - **403 Forbidden** - Cannot access personal entries
   - Need to have their tenant changed to "Personal" to gain access

### Creating a Personal User

```bash
# Admin must create user with tenant: "Personal"
POST /api/auth/register
{
  "email": "personal.user@example.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123",
  "role": "accountant",
  "tenant": "Personal"
}
```

---

## Database Schema

### Table: `daybook_personal`

```sql
CREATE TABLE daybook_personal (
  id SERIAL PRIMARY KEY,
  tenant VARCHAR(100) NOT NULL,
  paytype VARCHAR(50) NOT NULL CHECK (paytype IN ('incoming', 'outgoing')),
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | Auto | Primary key, auto-increment |
| `tenant` | VARCHAR(100) | YES | Always set to "Personal" |
| `paytype` | VARCHAR(50) | YES | Payment direction: `incoming` or `outgoing` |
| `amount` | NUMERIC(15,2) | YES | Payment amount (must be positive) |
| `description` | TEXT | NO | Optional text description |
| `created_at` | TIMESTAMP | Auto | Timestamp when entry was created |

### Indexes (Recommended)

```sql
CREATE INDEX idx_daybook_personal_tenant ON daybook_personal(tenant);
CREATE INDEX idx_daybook_personal_paytype ON daybook_personal(paytype);
CREATE INDEX idx_daybook_personal_created_at ON daybook_personal(created_at DESC);
```

---

## API Endpoints

**Base Path:** `/api/personal`

**Authentication:** All endpoints require `Authorization: Bearer <token>` header

### Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create personal entry |
| GET | `/` | Get all personal entries (with filters) |
| GET | `/:id` | Get single entry by ID |
| PUT | `/:id` | Update entry by ID |
| DELETE | `/:id` | Delete entry by ID |
| GET | `/summary/balance` | Get net balance summary |

---

## API Endpoints - Detailed

### 1. Create Personal Entry

**POST** `/api/personal`

Creates a new personal daybook entry.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "paytype": "incoming",      // Required: "incoming" or "outgoing"
  "amount": 5000,             // Required: positive number
  "description": "Optional text description"  // Optional
}
```

**Success Response (201):**
```json
{
  "message": "Personal daybook entry created",
  "data": {
    "id": 1,
    "tenant": "Personal",
    "paytype": "incoming",
    "amount": 5000,
    "description": "Optional text description",
    "created_at": "2025-12-01T10:30:00Z"
  }
}
```

**Validation Rules:**
- `paytype` must be exactly `"incoming"` or `"outgoing"`
- `amount` must be a valid positive number
- `description` is optional

---

### 2. Get All Personal Entries

**GET** `/api/personal`

Retrieves all personal entries with optional filtering.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters (all optional):**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `start_date` | string | ISO date - start of range (inclusive) | `2025-11-01` |
| `end_date` | string | ISO date - end of range (inclusive) | `2025-11-30` |
| `paytype` | string | Filter by type: `incoming` or `outgoing` | `incoming` |

**Examples:**

```bash
# All entries
GET /api/personal

# Entries from November onwards
GET /api/personal?start_date=2025-11-01

# Entries in November only
GET /api/personal?start_date=2025-11-01&end_date=2025-11-30

# Only incoming payments
GET /api/personal?paytype=incoming

# Incoming payments in November
GET /api/personal?start_date=2025-11-01&end_date=2025-11-30&paytype=incoming

# Today's entries
GET /api/personal?start_date=2025-12-01&end_date=2025-12-01
```

**Success Response (200):**
```json
{
  "message": "Personal entries fetched",
  "count": 3,
  "filters": {
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "paytype": "incoming"
  },
  "data": [
    {
      "id": 5,
      "tenant": "Personal",
      "paytype": "incoming",
      "amount": 7000,
      "description": "Freelance payment",
      "created_at": "2025-11-25T10:30:00Z"
    },
    {
      "id": 3,
      "tenant": "Personal",
      "paytype": "incoming",
      "amount": 5000,
      "description": "Client payment",
      "created_at": "2025-11-15T14:20:00Z"
    }
  ]
}
```

---

### 3. Get Single Entry

**GET** `/api/personal/:id`

Retrieves a specific personal entry by ID.

**Headers:**
- `Authorization: Bearer <token>`

**Path Parameters:**
- `id` - Entry ID (integer)

**Success Response (200):**
```json
{
  "message": "Personal entry fetched",
  "data": {
    "id": 5,
    "tenant": "Personal",
    "paytype": "incoming",
    "amount": 7000,
    "description": "Freelance payment",
    "created_at": "2025-11-25T10:30:00Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Personal entry not found"
}
```

---

### 4. Update Entry

**PUT** `/api/personal/:id`

Updates an existing personal entry.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Path Parameters:**
- `id` - Entry ID (integer)

**Request Body (all fields optional):**
```json
{
  "paytype": "outgoing",           // Optional: "incoming" or "outgoing"
  "amount": 6000,                  // Optional: positive number
  "description": "Updated description"  // Optional
}
```

**Examples:**

```json
// Update only amount
{
  "amount": 6000
}

// Update paytype and description
{
  "paytype": "outgoing",
  "description": "Changed to expense"
}

// Update all fields
{
  "paytype": "incoming",
  "amount": 7500,
  "description": "Updated payment amount"
}
```

**Success Response (200):**
```json
{
  "message": "Personal entry updated",
  "data": {
    "id": 5,
    "tenant": "Personal",
    "paytype": "incoming",
    "amount": 6000,
    "description": "Updated description",
    "created_at": "2025-11-25T10:30:00Z"
  }
}
```

**Validation Rules:**
- At least one field must be provided
- `amount` must be positive if provided
- `paytype` must be `"incoming"` or `"outgoing"` if provided

**Error Responses:**
- `400` - Validation error (invalid amount, paytype, or no fields to update)
- `404` - Entry not found

---

### 5. Delete Entry

**DELETE** `/api/personal/:id`

Deletes a personal entry permanently.

**Headers:**
- `Authorization: Bearer <token>`

**Path Parameters:**
- `id` - Entry ID (integer)

**Success Response (200):**
```json
{
  "message": "Personal entry deleted"
}
```

**Error Response (404):**
```json
{
  "error": "Personal entry not found or delete failed"
}
```

---

### 6. Get Balance Summary

**GET** `/api/personal/summary/balance`

Calculates net balance (incoming - outgoing) with optional date filtering.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters (all optional):**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `start_date` | string | ISO date - start of range | `2025-11-01` |
| `end_date` | string | ISO date - end of range | `2025-11-30` |

**Examples:**

```bash
# Overall balance (all time)
GET /api/personal/summary/balance

# Balance from November onwards
GET /api/personal/summary/balance?start_date=2025-11-01

# Balance for November only
GET /api/personal/summary/balance?start_date=2025-11-01&end_date=2025-11-30

# Today's balance
GET /api/personal/summary/balance?start_date=2025-12-01&end_date=2025-12-01
```

**Success Response (200):**
```json
{
  "message": "Balance summary retrieved successfully",
  "summary": {
    "total_incoming": 15000,
    "total_outgoing": 8200,
    "net_balance": 6800,
    "incoming_count": 5,
    "outgoing_count": 3,
    "total_entries": 8,
    "date_range": {
      "start_date": "2025-11-01",
      "end_date": "2025-11-30"
    }
  }
}
```

**Response Fields:**
- `total_incoming` - Sum of all incoming amounts
- `total_outgoing` - Sum of all outgoing amounts
- `net_balance` - Incoming minus outgoing (can be negative)
- `incoming_count` - Number of incoming entries
- `outgoing_count` - Number of outgoing entries
- `total_entries` - Total entries in the period
- `date_range` - Shows the applied date filter

---

## Request Examples

### Using cURL

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sampledearcare@gmail.com",
    "password": "SecurePassword123"
  }' | jq -r '.token')

# 2. Create incoming entry
curl -X POST "http://localhost:3000/api/personal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "paytype": "incoming",
    "amount": 5000,
    "description": "Freelance project payment"
  }'

# 3. Create outgoing entry
curl -X POST "http://localhost:3000/api/personal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "paytype": "outgoing",
    "amount": 1200,
    "description": "Rent payment"
  }'

# 4. Get all entries
curl -X GET "http://localhost:3000/api/personal" \
  -H "Authorization: Bearer $TOKEN"

# 5. Get entries from last month
curl -X GET "http://localhost:3000/api/personal?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer $TOKEN"

# 6. Get only incoming payments
curl -X GET "http://localhost:3000/api/personal?paytype=incoming" \
  -H "Authorization: Bearer $TOKEN"

# 7. Get today's entries
curl -X GET "http://localhost:3000/api/personal?start_date=2025-12-01&end_date=2025-12-01" \
  -H "Authorization: Bearer $TOKEN"

# 8. Get single entry (ID = 1)
curl -X GET "http://localhost:3000/api/personal/1" \
  -H "Authorization: Bearer $TOKEN"

# 9. Update entry
curl -X PUT "http://localhost:3000/api/personal/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 6000,
    "description": "Updated amount"
  }'

# 10. Get balance summary (all time)
curl -X GET "http://localhost:3000/api/personal/summary/balance" \
  -H "Authorization: Bearer $TOKEN"

# 11. Get balance for November
curl -X GET "http://localhost:3000/api/personal/summary/balance?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer $TOKEN"

# 12. Delete entry
curl -X DELETE "http://localhost:3000/api/personal/1" \
  -H "Authorization: Bearer $TOKEN"
```

### JavaScript/Fetch Examples

```javascript
const API_BASE = 'http://localhost:3000/api';
let token = ''; // Get from login

// Login
const login = async () => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sampledearcare@gmail.com',
      password: 'SecurePassword123'
    })
  });
  const data = await response.json();
  token = data.token;
  return token;
};

// Create entry
const createEntry = async (paytype, amount, description) => {
  const response = await fetch(`${API_BASE}/personal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ paytype, amount, description })
  });
  return await response.json();
};

// Get all entries with filters
const getEntries = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/personal?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// Get balance summary
const getBalance = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE}/personal/summary/balance?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// Update entry
const updateEntry = async (id, updates) => {
  const response = await fetch(`${API_BASE}/personal/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return await response.json();
};

// Delete entry
const deleteEntry = async (id) => {
  const response = await fetch(`${API_BASE}/personal/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// Usage examples
await login();
await createEntry('incoming', 5000, 'Freelance payment');
await getEntries({ paytype: 'incoming' });
await getEntries({ start_date: '2025-11-01', end_date: '2025-11-30' });
await getBalance('2025-11-01', '2025-11-30');
await updateEntry(1, { amount: 6000 });
await deleteEntry(1);
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (entry created) |
| 400 | Bad Request | Invalid data, validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User doesn't have "Personal" tenant access |
| 404 | Not Found | Entry with given ID doesn't exist |
| 500 | Server Error | Database error or unexpected server issue |

### Error Response Format

All errors return JSON with an `error` field:

```json
{
  "error": "Error message here"
}
```

### Common Errors

#### 1. Access Denied (403)
```json
{
  "error": "Access denied. You do not have permission to access personal entries."
}
```
**Cause:** User's tenant is not "Personal" and user is not an admin.

**Solution:** Have an admin update the user's tenant to "Personal" in Supabase user metadata.

#### 2. Validation Errors (400)
```json
{
  "error": "amount is required and must be a valid positive number"
}
```

```json
{
  "error": "paytype is required and must be \"incoming\" or \"outgoing\""
}
```

```json
{
  "error": "No fields to update"
}
```

#### 3. Not Found (404)
```json
{
  "error": "Personal entry not found"
}
```

#### 4. Unauthorized (401)
```json
{
  "error": "Access token required"
}
```

```json
{
  "error": "Invalid token"
}
```

---

## Business Rules

1. **Tenant Isolation**
   - All personal entries have `tenant = "Personal"`
   - Automatically set by the API (user cannot override)

2. **Access Control**
   - Only users with `tenant: "Personal"` or `role: "admin"` can access
   - Other tenants (TATANursing, Dearcare, etc.) get 403 Forbidden

3. **Amount Validation**
   - Must be a positive number
   - Stored as `NUMERIC(15,2)` for precision

4. **Payment Type**
   - Only two values allowed: `"incoming"` or `"outgoing"`
   - Case-sensitive

5. **Timestamps**
   - `created_at` is set automatically by database
   - Cannot be modified after creation
   - Used for date filtering

6. **Deletion**
   - Permanent - no soft delete
   - No cascade effects (personal entries are standalone)

---

## Migration Guide

### From User-Specific to Tenant-Based

If migrating from the old user-specific personal system:

```sql
-- 1. Add tenant column
ALTER TABLE daybook_personal ADD COLUMN tenant VARCHAR(100);

-- 2. Set all existing entries to Personal tenant
UPDATE daybook_personal SET tenant = 'Personal';

-- 3. Remove user_id column (after backup!)
ALTER TABLE daybook_personal DROP COLUMN user_id;

-- 4. Make tenant NOT NULL
ALTER TABLE daybook_personal ALTER COLUMN tenant SET NOT NULL;
```

### Creating Personal Users

Admins can create users with Personal tenant access:

```bash
POST /api/auth/register
{
  "email": "newuser@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "accountant",
  "tenant": "Personal"
}
```

---

## Sample Use Cases

### Use Case 1: Monthly Expense Tracking

```javascript
// Get November expenses
const novemberExpenses = await fetch(
  '/api/personal?start_date=2025-11-01&end_date=2025-11-30&paytype=outgoing',
  { headers: { Authorization: `Bearer ${token}` }}
);

// Get November income
const novemberIncome = await fetch(
  '/api/personal?start_date=2025-11-01&end_date=2025-11-30&paytype=incoming',
  { headers: { Authorization: `Bearer ${token}` }}
);

// Get net balance for November
const balance = await fetch(
  '/api/personal/summary/balance?start_date=2025-11-01&end_date=2025-11-30',
  { headers: { Authorization: `Bearer ${token}` }}
);
```

### Use Case 2: Today's Transactions

```bash
# View today's transactions
curl "http://localhost:3000/api/personal?start_date=2025-12-01&end_date=2025-12-01" \
  -H "Authorization: Bearer $TOKEN"

# Today's net balance
curl "http://localhost:3000/api/personal/summary/balance?start_date=2025-12-01&end_date=2025-12-01" \
  -H "Authorization: Bearer $TOKEN"
```

### Use Case 3: Categorized Income

```bash
# All freelance income (search by description)
# Note: Currently no text search - would need to filter client-side
curl "http://localhost:3000/api/personal?paytype=incoming" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | select(.description | contains("Freelance"))'
```

---

## Notes

- **Privacy:** Unlike company daybook (tenant-based), personal entries are shared among all "Personal" tenant users
- **No User Isolation:** Personal entries are NOT user-specific - all "Personal" users see the same data
- **Simple Schema:** Intentionally minimal - no complex fields like receipts, payment modes, etc.
- **Date Format:** ISO 8601 format recommended (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`)
- **Sorting:** Always returns newest entries first (`created_at DESC`)

---

*Last Updated: December 1, 2025*
