import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../middlewares/jwt';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../types';

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && !Array.isArray(authHeader) ? authHeader.split(' ')[1] : null;

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = verifyToken(token);
    
    // Verify user exists in Supabase
    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);
    
    if (error || !userData) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = {
      id: userData.user.id,
      email: userData.user.email!,
      role: userData.user.user_metadata?.role,
      tenant: userData.user.user_metadata?.tenant,
      created_at: userData.user.created_at,
      updated_at: userData.user.updated_at ?? userData.user.created_at
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};