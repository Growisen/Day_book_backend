import { supabase, supabaseAdmin } from '../config/supabase';
import { Router, Request, Response } from 'express';
import { generateToken } from '../middlewares/jwt';
import { LoginCredentials, RegisterCredentials } from '../types';
import { requireAdmin } from '../middlewares/roleAuth';
import { UserRole, Tenant } from '../models/pay_creation';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Auth API' });
});

router.post('/register', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Register request body:', req.body);
    const { email, password, confirmPassword, role, tenant }: RegisterCredentials = req.body;

    // Validation
    if (!email || !password || !confirmPassword || !role || !tenant) {
      res.status(400).json({ error: 'All fields are required (email, password, confirmPassword, role, tenant)' });
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

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({ 
        error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` 
      });
      return;
    }

    // Validate tenant
    if (!Object.values(Tenant).includes(tenant)) {
      res.status(400).json({ 
        error: `Invalid tenant. Must be one of: ${Object.values(Tenant).join(', ')}` 
      });
      return;
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          tenant: tenant
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
      email: data.user.email!,
      role: role,
      tenant: tenant
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        tenant: tenant,
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
      email: data.user.email!,
      role: data.user.user_metadata?.role,
      tenant: data.user.user_metadata?.tenant
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'accountant',
        tenant: data.user.user_metadata?.tenant,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to create the first admin user (no authentication required)
// Admin users do not need to belong to a tenant; tenant is optional here.
router.post('/create-admin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, confirmPassword, tenant } = req.body as Partial<RegisterCredentials>;

    // Validation
    if (!email || !password || !confirmPassword) {
      res.status(400).json({ error: 'All fields are required (email, password, confirmPassword)' });
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

    // Validate tenant if provided (tenant is optional for admin)
    if (tenant && !Object.values(Tenant).includes(tenant)) {
      res.status(400).json({ 
        error: `Invalid tenant. Must be one of: ${Object.values(Tenant).join(', ')}` 
      });
      return;
    }

    // Check if any admin users already exist
    const { data: existingUsers, error: queryError } = await supabase.auth.admin.listUsers();
    
    if (queryError) {
      console.error('Error checking existing users:', queryError);
    }

    const adminExists = existingUsers?.users?.some(user => 
      user.user_metadata?.role === UserRole.ADMIN
    );

    if (adminExists) {
      res.status(403).json({ error: 'Admin user already exists. Contact existing admin to create new accounts.' });
      return;
    }

    // Create admin user (tenant omitted when not provided)
    const metadata: any = { role: UserRole.ADMIN };
    if (tenant) metadata.tenant = tenant;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (!data.user) {
      res.status(400).json({ error: 'Failed to create admin user' });
      return;
    }

    // Generate JWT token (tenant may be undefined/null)
    const token = generateToken({
      userId: data.user.id,
      email: data.user.email!,
      role: UserRole.ADMIN,
      tenant: tenant || undefined
    });

    res.status(201).json({
      message: 'Admin user created successfully',
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: UserRole.ADMIN,
        tenant: tenant || null,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info (requires authentication)
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user; // User info from authenticateToken middleware
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    console.log('User from token:', user); // Debug log

    // Use 'id' instead of 'userId' since that's what's in your token
    const userId = user.id || user.userId;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID not found in token' });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    // Get additional user details from Supabase using supabaseAdmin
    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
      return;
    }

    if (!userData.user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'User info retrieved successfully',
      user: {
        id: userData.user.id,
        email: userData.user.email,
        role: userData.user.user_metadata?.role || 'accountant',
        tenant: userData.user.user_metadata?.tenant,
        created_at: userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at,
        email_confirmed_at: userData.user.email_confirmed_at
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route for admin only access
router.get('/admin-test', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUser = (req as any).user; // User info from authenticateToken middleware
    console.log(adminUser)
    // Get current timestamp
    const currentTime = new Date().toISOString();
    
    // Get system information
    const systemInfo = {
      server_time: currentTime,
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };

    // Get admin user info
    const adminInfo = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role || 'admin',
      tenant: adminUser.tenant,
      access_level: 'full_system_access'
    };

    res.status(200).json({
      message: 'Admin test route accessed successfully! 🎉',
      admin_user: adminInfo,
      system_info: systemInfo,
      test_data: {
        secret_message: 'This is confidential admin data',
        admin_capabilities: [
          'Create users',
          'Delete users', 
          'View all data',
          'System configuration',
          'Database management'
        ],
        security_note: 'Only admin users can see this information'
      }
    });
  } catch (error) {
    console.error('Admin test route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;