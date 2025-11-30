# DAYBOOK INSERT SAMPLE DOCUMENT

## API Endpoint
**POST** `http://localhost:3000/api/daybook/create`

**Authentication:** None required ❌

**Content-Type:** `multipart/form-data` (for file upload) or `application/json` (without file)

---

## Request Body Structure

### Complete Sample (All Fields)
```json
{
  "amount": 2500,
  "payment_type": "incoming",
  "pay_status": "paid",
  "description": "Monthly service payment from client",
  "mode_of_pay": "upi",
  "payment_type_specific": "client_payment_received",
  "payment_description": "Payment for home nursing services during November 2025",
  "client_id": "CLIENT_001",
  "tenant": "TATANursing"
}
```

---

## Field Definitions

### **Required Fields**

#### `amount` (number) - **REQUIRED**
The payment amount in currency units.
```json
"amount": 1500
```

#### `payment_type` (string) - **REQUIRED**
Direction of payment flow.
- **Options:** `"incoming"` | `"outgoing"`
```json
"payment_type": "incoming"    // Money received
"payment_type": "outgoing"    // Money paid out
```

#### `pay_status` (string) - **REQUIRED**
Current payment status.
- **Options:** `"paid"` | `"un_paid"`
```json
"pay_status": "paid"          // Payment completed
"pay_status": "un_paid"       // Payment pending
```

#### `tenant` (string) - **REQUIRED**
Organization/tenant identifier.
- **Options:** `"TATANursing"` | `"Dearcare"` | `"DearcareAcademy"`
```json
"tenant": "TATANursing"       // TATA Nursing
"tenant": "Dearcare"          // Dearcare healthcare
"tenant": "DearcareAcademy"   // Dearcare Academy
```

### **Optional Fields**

#### `description` (string) - Optional
Payment description or notes.
```json
"description": "Monthly salary payment for October 2025"
```

#### `mode_of_pay` (string) - Optional
Payment method used.
- **Options:** `"cash"` | `"upi"` | `"account_transfer"`
```json
"mode_of_pay": "cash"            // Cash payment
"mode_of_pay": "upi"             // UPI payment
"mode_of_pay": "account_transfer" // Bank transfer
```

#### `payment_type_specific` (string) - Optional
Specific category of the payment.
- **Options:** `"client_payment_received"` | `"nurse_salary_paid"` | `"office_expenses_paid"` | `"student_fee_received"`
```json
"payment_type_specific": "client_payment_received"  // Payment from client
"payment_type_specific": "nurse_salary_paid"        // Nurse salary payment
"payment_type_specific": "office_expenses_paid"     // Office expenses
"payment_type_specific": "student_fee_received"     // Student fee
```

#### `payment_description` (string) - Optional
Detailed text description of the payment.
```json
"payment_description": "Payment for home nursing services provided during November 2025"
```

#### `nurse_id` (string) - Optional
Nurse identifier (only for outgoing payments).
```json
"nurse_id": "NURSE_123"
```
**⚠️ Business Rule:** Only include for `"payment_type": "outgoing"`

#### `client_id` (string) - Optional
Client identifier (only for incoming payments).
```json
"client_id": "CLIENT_456"
```
**⚠️ Business Rule:** Only include for `"payment_type": "incoming"`

#### `receipt` (file) - Optional
Receipt file upload (image/PDF).
- Use `multipart/form-data` when including files
- Field name: `"receipt"`

---

## Sample Documents by Scenario

### 1. Incoming Payment from Client
```json
{
  "amount": 5000,
  "payment_type": "incoming",
  "pay_status": "paid",
  "description": "Home nursing service - November 2025",
  "mode_of_pay": "upi",
  "payment_type_specific": "client_payment_received",
  "payment_description": "Full payment for home nursing care services",
  "client_id": "CLIENT_SHARMA_001",
  "tenant": "TATANursing"
}
```

### 2. Outgoing Payment to Nurse
```json
{
  "amount": 3500,
  "payment_type": "outgoing",
  "pay_status": "paid",
  "description": "Weekly salary for Nurse Priya",
  "mode_of_pay": "account_transfer",
  "payment_type_specific": "nurse_salary_paid",
  "payment_description": "Weekly salary payment for nursing services rendered",
  "nurse_id": "NURSE_PRIYA_123",
  "tenant": "Dearcare"
}
```

### 3. Pending Payment (Unpaid)
```json
{
  "amount": 2200,
  "payment_type": "incoming",
  "pay_status": "un_paid",
  "description": "Physiotherapy session charges - pending",
  "mode_of_pay": "cash",
  "client_id": "CLIENT_PATEL_002",
  "tenant": "DearcareAcademy"
}
```

### 4. Cash Payment (Minimal Fields)
```json
{
  "amount": 1000,
  "payment_type": "outgoing",
  "pay_status": "paid",
  "tenant": "TATANursing"
}
```

### 5. Payment with Receipt Upload
For file uploads, use `multipart/form-data`:

**Form Data:**
```
amount: 4500
payment_type: incoming
pay_status: paid
description: Medical equipment purchase
mode_of_pay: account_transfer
client_id: CLIENT_HOSPITAL_001
tenant: Dearcare
receipt: [FILE: invoice.pdf]
```

---

## cURL Examples

### 1. Simple JSON Request
```bash
curl -X POST "http://localhost:3000/api/daybook/create" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "payment_type": "incoming",
    "pay_status": "paid",
    "description": "Client payment for services",
    "mode_of_pay": "upi",
    "client_id": "CLIENT_001",
    "tenant": "TATANursing"
  }'
```

### 2. Request with File Upload
```bash
curl -X POST "http://localhost:3000/api/daybook/create" \
  -F "amount=3000" \
  -F "payment_type=outgoing" \
  -F "pay_status=paid" \
  -F "description=Nurse salary with receipt" \
  -F "mode_of_pay=account_transfer" \
  -F "nurse_id=NURSE_SARAH_456" \
  -F "tenant=Dearcare" \
  -F "receipt=@/path/to/receipt.jpg"
```

### 3. Minimal Required Fields
```bash
curl -X POST "http://localhost:3000/api/daybook/create" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500,
    "payment_type": "outgoing",
    "pay_status": "paid",
    "tenant": "DearcareAcademy"
  }'
```

---

## JavaScript/Frontend Examples

### 1. Using Fetch (JSON)
```javascript
const createDayBookEntry = async (entryData) => {
  try {
    const response = await fetch('http://localhost:3000/api/daybook/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 2500,
        payment_type: 'incoming',
        pay_status: 'paid',
        description: 'Monthly service payment',
        mode_of_pay: 'upi',
        client_id: 'CLIENT_001',
        tenant: 'TATANursing'
      })
    });
    
    const result = await response.json();
    console.log('Entry created:', result);
    return result;
  } catch (error) {
    console.error('Error creating entry:', error);
  }
};
```

### 2. Using Fetch (With File Upload)
```javascript
const createEntryWithReceipt = async (formData) => {
  const form = new FormData();
  form.append('amount', '3000');
  form.append('payment_type', 'outgoing');
  form.append('pay_status', 'paid');
  form.append('description', 'Salary payment with receipt');
  form.append('mode_of_pay', 'account_transfer');
  form.append('nurse_id', 'NURSE_123');
  form.append('tenant', 'Dearcare');
  form.append('receipt', fileInput.files[0]); // File from input
  
  try {
    const response = await fetch('http://localhost:3000/api/daybook/create', {
      method: 'POST',
      body: form // Don't set Content-Type header for FormData
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 3. React Form Example
```jsx
const DayBookForm = () => {
  const [formData, setFormData] = useState({
    amount: '',
    payment_type: 'incoming',
    pay_status: 'paid',
    description: '',
    mode_of_pay: 'cash',
    client_id: '',
    nurse_id: '',
    tenant: 'TATANursing'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Remove empty fields and apply business rules
    const cleanData = { ...formData };
    if (cleanData.payment_type === 'incoming') {
      delete cleanData.nurse_id;
    } else {
      delete cleanData.client_id;
    }
    
    // Remove empty optional fields
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === '') {
        delete cleanData[key];
      }
    });

    try {
      const response = await fetch('http://localhost:3000/api/daybook/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      });
      
      const result = await response.json();
      console.log('Success:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

---

## Response Examples

### Success Response (201 Created)
```json
{
  "message": "Day book entry created successfully",
  "data": {
    "id": 123,
    "amount": 2500,
    "payment_type": "incoming",
    "pay_status": "paid",
    "description": "Monthly service payment",
    "mode_of_pay": "upi",
    "client_id": "CLIENT_001",
    "tenant": "TATANursing",
    "receipt": "https://supabase-url/receipts/1699012345-receipt.jpg",
    "created_at": "2025-11-02T10:30:00Z"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "error": "tenant is required"
}
```

```json
{
  "error": "Invalid tenant. Must be one of: TATANursing, Dearcare, DearcareAcademy"
}
```

```json
{
  "error": "nurse_id cannot be empty string when provided"
}
```

---

## Validation Rules Summary

### ✅ Required Validations
- `amount` must be provided (number)
- `payment_type` must be "incoming" or "outgoing"
- `pay_status` must be "paid" or "un_paid"
- `tenant` must be one of: "TATANursing", "Dearcare", "DearcareAcademy"

### ✅ Business Logic Validations
- `nurse_id` only allowed for `payment_type: "outgoing"`
- `client_id` only allowed for `payment_type: "incoming"`
- If `nurse_id` or `client_id` provided, cannot be empty string

### ✅ Optional Field Validations
- `mode_of_pay` must be "cash", "upi", or "account_transfer" (if provided)
- `description` can be any string (if provided)
- `receipt` file upload supported

---

## File Upload Specifications

### Supported File Types
- **Images:** JPG, PNG, GIF
- **Documents:** PDF
- **Maximum Size:** As configured in multer middleware

### File Storage
- **Storage:** Supabase Storage
- **Path Structure:** `receipts/{timestamp}-{filename}`
- **Access:** Public URL returned in response

---

*Last Updated: November 2, 2025*