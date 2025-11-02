import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { UserRole, Tenant } from '../models/pay_creation';
import { verifyToken } from './jwt';

export const requireRole = (allowedRoles: UserRole[], requiredTenant?: Tenant) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.header('Authorization');
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      // Verify the JWT token
      const decoded = verifyToken(token);

      // Get user from Supabase using the decoded user ID
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);

      if (error || !userData.user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get user role and tenant from metadata
      const userRole = userData.user.user_metadata?.role as UserRole;
      const userTenant = userData.user.user_metadata?.tenant as Tenant;

      if (!userRole) {
        return res.status(403).json({ error: 'User role not found' });
      }

      if (!userTenant) {
        return res.status(403).json({ error: 'User tenant not found' });
      }

      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}` 
        });
      }

      // Check tenant access if required
      if (requiredTenant && userTenant !== requiredTenant) {
        return res.status(403).json({ 
          error: `Access denied. Required tenant: ${requiredTenant}. Your tenant: ${userTenant}` 
        });
      }

      // Add user info to request
      (req as any).user = {
        id: userData.user.id,
        email: userData.user.email,
        role: userRole,
        tenant: userTenant,
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at
      };
      
      next();
    } catch (error) {
      console.error('Role authentication error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  };
};

// Specific role middlewares
export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireAdminOrAccountant = requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]);
export const requireAnyRole = requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.STAFF]);

// Tenant-specific middlewares
export const requireTenantAdmin = (tenant: Tenant) => requireRole([UserRole.ADMIN], tenant);
export const requireTenantAccess = (tenant: Tenant) => requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.STAFF], tenant);