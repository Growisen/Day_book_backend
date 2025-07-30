import { supabase, supabaseAdmin } from '../config/supabase';
import { Router, Request, Response } from 'express';

import { generateToken } from '../middlewares/jwt';
import { LoginCredentials, RegisterCredentials } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Auth API' });
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Register request body:', req.body);
    const { email, password, confirmPassword }: RegisterCredentials = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'accountant'
        }
      }
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (!data.user) {
      res.status(400).json({ error: 'Failed to create user' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: data.user.id,
      email: data.user.email!
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginCredentials = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
        console.error('Login error:', error);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!data.user) {
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: data.user.id,
      email: data.user.email!
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;