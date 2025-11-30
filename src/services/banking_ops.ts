import { supabase, supabaseAdmin } from '../config/supabase';
import { BankAccount, BankTransaction, BankTransactionType, BankTransactionStatus } from '../models/banking';

export class BankAccountService {
  private readonly TABLE_NAME = 'bank_accounts';

  // Create a new bank account
  async create(data: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const sanitized: any = { ...data };
      delete sanitized.id;
      delete sanitized.created_at;
      delete sanitized.updated_at;

      // Set initial balance to 0 if not provided
      if (sanitized.balance === undefined) {
        sanitized.balance = 0;
      }

      console.log('BankAccountService.create payload:', JSON.stringify(sanitized));

      const { data: result, error } = await supabaseAdmin
        .from(this.TABLE_NAME)
        .insert(sanitized)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Failed to create bank account: ${error.message}`);
      }
      return result;
    } catch (err: any) {
      console.error('BankAccountService.create error:', err?.message || err);
      throw err;
    }
  }

  // Get all bank accounts
  async getAll(tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch bank accounts: ${error.message}`);
    }
    return data;
  }

  // Get bank account by ID
  async getById(id: number, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id);

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query.single();

    if (error) {
      throw new Error(`Failed to fetch bank account: ${error.message}`);
    }
    return data;
  }

  // Update bank account
  async update(id: number, data: Partial<BankAccount>) {
    const { data: result, error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update bank account: ${error.message}`);
    }
    return result;
  }

  // Delete bank account
  async delete(id: number) {
    const { error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete bank account: ${error.message}`);
    }
    return true;
  }

  // Get account balance
  async getBalance(id: number, tenant?: string) {
    const account = await this.getById(id, tenant);
    return account.balance || 0;
  }

  // Update balance (internal use)
  async updateBalance(id: number, newBalance: number) {
    return await this.update(id, { balance: newBalance });
  }
}

export class BankTransactionService {
  private readonly TABLE_NAME = 'transactions_bank';
  private accountService = new BankAccountService();

  // Create a transaction
  async create(data: Omit<BankTransaction, 'id' | 'created_at'>) {
    try {
      const sanitized: any = { ...data };
      delete sanitized.id;
      delete sanitized.created_at;

      // Default status to completed if not provided
      if (!sanitized.status) {
        sanitized.status = BankTransactionStatus.COMPLETED;
      }

      console.log('BankTransactionService.create payload:', JSON.stringify(sanitized));

      const { data: result, error } = await supabaseAdmin
        .from(this.TABLE_NAME)
        .insert(sanitized)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Failed to create transaction: ${error.message}`);
      }
      return result;
    } catch (err: any) {
      console.error('BankTransactionService.create error:', err?.message || err);
      throw err;
    }
  }

  // Get all transactions
  async getAll(tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    return data;
  }

  // Get transactions by account ID
  async getByAccountId(accountId: number, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('bank_account_id', accountId)
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    return data;
  }

  // Get transaction by ID
  async getById(id: number, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id);

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query.single();

    if (error) {
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
    return data;
  }

  // Deposit money
  async deposit(accountId: number, amount: number, description?: string, reference?: string, tenant?: string) {
    try {
      // Get current balance
      const account = await this.accountService.getById(accountId, tenant);
      const currentBalance = account.balance || 0;
      const newBalance = currentBalance + amount;

      // Update account balance
      await this.accountService.updateBalance(accountId, newBalance);

      // Create transaction record
      const transaction = await this.create({
        bank_account_id: accountId,
        transaction_type: BankTransactionType.DEPOSIT,
        amount,
        description,
        reference,
        status: BankTransactionStatus.COMPLETED,
        tenant
      });

      return { transaction, newBalance };
    } catch (err: any) {
      throw new Error(`Deposit failed: ${err.message}`);
    }
  }

  // Withdraw money
  async withdraw(accountId: number, amount: number, description?: string, reference?: string, tenant?: string) {
    try {
      // Get current balance
      const account = await this.accountService.getById(accountId, tenant);
      const currentBalance = account.balance || 0;

      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const newBalance = currentBalance - amount;

      // Update account balance
      await this.accountService.updateBalance(accountId, newBalance);

      // Create transaction record
      const transaction = await this.create({
        bank_account_id: accountId,
        transaction_type: BankTransactionType.WITHDRAW,
        amount,
        description,
        reference,
        status: BankTransactionStatus.COMPLETED,
        tenant
      });

      return { transaction, newBalance };
    } catch (err: any) {
      throw new Error(`Withdrawal failed: ${err.message}`);
    }
  }

  // Transfer between accounts
  async transfer(fromAccountId: number, toAccountId: number, amount: number, description?: string, reference?: string, tenant?: string) {
    try {
      // Get both accounts
      const fromAccount = await this.accountService.getById(fromAccountId, tenant);
      const toAccount = await this.accountService.getById(toAccountId, tenant);

      const fromBalance = fromAccount.balance || 0;

      if (fromBalance < amount) {
        throw new Error('Insufficient balance in source account');
      }

      const newFromBalance = fromBalance - amount;
      const newToBalance = (toAccount.balance || 0) + amount;

      // Update both balances
      await this.accountService.updateBalance(fromAccountId, newFromBalance);
      await this.accountService.updateBalance(toAccountId, newToBalance);

      // Create transaction record
      const transaction = await this.create({
        bank_account_id: fromAccountId,
        transaction_type: BankTransactionType.TRANSFER,
        amount,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        description,
        reference,
        status: BankTransactionStatus.COMPLETED,
        tenant
      });

      return {
        transaction,
        fromBalance: newFromBalance,
        toBalance: newToBalance
      };
    } catch (err: any) {
      throw new Error(`Transfer failed: ${err.message}`);
    }
  }

  // Issue cheque
  async issueCheque(accountId: number, amount: number, chequeNumber: string, description?: string, reference?: string, tenant?: string) {
    try {
      // Get current balance
      const account = await this.accountService.getById(accountId, tenant);
      const currentBalance = account.balance || 0;

      if (currentBalance < amount) {
        throw new Error('Insufficient balance to issue cheque');
      }

      const newBalance = currentBalance - amount;

      // Update account balance
      await this.accountService.updateBalance(accountId, newBalance);

      // Create transaction record
      const transaction = await this.create({
        bank_account_id: accountId,
        transaction_type: BankTransactionType.CHEQUE,
        amount,
        cheque_number: chequeNumber,
        description,
        reference,
        status: BankTransactionStatus.COMPLETED,
        tenant
      });

      return { transaction, newBalance };
    } catch (err: any) {
      throw new Error(`Cheque issue failed: ${err.message}`);
    }
  }

  // Get transactions by type
  async getByType(type: BankTransactionType, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('transaction_type', type)
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    return data;
  }

  // Get transactions by date range
  async getByDateRange(startDate: string, endDate: string, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    return data;
  }
}

export const bankAccountService = new BankAccountService();
export const bankTransactionService = new BankTransactionService();
