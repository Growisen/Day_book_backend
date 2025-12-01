export enum PayType {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing'
}

export enum PayStatus {
  PAID = 'paid',
  UNPAID = 'un_paid'
}

export enum ModeOfPay {
  CASH = 'cash',
  UPI = 'upi',
  ACCOUNT_TRANSFER = 'account_transfer'
}

export enum PaymentTypeSpecific {
  CLIENT_PAYMENT_RECEIVED = 'client_payment_received',
  NURSE_SALARY_PAID = 'nurse_salary_paid',
  OFFICE_EXPENSES_PAID = 'office_expenses_paid',
  STUDENT_FEE_RECEIVED = 'student_fee_received'
}

export enum UserRole {
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  STAFF = 'staff'
}

export enum Tenant {
  TATA_NURSING = 'TATANursing',
  DEAR_CARE = 'Dearcare',
  DEAR_CARE_ACADEMY = 'DearcareAcademy',
  PERSONAL = 'Personal'
}

export interface DayBook {
  id?: bigint;
  created_at?: Date;
  amount: number;
  payment_type: PayType;
  pay_status: PayStatus;
  description?: string;
  mode_of_pay?: ModeOfPay;
  receipt?: string; // Added receipt field for storing file URL
  payment_type_specific?: PaymentTypeSpecific; // New specific payment type enum
  payment_description?: string; // Additional detailed payment description (text)
  nurse_id?: string; // Optional field for outgoing payments only
  client_id?: string; // Optional field for incoming payments only
  tenant: Tenant;
  nurse_sal?: number; // Required tenant field
}
