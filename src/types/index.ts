import { Request } from 'express';

export interface User {
  id: string;
  email: string;
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
}

export interface JWTPayload {
  userId: string;
  email: string;
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