import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { bankAccountService, bankTransactionService } from '../services/banking_ops';
import { BankAccount, BankTransaction, BankTransactionType } from '../models/banking';

const router = Router();

// Health check route (no authentication)
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Banking module is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ==================== BANK ACCOUNTS ====================

// Create a new bank account
router.post('/accounts/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    console.log('Create bank account request:', raw);

    const bank_name = raw.bank_name as string;
    const account_name = raw.account_name as string;
    const shortform = raw.shortform as string;
    const account_number = raw.account_number as string | undefined;
    const ifsc = raw.ifsc as string | undefined;
    const branch = raw.branch as string | undefined;
    const balance = raw.balance !== undefined ? Number(raw.balance) : 0;
    const tenant = raw.tenant as string | undefined;

    // Validate required fields
    if (!bank_name || bank_name.trim() === '') {
      return res.status(400).json({ error: 'bank_name is required' });
    }
    if (!account_name || account_name.trim() === '') {
      return res.status(400).json({ error: 'account_name is required' });
    }
    if (!shortform || shortform.trim() === '') {
      return res.status(400).json({ error: 'shortform is required' });
    }

    // Validate balance if provided
    if (Number.isNaN(balance) || !Number.isFinite(balance)) {
      return res.status(400).json({ error: 'balance must be a valid number' });
    }

    const payload: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'> = {
      bank_name,
      account_name,
      shortform,
      account_number,
      ifsc,
      branch,
      balance,
      tenant
    };

    const result = await bankAccountService.create(payload);
    res.status(201).json({ message: 'Bank account created successfully', data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create bank account' });
  }
});

// Get all bank accounts
router.get('/accounts/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankAccountService.getAll(tenantFilter);

    res.status(200).json({
      message: 'Bank accounts retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bank accounts' });
  }
});

// Get bank account by ID
router.get('/accounts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankAccountService.getById(id, tenantFilter);

    if (!result) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    res.status(200).json({
      message: 'Bank account retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bank account' });
  }
});

// Update bank account
router.put('/accounts/update/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const raw = req.body || {};

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    // Check if account exists
    const existing = await bankAccountService.getById(id, tenantFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const updateData: Partial<BankAccount> = {};

    if (raw.bank_name !== undefined) updateData.bank_name = raw.bank_name;
    if (raw.account_name !== undefined) updateData.account_name = raw.account_name;
    if (raw.shortform !== undefined) updateData.shortform = raw.shortform;
    if (raw.account_number !== undefined) updateData.account_number = raw.account_number;
    if (raw.ifsc !== undefined) updateData.ifsc = raw.ifsc;
    if (raw.branch !== undefined) updateData.branch = raw.branch;
    if (raw.tenant !== undefined) updateData.tenant = raw.tenant;

    // Validate balance if provided
    if (raw.balance !== undefined) {
      const balance = Number(raw.balance);
      if (Number.isNaN(balance) || !Number.isFinite(balance)) {
        return res.status(400).json({ error: 'balance must be a valid number' });
      }
      updateData.balance = balance;
    }

    const result = await bankAccountService.update(id, updateData);

    res.status(200).json({
      message: 'Bank account updated successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update bank account' });
  }
});

// Delete bank account
router.delete('/accounts/delete/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    // Check if account exists
    const existing = await bankAccountService.getById(id, tenantFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    await bankAccountService.delete(id);

    res.status(200).json({ message: 'Bank account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete bank account' });
  }
});

// Get account balance
router.get('/accounts/:id/balance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const balance = await bankAccountService.getBalance(id, tenantFilter);

    res.status(200).json({
      message: 'Balance retrieved successfully',
      account_id: id,
      balance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch balance' });
  }
});

// ==================== BANK TRANSACTIONS ====================

// Deposit money
router.post('/transactions/deposit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const account_id = parseInt(raw.account_id);
    const amount = Number(raw.amount);
    const description = raw.description as string | undefined;
    const reference = raw.reference as string | undefined;
    const tenant = raw.tenant as string | undefined;

    if (!account_id || isNaN(account_id)) {
      return res.status(400).json({ error: 'account_id is required and must be a valid number' });
    }
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a valid positive number' });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.deposit(account_id, amount, description, reference, tenantFilter);

    res.status(201).json({
      message: 'Deposit successful',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Deposit failed' });
  }
});

// Withdraw money
router.post('/transactions/withdraw', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const account_id = parseInt(raw.account_id);
    const amount = Number(raw.amount);
    const description = raw.description as string | undefined;
    const reference = raw.reference as string | undefined;
    const tenant = raw.tenant as string | undefined;

    if (!account_id || isNaN(account_id)) {
      return res.status(400).json({ error: 'account_id is required and must be a valid number' });
    }
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a valid positive number' });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.withdraw(account_id, amount, description, reference, tenantFilter);

    res.status(201).json({
      message: 'Withdrawal successful',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Withdrawal failed' });
  }
});

// Transfer between accounts
router.post('/transactions/transfer', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const from_account_id = parseInt(raw.from_account_id);
    const to_account_id = parseInt(raw.to_account_id);
    const amount = Number(raw.amount);
    const description = raw.description as string | undefined;
    const reference = raw.reference as string | undefined;
    const tenant = raw.tenant as string | undefined;

    if (!from_account_id || isNaN(from_account_id)) {
      return res.status(400).json({ error: 'from_account_id is required and must be a valid number' });
    }
    if (!to_account_id || isNaN(to_account_id)) {
      return res.status(400).json({ error: 'to_account_id is required and must be a valid number' });
    }
    if (from_account_id === to_account_id) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a valid positive number' });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.transfer(from_account_id, to_account_id, amount, description, reference, tenantFilter);

    res.status(201).json({
      message: 'Transfer successful',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Transfer failed' });
  }
});

// Issue cheque
router.post('/transactions/cheque', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const account_id = parseInt(raw.account_id);
    const amount = Number(raw.amount);
    const cheque_number = raw.cheque_number as string;
    const description = raw.description as string | undefined;
    const reference = raw.reference as string | undefined;
    const tenant = raw.tenant as string | undefined;

    if (!account_id || isNaN(account_id)) {
      return res.status(400).json({ error: 'account_id is required and must be a valid number' });
    }
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a valid positive number' });
    }
    if (!cheque_number || cheque_number.trim() === '') {
      return res.status(400).json({ error: 'cheque_number is required' });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.issueCheque(account_id, amount, cheque_number, description, reference, tenantFilter);

    res.status(201).json({
      message: 'Cheque issued successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Cheque issue failed' });
  }
});

// Get all transactions
router.get('/transactions/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.getAll(tenantFilter);

    res.status(200).json({
      message: 'Transactions retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// Get transactions by account ID
router.get('/transactions/account/:account_id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const account_id = parseInt(req.params.account_id);
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.getByAccountId(account_id, tenantFilter);

    res.status(200).json({
      message: 'Transactions retrieved successfully',
      account_id,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/transactions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.getById(id, tenantFilter);

    if (!result) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json({
      message: 'Transaction retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transaction' });
  }
});

// Get transactions by type
router.get('/transactions/type/:type', authenticateToken, async (req: Request, res: Response) => {
  try {
    const type = req.params.type as BankTransactionType;

    if (!Object.values(BankTransactionType).includes(type)) {
      return res.status(400).json({ 
        error: `Invalid transaction type. Must be one of: ${Object.values(BankTransactionType).join(', ')}` 
      });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.getByType(type, tenantFilter);

    res.status(200).json({
      message: `${type} transactions retrieved successfully`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// Get transactions by date range
router.get('/transactions/date-range', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Both start_date and end_date are required' });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await bankTransactionService.getByDateRange(start_date as string, end_date as string, tenantFilter);

    res.status(200).json({
      message: 'Transactions retrieved successfully',
      date_range: { start_date, end_date },
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

export default router;
