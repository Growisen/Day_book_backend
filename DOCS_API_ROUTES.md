# Daybook Backend — API Reference

This document describes the Auth and Daybook API endpoints, request bodies, field logic, auth and tenant behavior, example requests/responses, and common errors. Use this as a reference when integrating clients (Postman, frontend, scripts).

## Table of contents

- Overview
- Authentication and token shape
- Enums / allowed values
- Auth routes
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/create-admin
  - GET /api/auth/me
  - GET /api/auth/admin-test
- Daybook routes
  - POST /api/daybook/create
  - PUT /api/daybook/update/:id
  - DELETE /api/daybook/delete/:id
  - GET /api/daybook/list
  - GET /api/daybook/:id
  - GET /api/daybook/nurse/:nurse_id
  - GET /api/daybook/client/:client_id
  - GET /api/daybook/date-range
  - GET /api/daybook/from-date
  - GET /api/daybook/download/excel
  - GET /api/daybook/summary/amounts
  - GET /api/daybook/revenue/net
- Errors & troubleshooting
- Security & tenant notes

---

## Overview

The API exposes authentication endpoints (register/login/admin creation) and a set of CRUD and reporting endpoints for the `day_book` table. Some endpoints require authentication (Authorization header). The concept of tenant is used to isolate data per tenant; admins can see all tenants' data.

All date/time fields use ISO-8601 where applicable. Amounts are numbers (no currency symbol in payload).

---

## Authentication and token shape

- Authentication is done with JWT tokens issued by the server after successful login or user creation.
- Include header: `Authorization: Bearer <token>` for protected routes.

JWT payload includes (minimum):
- userId: string (UUID)
- email: string
- role?: 'admin' | 'accountant' | 'staff'
- tenant?: Tenant (when applicable)

Example token payload (decoded):
```json
{
  "userId": "...uuid...",
  "email": "user@example.com",
  "role": "accountant",
  "tenant": "TATANursing",
  "iat": 1234567,
  "exp": 12345678
}
```

The `authenticateToken` middleware fetches user metadata from Supabase to populate `req.user` with id, email, role, tenant, created_at, updated_at.

---

## Enums / allowed values

The project defines these enums in `src/models/pay_creation.ts`:

- PayType:
  - `incoming`
  - `outgoing`

- PayStatus:
  - `paid`
  - `un_paid` (note underscore in codebase)

- ModeOfPay:
  - `cash`
  - `upi`
  - `account_transfer`

- PaymentTypeSpecific:
  - `client_payment_received`
  - `nurse_salary_paid`
  - `office_expenses_paid`
  - `student_fee_received`

- Tenant:
  - `TATANursing`
  - `Dearcare`
  - `DearcareAcademy`

- UserRole:
  - `admin`
  - `accountant`
  - `staff`

---

## Auth routes

### POST /api/auth/register

- Access: requireAdmin (only an admin can register new users)
- Purpose: create non-admin users
- Request body (JSON):
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "accountant",
  "tenant": "TATANursing"
}
```
- Validation logic:
  - All fields required
  - `password` and `confirmPassword` must match and meet length requirements
  - `role` must be one of `UserRole`
  - `tenant` must be one of `Tenant`
- Response: 201 created with token and user object or 400 on validation errors


### POST /api/auth/login

- Access: public
- Purpose: sign-in existing users
- Request body (JSON):
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- On success returns a JWT token and user metadata. Token payload includes role and tenant (from Supabase user metadata).

### POST /api/auth/create-admin

- Access: public (designed to bootstrap the first admin) — route guards that only allow creation if there is no existing admin
- Purpose: create the first admin user
- Notes: Tenant is optional for admin accounts. If provided it will be saved in user metadata; otherwise admin will have no tenant.
- Request body (JSON):
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "tenant": "TATANursing" // optional
}
```
- Logic:
  - Validates passwords and (optionally) tenant
  - If tenant is omitted, user metadata for tenant is not set
  - If an admin already exists, the route returns 403

### GET /api/auth/me

- Access: Requires authentication
- Purpose: Retrieve currently authenticated user's metadata from Supabase
- Authorization: `Authorization: Bearer <token>`
- Response: user details including role, tenant, created_at, last_sign_in_at

### GET /api/auth/admin-test

- Access: requireAdmin middleware (admin-only)
- Purpose: Internal test route to verify admin privileges and retrieve system info

---

## Daybook routes

Notes about tenant behavior:
- Read routes (GET endpoints) apply tenant filtering automatically: if the requester is an admin (role === 'admin') they see all data; otherwise only rows where `tenant` equals `req.user.tenant` are returned.
- Create/Update/Delete were intentionally left unchanged in the current implementation; the request body may contain a `tenant` property. Recommended best practice: set `tenant` server-side from `req.user.tenant` for non-admins when creating/updating records (prevents cross-tenant writes).

### Common headers
- For protected routes include: `Authorization: Bearer <token>`
- For JSON bodies: `Content-Type: application/json`
- For file upload (receipt): `Content-Type: multipart/form-data` and send fields as form-data

### POST /api/daybook/create

- Access: public in current code (no authenticateToken) but uses `upload.single('receipt')` to accept a file
- Request body (JSON) or multipart/form-data (if uploading `receipt`): fields:
  - amount: number (required) — must be a valid finite number (server validates and rejects NaN)
  - payment_type: `incoming` | `outgoing` (required)
  - pay_status: `paid` | `un_paid` (required)
  - mode_of_pay: `cash` | `upi` | `account_transfer` (optional)
  - description: string (optional)
  - payment_type_specific: `client_payment_received` | `nurse_salary_paid` | `office_expenses_paid` | `student_fee_received` (optional)
  - payment_description: string (optional) — detailed text description
  - tenant: one of Tenant (required in current create implementation; recommended to derive from token for non-admins)
  - nurse_id: string (optional) — only relevant to `outgoing` payments
  - client_id: string (optional) — only relevant to `incoming` payments
  - receipt: file (optional) — multipart field named `receipt`

- Validation logic implemented in server:
  - `amount` is coerced using `Number(...)` and must be finite — otherwise 400 `amount is required and must be a valid number`
  - `tenant` is validated against allowed tenants
  - `nurse_id` and `client_id` are validated to not be empty strings if provided
  - The server removes mismatched ids: if `payment_type` === `incoming` the server removes `nurse_id`; if `outgoing` removes `client_id`

- Example JSON request (no file):
```json
{
  "amount": 2000,
  "payment_type": "incoming",
  "pay_status": "paid",
  "mode_of_pay": "account_transfer",
  "description": "General incoming payment",
  "payment_type_specific": "client_payment_received",
  "payment_description": "Payment received for services rendered",
  "tenant": "TATANursing",
  "client_id": "CLIENT123"
}
```

- Example multipart form-data (key/value):
  - amount: 2000
  - payment_type: incoming
  - pay_status: paid
  - mode_of_pay: account_transfer
  - description: General incoming payment
  - tenant: TATANursing
  - client_id: CLIENT123
  - receipt: (file upload)

- Response: 201 with created record JSON; server logs sanitized payload before insert

- Common error: "invalid input syntax for type bigint: \"NaN\"" — occurs when non-numeric or malformed data is being inserted into a bigint column (e.g. id or amount). The server now validates amount and sanitizes payload (removes id/created_at) to avoid this.


### PUT /api/daybook/update/:id

- Access: upload.single('receipt') is used so this endpoint can accept multipart/form-data when updating the `receipt`
- Request params: `id` (path param) — numeric id
- Request body (JSON or form-data): Partial DayBook fields. If `amount` provided, server coerces it to Number and rejects if not finite.
- Server validates `tenant` if provided, and validates `nurse_id`/`client_id` as non-empty strings if present.
- Server removes mismatched id fields when changing `payment_type`.
- Response: 200 with updated record or 404 if not found

### DELETE /api/daybook/delete/:id

- Access: `authenticateToken` middleware applied (requires Authorization header)
- Request params: `id` (path param)
- Response: 200 on success, 404 if not found

### GET /api/daybook/list

- Access: `authenticateToken` required
- Query parameters (optional):
  - type: `incoming` | `outgoing` — fetch by payment type
  - nurse_id: string — fetch outgoing records for nurse
  - client_id: string — fetch incoming records for client

- Tenant behavior: if requester is admin (role === 'admin') returns across tenants; otherwise only rows where `tenant` == `req.user.tenant`.

- Response: 200 with list of matching daybook records

### GET /api/daybook/:id

- Access: `authenticateToken` required
- Path param: id (numeric)
- Tenant behavior: non-admins will only get the record if its `tenant` matches `req.user.tenant`.

### GET /api/daybook/nurse/:nurse_id

- Access: `authenticateToken` required
- Path param: `nurse_id` (string)
- Returns outgoing payments for the nurse. Filtered by tenant for non-admin users.

### GET /api/daybook/client/:client_id

- Access: `authenticateToken` required
- Path param: `client_id` (string)
- Returns incoming payments for the client. Filtered by tenant for non-admin users.

### GET /api/daybook/date-range

- Access: `authenticateToken` required
- Query params (required): `start_date` and `end_date` (string dates)
- Behavior: returns rows with created_at between provided dates; tenant-filtered for non-admins

### GET /api/daybook/from-date

- Access: `authenticateToken` required
- Query param: `start_date` (string date) — returns records from `start_date` to now; tenant-filtered for non-admins

### GET /api/daybook/download/excel

- Access: `authenticateToken` required
- Query params (optional): `start_date`, `end_date`, `type`
- Generates an Excel workbook (xlsx) downloaded as response. The server formats columns and includes a small summary header.
- Tenant-filter: non-admins only download their tenant's data.

### GET /api/daybook/summary/amounts

- Access: `authenticateToken` required
- Query params (optional): `start_date`, `end_date`
- Returns aggregated summary:
  - total_paid_amount
  - total_pending_amount
  - total_entries
  - paid_entries_count
  - pending_entries_count
- Tenant-filter: non-admins only receive summary for their tenant

### GET /api/daybook/revenue/net

- Access: `authenticateToken` required
- Query params (optional): `start_date`, `end_date`
- Returns net revenue calculation (total incoming minus total outgoing) and counts
- Tenant-filter: non-admins only receive metrics for their tenant

---

## Errors & troubleshooting

- 400 Bad Request
  - Missing required fields or failed validations (amount not numeric, invalid tenant, invalid role, password mismatch)
- 401 Unauthorized
  - Missing/invalid Authorization header or token
- 403 Forbidden
  - Register route when non-admin attempts admin-only action or create-admin when admin exists
- 404 Not Found
  - Resource not found for the provided id
- 500 Server Error
  - Unexpected server or Supabase issues. Server logs include sanitized payload and Supabase error details.

Common problem: "invalid input syntax for type bigint: \"NaN\""
- This indicates an attempt to insert a non-numeric string into a bigint column (likely `id` or `amount` depending on schema). Mitigations:
  - Ensure `amount` is a number (not empty string). When sending multipart/form-data make sure numeric fields are included as form fields with a numeric value.
  - The server now coerces amount with Number() and rejects NaN; it also strips `id` and `created_at` before insert.

---

## Security & tenant notes (recommended)

- Currently create/update accept `tenant` from the request body. This can be a security risk because a non-admin client could attempt to write records to another tenant. Recommended change:
  - For non-admin users, override `tenant` server-side using `req.user.tenant` when creating/updating records.
  - Admin requests can continue to accept client-supplied tenant when needed.

- Consider adding stricter schema validation using `zod` or `express-validator` to centralize validation and return consistent error messages.

---

## Quick test examples (PowerShell)

Login and use token then fetch list (PowerShell):
```powershell
# Login
$login = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"admin@example.com","password":"password123"}'
$token = $login.token

# List daybook with token
Invoke-RestMethod -Uri 'http://localhost:5000/api/daybook/list' -Method Get -Headers @{ Authorization = "Bearer $token" }
```

Create a daybook record (JSON, when not uploading file):
```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/daybook/create' -Method Post -ContentType 'application/json' -Body '{
  "amount": 2000,
  "payment_type": "incoming",
  "pay_status": "paid",
  "mode_of_pay": "account_transfer",
  "description": "General incoming payment",
  "tenant": "TATANursing"
}'
```

Create with file (curl example):
```bash
curl -X POST 'http://localhost:5000/api/daybook/create' \
  -H 'Authorization: Bearer <token>' \
  -F 'amount=2000' \
  -F 'payment_type=incoming' \
  -F 'pay_status=paid' \
  -F 'mode_of_pay=account_transfer' \
  -F 'description=Receipt test' \
  -F 'tenant=TATANursing' \
  -F 'receipt=@/path/to/receipt.jpg'
```

---

If you want, I can:
- Enforce server-side tenant assignment for non-admins (recommended security change) and update the docs accordingly.
- Add JSON schema or zod-based validation and include sample tests.
- Add Postman collection exported to the repo.

---

File generated by developer tools - place under project root as `DOCS_API_ROUTES.md`.
