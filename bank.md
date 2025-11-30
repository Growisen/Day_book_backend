# Banking Module - Database Schema

## Overview
The banking module consists of two main tables:
1. **bank_accounts** - Stores bank account information
2. **transactions_bank** - Records all banking transactions (deposits, withdrawals, transfers, cheques)

---

## Table 1: `bank_accounts`

### Description
Stores information about bank accounts managed in the system.

### Schema

```sql
CREATE TABLE bank_accounts (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  shortform VARCHAR(50) NOT NULL,
  account_number VARCHAR(100),
  ifsc VARCHAR(20),
  branch VARCHAR(255),
  balance NUMERIC(15, 2) DEFAULT 0.00,
  tenant VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Fields

| Field          | Type                      | Nullable | Description                                    |
|----------------|---------------------------|----------|------------------------------------------------|
| id             | SERIAL                    | NO       | Primary key, auto-increment                    |
| bank_name      | VARCHAR(255)              | NO       | **Required** - Name of the bank                |
| account_name   | VARCHAR(255)              | NO       | **Required** - Name of the account holder      |
| shortform      | VARCHAR(50)               | NO       | **Required** - Short form/abbreviation         |
| account_number | VARCHAR(100)              | YES      | Bank account number                            |
| ifsc           | VARCHAR(20)               | YES      | IFSC code                                      |
| branch         | VARCHAR(255)              | YES      | Branch name                                    |
| balance        | NUMERIC(15, 2)            | YES      | Current account balance (default: 0.00)        |
| tenant         | VARCHAR(100)              | YES      | Tenant identifier for multi-tenancy            |
| created_at     | TIMESTAMP WITH TIME ZONE  | YES      | Timestamp when record was created              |
| updated_at     | TIMESTAMP WITH TIME ZONE  | YES      | Timestamp when record was last updated         |

### Indexes (Recommended)

```sql
CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant);
CREATE INDEX idx_bank_accounts_shortform ON bank_accounts(shortform);
```

---

## Table 2: `transactions_bank`

### Description
Records all banking transactions including deposits, withdrawals, transfers between accounts, and cheque issuances.

### Schema

```sql
CREATE TABLE transactions_bank (
  id SERIAL PRIMARY KEY,
  bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'transfer', 'cheque')),
  amount NUMERIC(15, 2) NOT NULL,
  from_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
  to_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
  cheque_number VARCHAR(100),
  reference VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  tenant VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Fields

| Field              | Type                      | Nullable | Description                                           |
|--------------------|---------------------------|----------|-------------------------------------------------------|
| id                 | SERIAL                    | NO       | Primary key, auto-increment                           |
| bank_account_id    | INTEGER                   | NO       | FK to bank_accounts - main account for transaction    |
| transaction_type   | VARCHAR(50)               | NO       | Type: 'deposit', 'withdraw', 'transfer', 'cheque'     |
| amount             | NUMERIC(15, 2)            | NO       | Transaction amount                                    |
| from_account_id    | INTEGER                   | YES      | FK to bank_accounts - source account (for transfers)  |
| to_account_id      | INTEGER                   | YES      | FK to bank_accounts - destination (for transfers)     |
| cheque_number      | VARCHAR(100)              | YES      | Cheque number (for cheque transactions)               |
| reference          | VARCHAR(255)              | YES      | External reference/transaction ID                     |
| description        | TEXT                      | YES      | Detailed description of the transaction               |
| status             | VARCHAR(50)               | YES      | Status: 'completed', 'pending', 'failed'              |
| tenant             | VARCHAR(100)              | YES      | Tenant identifier for multi-tenancy                   |
| created_at         | TIMESTAMP WITH TIME ZONE  | YES      | Timestamp when transaction was created                |

### Indexes (Recommended)

```sql
CREATE INDEX idx_transactions_bank_account_id ON transactions_bank(bank_account_id);
CREATE INDEX idx_transactions_bank_type ON transactions_bank(transaction_type);
CREATE INDEX idx_transactions_bank_tenant ON transactions_bank(tenant);
CREATE INDEX idx_transactions_bank_created_at ON transactions_bank(created_at DESC);
CREATE INDEX idx_transactions_bank_from_account ON transactions_bank(from_account_id);
CREATE INDEX idx_transactions_bank_to_account ON transactions_bank(to_account_id);
```

---

## Transaction Types

### 1. Deposit
- Adds money to an account
- Updates `bank_accounts.balance` by adding the amount
- Fields used: `bank_account_id`, `amount`, `description`, `reference`

### 2. Withdraw
- Removes money from an account
- Updates `bank_accounts.balance` by subtracting the amount
- Validates sufficient balance before processing
- Fields used: `bank_account_id`, `amount`, `description`, `reference`

### 3. Transfer
- Moves money from one account to another
- Updates both source and destination account balances
- Validates sufficient balance in source account
- Fields used: `bank_account_id`, `from_account_id`, `to_account_id`, `amount`, `description`, `reference`

### 4. Cheque
- Issues a cheque from an account
- Updates `bank_accounts.balance` by subtracting the amount
- Validates sufficient balance before processing
- Fields used: `bank_account_id`, `amount`, `cheque_number`, `description`, `reference`

---

## Business Rules

1. **Balance Management**
   - Balance is automatically updated during transactions
   - Negative balances are prevented (validation in application layer)
   - Default balance for new accounts is 0.00

2. **Transaction Atomicity**
   - All balance updates and transaction records are created atomically
   - Failed transactions should not update balances

3. **Mandatory Fields**
   - Bank accounts MUST have: `bank_name`, `account_name`, `shortform`
   - All transactions MUST have: `bank_account_id`, `transaction_type`, `amount`

4. **Foreign Key Constraints**
   - `bank_account_id` must reference valid account
   - `from_account_id` and `to_account_id` must reference valid accounts (for transfers)
   - Cascade delete on bank_accounts removes associated transactions

5. **Multi-tenancy**
   - Both tables support optional `tenant` field for data isolation
   - Queries should filter by tenant except for admin users

---

## Migration Notes

### Creating Tables
Run the SQL schemas provided above in your Supabase SQL editor or migration tool.

### Adding RLS Policies (Optional)
If using Row Level Security in Supabase:

```sql
-- Enable RLS on both tables
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_bank ENABLE ROW LEVEL SECURITY;

-- Example policies (customize based on your auth setup)
CREATE POLICY "Users can view their tenant's bank accounts"
  ON bank_accounts FOR SELECT
  USING (tenant = current_setting('app.current_tenant')::text);

CREATE POLICY "Users can view their tenant's transactions"
  ON transactions_bank FOR SELECT
  USING (tenant = current_setting('app.current_tenant')::text);
```

### Sample Data

```sql
-- Insert sample bank account
INSERT INTO bank_accounts (bank_name, account_name, shortform, account_number, ifsc, balance, tenant)
VALUES ('State Bank of India', 'Company Current Account', 'SBI-CURR', '1234567890', 'SBIN0001234', 50000.00, 'TATANursing');

-- Insert sample deposit transaction
INSERT INTO transactions_bank (bank_account_id, transaction_type, amount, description, status, tenant)
VALUES (1, 'deposit', 10000.00, 'Initial deposit', 'completed', 'TATANursing');
```

---

## API Endpoints Summary

### Bank Accounts
- `POST /banking/accounts/create` - Create bank account
- `GET /banking/accounts/list` - List all accounts
- `GET /banking/accounts/:id` - Get account by ID
- `GET /banking/accounts/:id/balance` - Get account balance
- `PUT /banking/accounts/update/:id` - Update account
- `DELETE /banking/accounts/delete/:id` - Delete account

### Transactions
- `POST /banking/transactions/deposit` - Deposit money
- `POST /banking/transactions/withdraw` - Withdraw money
- `POST /banking/transactions/transfer` - Transfer between accounts
- `POST /banking/transactions/cheque` - Issue cheque
- `GET /banking/transactions/list` - List all transactions
- `GET /banking/transactions/:id` - Get transaction by ID
- `GET /banking/transactions/account/:account_id` - Get transactions for account
- `GET /banking/transactions/type/:type` - Get transactions by type
- `GET /banking/transactions/date-range` - Get transactions by date range

---

## Notes
- All monetary values use `NUMERIC(15, 2)` for precision
- Timestamps are stored with timezone information
- The system prevents negative balances through application-level validation
- All endpoints require authentication (`authenticateToken` middleware)
- Admin users can access all tenants' data; other users are restricted to their tenant
