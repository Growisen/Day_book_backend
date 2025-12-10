# Latest Updates - December 9, 2025

## Create Daybook Entry

**Endpoint:** `POST /api/daybook/create`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 5000,
  "payment_type": "incoming",
  "pay_status": "paid",
  "mode_of_pay": "upi",
  "description": "Client payment for services",
  "tenant": "Dearcare",
  "payment_type_specific": "client_payment_received",()
  "payment_description": "Monthly retainer fee",
  "client_id": "CLI001",
  "custom_paid_date": "2025-12-09"
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:3000/api/daybook/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "payment_type": "incoming",
    "pay_status": "paid",
    "mode_of_pay": "upi",
    "description": "Client payment for services",
    "tenant": "Dearcare",
    "payment_type_specific": "client_payment_received",
    "payment_description": "Monthly retainer fee",
    "client_id": "CLI001",
    "custom_paid_date": "2025-12-09"
  }'
```

**Fields:**
- `amount` (required): Number - Payment amount
- `payment_type` (required): String - "incoming" or "outgoing"
- `pay_status` (required): String - "paid" or "un_paid"
- `mode_of_pay` (optional): String - "cash", "upi", or "account_transfer"
- `description` (optional): String - Payment description
- `tenant` (required): String - "TATANursing", "Dearcare", "DearcareAcademy", or "Personal"
- `payment_type_specific` (optional): String - "client_payment_received", "nurse_salary_paid", "office_expenses_paid", "student_fee_received", or "commission"
- `payment_description` (optional): String - Additional payment details
- `client_id` (optional): String - Client ID (for incoming payments)
- `nurse_id` (optional): String - Nurse ID (for outgoing payments)
- `nurse_sal` (optional): Number - Salary payment ID (for nurse salary)
- `custom_paid_date` (optional): Date - Custom payment date (YYYY-MM-DD format)
- `created_by` (auto): String - Email of user who created entry (populated automatically)

**Success Response (201):**
```json
{
  "message": "Day book entry created successfully",
  "data": {
    "id": 338,
    "created_at": "2025-12-09T15:42:33.450213+00:00",
    "amount": 5000,
    "payment_type": "incoming",
    "pay_status": "paid",
    "description": "Client payment for services",
    "mode_of_pay": "upi",
    "receipt": null,
    "nurse_id": null,
    "client_id": "CLI001",
    "tenant": "Dearcare",
    "nurse_sal": null,
    "payment_type_specific": "client_payment_received",
    "payment_description": "Monthly retainer fee",
    "custom_paid_date": "2025-12-09T00:00:00.000Z",
    "created_by": "user@example.com"
  }
}
```

---

## Recent Changes Added

### 1. Custom Paid Date Field
- Added `custom_paid_date` field to daybook entries
- Allows specifying a custom date for when payment was made/received
- Format: YYYY-MM-DD or ISO date string

### 2. Created By Field
- Added `created_by` field to track which user created each entry
- Automatically populated with the logged-in user's email
- Cannot be modified after creation

### 3. Commission Payment Type
- Added "commission" to `payment_type_specific` enum in `src/models/pay_creation.ts`
- Can now track commission payments separately
- Available values: "client_payment_received", "nurse_salary_paid", "office_expenses_paid", "student_fee_received", "commission"

### 4. Banking Module (Complete)
- Full banking functionality with separate tables
- Bank account management (CRUD operations)
- Transaction types: deposit, withdraw, transfer, cheque
- Transaction update and delete endpoints
- Balance tracking and automatic updates
- Tenant-based filtering

### 5. Personal Daybook Refactor
- Changed from user-specific to tenant-based
- Uses "Personal" tenant for centralized personal entries
- Added date filtering and balance summary endpoints

---

## Update Bank Transaction

**Endpoint:** `PUT /api/banking/transactions/update/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**URL Parameters:**
- `id` - Transaction ID (integer)

**Request Body:**
```json
{
  "description": "Updated transaction description",
  "reference": "REF-UPDATE-12345",
  "cheque_number": "CHQ-987654",
  "status": "completed"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:3000/api/banking/transactions/update/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated transaction description",
    "reference": "REF-UPDATE-12345"
  }'
```

**Updatable Fields:**
- `description` (optional): String - Transaction description
- `reference` (optional): String - Reference number
- `cheque_number` (optional): String - Cheque number
- `status` (optional): String - Transaction status

**Note:** Cannot update `amount`, `transaction_type`, or `account_id` to prevent balance inconsistencies.

**Success Response (200):**
```json
{
  "message": "Transaction updated successfully",
  "data": {
    "id": 1,
    "bank_account_id": 5,
    "transaction_type": "deposit",
    "amount": 10000,
    "description": "Updated transaction description",
    "reference": "REF-UPDATE-12345",
    "cheque_number": null,
    "from_account_id": null,
    "to_account_id": null,
    "status": "completed",
    "tenant": "Dearcare",
    "created_at": "2025-12-09T10:00:00.000Z"
  }
}
```

---

## Delete Bank Transaction

**Endpoint:** `DELETE /api/banking/transactions/delete/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**URL Parameters:**
- `id` - Transaction ID (integer)

**cURL Example:**
```bash
curl -X DELETE "http://localhost:3000/api/banking/transactions/delete/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "message": "Transaction deleted successfully",
  "warning": "Note: This does not reverse the balance changes. Account balances remain as they were."
}
```

**⚠️ Important Warning:**
- Deleting a transaction removes the record from the database
- **Account balances are NOT reversed** - they remain as they were after the transaction
- If you need to reverse a transaction, consider creating an opposite transaction instead
- Only delete transactions if you're certain about the action

