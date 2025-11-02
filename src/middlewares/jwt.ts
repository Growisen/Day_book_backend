import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';
import { UserRole, Tenant } from '../models/pay_creation';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const expiryAccessToken = "1d";

export const generateToken = (payload: { 
  userId: string; 
  email: string; 
  role?: UserRole; 
  tenant?: Tenant; 
}): string => {
  console.log(JWT_SECRET)
  console.log(process.env.JWT_SECRET)
    return jwt.sign(payload, JWT_SECRET as string, { expiresIn: expiryAccessToken })
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};