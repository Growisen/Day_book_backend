import { Router, Request, Response } from 'express';
import { getUsers } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';
import { dayBookService } from '../services/day_book_ops';
import { DayBook } from '../models/pay_creation';

const router = Router();

router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const dayBookEntry: Omit<DayBook, 'id' | 'created_at'> = req.body;
    const result = await dayBookService.create(dayBookEntry);
    res.status(201).json({
      message: 'Day book entry created successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to create day book entry'
    });
  }
});

router.put('/update/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: Partial<DayBook> = req.body;
    
    const result = await dayBookService.update(id, updateData);
    
    if (!result) {
      return res.status(404).json({
        error: 'Day book entry not found'
      });
    }

    res.status(200).json({
      message: 'Day book entry updated successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to update day book entry'
    });
  }
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  // req.user is set by authenticateToken middleware
  res.json({
    message: 'User info from JWT',
    user: (req as any).user // or use a custom type for req
  });
});

export default router;