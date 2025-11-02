import { Request } from 'express';
import { Tenant, UserRole } from '../models/pay_creation';

export interface User {
  id: string;
  email: string;
  role?: UserRole;
  tenant?: Tenant;
  created_at: string;
  updated_at: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  tenant: Tenant;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: UserRole;
  tenant?: Tenant;
  iat: number;
  exp: number;
}

// Extend Express Request to include custom headers
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}