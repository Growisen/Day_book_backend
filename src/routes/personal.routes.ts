import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const PERSONAL_TENANT = 'Personal'; // Special tenant for personal entries

// CREATE personal daybook entry
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const userTenant = (req as any).user?.tenant;
    const userRole = (req as any).user?.role;

    // Check if user has access to Personal tenant
    if (userRole !== 'admin' && userTenant !== PERSONAL_TENANT) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access personal entries.' });
    }

    // Validate and coerce amount (float)
    const amount = raw.amount !== undefined ? Number(raw.amount) : NaN;
    if (Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: 'amount is required and must be a valid positive number' });
    }

    // Validate paytype (incoming or outgoing)
    const paytype = raw.paytype as string;
    if (!paytype || !['incoming', 'outgoing'].includes(paytype)) {
      return res.status(400).json({ error: 'paytype is required and must be "incoming" or "outgoing"' });
    }

    const description = raw.description as string | undefined;

    const payload = {
      tenant: PERSONAL_TENANT,
      paytype,
      amount,
      description
    };

    const { data, error } = await supabaseAdmin
      .from('daybook_personal')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: `Failed to create personal entry: ${error.message}` });
    }

    res.status(201).json({ message: 'Personal daybook entry created', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create personal entry' });
  }
});

// READ all personal daybook entries
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userTenant = (req as any).user?.tenant;
    const userRole = (req as any).user?.role;

    // Check if user has access to Personal tenant
    if (userRole !== 'admin' && userTenant !== PERSONAL_TENANT) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access personal entries.' });
    }

    const { start_date, end_date, paytype } = req.query;

    let query = supabaseAdmin
      .from('daybook_personal')
      .select('*')
      .eq('tenant', PERSONAL_TENANT);

    // Apply date filters if provided
    if (start_date) {
      query = query.gte('created_at', start_date as string);
    }
    if (end_date) {
      query = query.lte('created_at', end_date as string);
    }

    // Apply paytype filter if provided
    if (paytype && ['incoming', 'outgoing'].includes(paytype as string)) {
      query = query.eq('paytype', paytype as string);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: `Failed to fetch personal entries: ${error.message}` });
    }

    res.status(200).json({ 
      message: 'Personal entries fetched', 
      count: data?.length || 0,
      filters: {
        start_date: start_date || null,
        end_date: end_date || null,
        paytype: paytype || null
      },
      data 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch personal entries' });
  }
});

// READ single personal daybook entry by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userTenant = (req as any).user?.tenant;
    const userRole = (req as any).user?.role;

    // Check if user has access to Personal tenant
    if (userRole !== 'admin' && userTenant !== PERSONAL_TENANT) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access personal entries.' });
    }

    const { data, error } = await supabaseAdmin
      .from('daybook_personal')
      .select('*')
      .eq('id', id)
      .eq('tenant', PERSONAL_TENANT)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Personal entry not found' });
    }

    res.status(200).json({ message: 'Personal entry fetched', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch personal entry' });
  }
});

// UPDATE personal daybook entry
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const raw = req.body || {};
    const userTenant = (req as any).user?.tenant;
    const userRole = (req as any).user?.role;

    // Check if user has access to Personal tenant
    if (userRole !== 'admin' && userTenant !== PERSONAL_TENANT) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access personal entries.' });
    }

    const updateData: any = {};

    // Validate amount if provided
    if (raw.amount !== undefined) {
      const amt = Number(raw.amount);
      if (Number.isNaN(amt) || !Number.isFinite(amt) || amt < 0) {
        return res.status(400).json({ error: 'amount must be a valid positive number' });
      }
      updateData.amount = amt;
    }

    // Validate paytype if provided
    if (raw.paytype !== undefined) {
      if (!['incoming', 'outgoing'].includes(raw.paytype)) {
        return res.status(400).json({ error: 'paytype must be "incoming" or "outgoing"' });
      }
      updateData.paytype = raw.paytype;
    }

    if (raw.description !== undefined) {
      updateData.description = raw.description;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('daybook_personal')
      .update(updateData)
      .eq('id', id)
      .eq('tenant', PERSONAL_TENANT)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: 'Personal entry not found or update failed' });
    }

    res.status(200).json({ message: 'Personal entry updated', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update personal entry' });
  }
});

// DELETE personal daybook entry
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userTenant = (req as any).user?.tenant;
    const userRole = (req as any).user?.role;

    // Check if user has access to Personal tenant
    if (userRole !== 'admin' && userTenant !== PERSONAL_TENANT) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access personal entries.' });
    }

    const { error } = await supabaseAdmin
      .from('daybook_personal')
      .delete()
      .eq('id', id)
      .eq('tenant', PERSONAL_TENANT);

    if (error) {
      return res.status(404).json({ error: 'Personal entry not found or delete failed' });
    }

    res.status(200).json({ message: 'Personal entry deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete personal entry' });
  }
});

// GET net balance (incoming - outgoing)
router.get('/summary/balance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userTenant = (req as any).user?.tenant;
    const userRole = (req as any).user?.role;

    // Check if user has access to Personal tenant
    if (userRole !== 'admin' && userTenant !== PERSONAL_TENANT) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to access personal entries.' });
    }

    const { start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('daybook_personal')
      .select('paytype, amount')
      .eq('tenant', PERSONAL_TENANT);

    // Apply date filters if provided
    if (start_date) {
      query = query.gte('created_at', start_date as string);
    }
    if (end_date) {
      query = query.lte('created_at', end_date as string);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: `Failed to fetch entries: ${error.message}` });
    }

    // Calculate totals
    let totalIncoming = 0;
    let totalOutgoing = 0;
    let incomingCount = 0;
    let outgoingCount = 0;

    data?.forEach((entry: any) => {
      const amount = Number(entry.amount) || 0;
      if (entry.paytype === 'incoming') {
        totalIncoming += amount;
        incomingCount++;
      } else if (entry.paytype === 'outgoing') {
        totalOutgoing += amount;
        outgoingCount++;
      }
    });

    const netBalance = totalIncoming - totalOutgoing;

    res.status(200).json({
      message: 'Balance summary retrieved successfully',
      summary: {
        total_incoming: totalIncoming,
        total_outgoing: totalOutgoing,
        net_balance: netBalance,
        incoming_count: incomingCount,
        outgoing_count: outgoingCount,
        total_entries: data?.length || 0,
        date_range: {
          start_date: start_date || 'All time',
          end_date: end_date || 'Present'
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate balance' });
  }
});

export default router;

