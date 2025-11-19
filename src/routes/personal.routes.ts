import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// CREATE personal daybook entry
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const userId = (req as any).user?.id; // UUID from JWT token

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
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
      user_id: userId,
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

// READ all personal daybook entries for logged-in user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const { data, error } = await supabaseAdmin
      .from('daybook_personal')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: `Failed to fetch personal entries: ${error.message}` });
    }

    res.status(200).json({ message: 'Personal entries fetched', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch personal entries' });
  }
});

// READ single personal daybook entry by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const { data, error } = await supabaseAdmin
      .from('daybook_personal')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
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
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
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
      .eq('user_id', userId)
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
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const { error } = await supabaseAdmin
      .from('daybook_personal')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(404).json({ error: 'Personal entry not found or delete failed' });
    }

    res.status(200).json({ message: 'Personal entry deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete personal entry' });
  }
});

export default router;
