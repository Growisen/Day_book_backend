export enum BankTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER = 'transfer',
  CHEQUE = 'cheque'
}

export enum BankTransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed'
}

export interface BankAccount {
  id?: number;
  bank_name: string; // required
  account_name: string; // required
  shortform: string; // required
  account_number?: string;
  ifsc?: string;
  branch?: string;
  balance?: number;
  tenant?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface BankTransaction {
  id?: number;
  bank_account_id: number; // FK to bank_accounts
  transaction_type: BankTransactionType;
  amount: number;
  from_account_id?: number; // for transfers (FK to bank_accounts)
  to_account_id?: number; // for transfers (FK to bank_accounts)
  cheque_number?: string; // for cheque transactions
  reference?: string; // external reference / note
  description?: string;
  status?: BankTransactionStatus;
  tenant?: string;
  created_at?: Date;
}
