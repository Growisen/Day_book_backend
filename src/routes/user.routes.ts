import { Router, Request, Response } from 'express';
import { getUsers } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
router.get('/', getUsers);

router.get('/blah', (req: Request, res: Response) => {
  res.json({ message: 'This is a test route' });
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  // req.user is set by authenticateToken middleware
  res.json({
    message: 'User info from JWT',
    user: (req as any).user // or use a custom type for req
  });
});
export default router;
