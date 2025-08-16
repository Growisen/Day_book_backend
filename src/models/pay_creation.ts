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

export interface DayBook {
  id?: bigint;
  created_at?: Date;
  id_in_out: string;
  amount: number;
  payment_type: PayType;
  pay_status: PayStatus;
  description?: string;
  mode_of_pay?: ModeOfPay;
}
