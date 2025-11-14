import { Router, Request, Response } from 'express';
import { getUsers } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';
import { supabaseAdmin } from '../config/supabase';
import { dayBookService, fileService } from '../services/day_book_ops';
import { DayBook, Tenant } from '../models/pay_creation';
import { upload } from '../middlewares/fileupload';
import * as XLSX from 'xlsx';

const router = Router();

router.post('/create', upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    // Coerce and validate fields explicitly to avoid passing invalid types to DB
    const raw = req.body || {};
    console.log(raw)

    // amount is required and must be a finite number
    const amount = raw.amount !== undefined ? Number(raw.amount) : NaN;
    if (Number.isNaN(amount) || !Number.isFinite(amount)) {
      return res.status(400).json({ error: 'amount is required and must be a valid number' });
    }

    const payment_type = raw.payment_type as any;
    const pay_status = raw.pay_status as any;
    const mode_of_pay = raw.mode_of_pay as any;
    const description = raw.description as string | undefined;
    const tenant = raw.tenant as Tenant | undefined;
    const nurse_id = typeof raw.nurse_id === 'string' ? raw.nurse_id : undefined;
    const client_id = typeof raw.client_id === 'string' ? raw.client_id : undefined;
    const nurse_sal=raw.nurse_sal as any
    

    // Validation for tenant - required field
    if (!tenant) {
      return res.status(400).json({ error: 'tenant is required' });
    }

    // Validate tenant enum
    if (!Object.values(Tenant).includes(tenant)) {
      return res.status(400).json({ error: `Invalid tenant. Must be one of: ${Object.values(Tenant).join(', ')}` });
    }

    // If provided, ensure nurse_id/client_id are non-empty strings
    if (nurse_id !== undefined && nurse_id.trim() === '') {
      return res.status(400).json({ error: 'nurse_id cannot be empty string when provided' });
    }
    if (client_id !== undefined && client_id.trim() === '') {
      return res.status(400).json({ error: 'client_id cannot be empty string when provided' });
    }

    // Build the payload we'll insert - only include relevant id fields
    const payload: any = {
      amount,
      payment_type,
      pay_status,
      mode_of_pay,
      description,
      tenant
    };

    if (payment_type === 'incoming' && client_id) {
      payload.client_id = client_id;
    }
    if (payment_type === 'outgoing' && nurse_id) {
      payload.nurse_id = nurse_id;
      payload.nurse_sal = nurse_sal;
    }

    // Handle file upload if present
    if (req.file) {
      const fileName = `receipts/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await fileService.uploadFile(req.file, fileName);
      payload.receipt = fileUrl;
    }

    const result = await dayBookService.create(payload);
    res.status(201).json({ message: 'Day book entry created successfully', data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create day book entry' });
  }
});

router.put('/update/:id', upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const raw = req.body || {};

    console.error('=== UPDATE DEBUG START ===');
    console.error('Update ID:', id);
    console.error('Request body:', raw);

    // tenant-based filter (admins see all)
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    // fetch existing record so we can decide nurse_sal & previous values
    const existing = await dayBookService.getById(id, tenantFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Day book entry not found' });
    }
    console.log('Existing record before update:', existing);

    const updateData: Partial<DayBook> = {};

    // If amount provided, coerce and validate
    if (raw.amount !== undefined) {
      const amt = Number(raw.amount);
      if (Number.isNaN(amt) || !Number.isFinite(amt)) {
        return res.status(400).json({ error: 'amount must be a valid number when provided' });
      }
      updateData.amount = amt;
    }

    // basic fields
    if (raw.payment_type !== undefined) updateData.payment_type = raw.payment_type;
    // day_book table uses pay_status column (not payment_status)
    if (raw.pay_status !== undefined) updateData.pay_status = raw.pay_status;
    if (raw.mode_of_pay !== undefined) updateData.mode_of_pay = raw.mode_of_pay;
    if (raw.description !== undefined) updateData.description = raw.description;
    if (raw.tenant !== undefined) updateData.tenant = raw.tenant;
    if (typeof raw.nurse_id === 'string') updateData.nurse_id = raw.nurse_id;
    if (typeof raw.client_id === 'string') updateData.client_id = raw.client_id;

    // accept nurse_sal on update (string -> int)
    if (raw.nurse_sal !== undefined) {
      if (raw.nurse_sal === '') {
        return res.status(400).json({ error: 'nurse_sal cannot be empty string' });
      }
      const ns = Number(raw.nurse_sal);
      if (Number.isNaN(ns) || !Number.isFinite(ns) || !Number.isInteger(ns)) {
        return res.status(400).json({ error: 'nurse_sal must be an integer when provided' });
      }
      updateData.nurse_sal = ns;
    }

    // Validation for tenant if provided
    if (updateData.tenant && !Object.values(Tenant).includes(updateData.tenant)) {
      return res.status(400).json({ error: `Invalid tenant. Must be one of: ${Object.values(Tenant).join(', ')}` });
    }

    // Validation for nurse_id - only check if it's provided and not empty
    if (updateData.nurse_id !== undefined && updateData.nurse_id !== null && typeof updateData.nurse_id === 'string' && updateData.nurse_id.trim() === '') {
      return res.status(400).json({ error: 'nurse_id cannot be empty string when provided' });
    }

    // Validation for client_id - only check if it's provided and not empty
    if (updateData.client_id !== undefined && updateData.client_id !== null && typeof updateData.client_id === 'string' && updateData.client_id.trim() === '') {
      return res.status(400).json({ error: 'client_id cannot be empty string when provided' });
    }

    // Remove nurse_id and nurse_sal for incoming payments and client_id for outgoing payments
    if (updateData.payment_type === 'incoming') {
      delete updateData.nurse_id;
      delete updateData.nurse_sal;
    } else if (updateData.payment_type === 'outgoing') {
      delete updateData.client_id;
    }

    // Handle file upload if present
    if (req.file) {
      const fileName = `receipts/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await fileService.uploadFile(req.file, fileName);
      updateData.receipt = fileUrl;
    }

    console.log('Update payload being sent to DB:', updateData);

    // perform the update on day_book
    const result = await dayBookService.update(id, updateData);

    if (!result) {
      return res.status(404).json({ error: 'Day book entry not found' });
    }

    console.log('Update result from DB:', result);

    // Fetch fresh record from DB to read the stored nurse_sal and current pay_status.
    const updatedRecord = await dayBookService.getById(id, tenantFilter);
    console.log('Fresh record after update:', updatedRecord);

    // If the DB row doesn't include nurse_sal column or the column is absent, do nothing.
    if (updatedRecord && Object.prototype.hasOwnProperty.call(updatedRecord, 'nurse_sal')) {
      const nurseSalId = (updatedRecord as any).nurse_sal as number | undefined;
      // day_book uses pay_status column
      const finalPayStatus = (updatedRecord as any).pay_status;

      console.log('nurse_sal ID:', nurseSalId);
      console.log('final pay_status:', finalPayStatus);

      if (nurseSalId !== undefined && nurseSalId !== null && finalPayStatus === 'paid') {
        console.log('Conditions met - updating salary_payments table for ID:', nurseSalId);
        
        const salaryUpdate: any = { payment_status: 'paid' };
        // prefer receipt from the updated DB record
        if ((updatedRecord as any).receipt) {
          salaryUpdate.receipt_url = (updatedRecord as any).receipt;
          console.log('Adding receipt_url:', salaryUpdate.receipt_url);
        }

        console.log('Salary update payload:', salaryUpdate);

        const { data: salaryData, error: salaryErr } = await supabaseAdmin
          .from('salary_payments')
          .update(salaryUpdate)
          .eq('id', nurseSalId)
          .select();

        if (salaryErr) {
          console.error('Salary update error:', salaryErr);
          return res.status(500).json({ error: `Failed to update salary_payments: ${salaryErr.message}` });
        }

        console.log('Salary_payments update successful:', salaryData);
      } else {
        console.log('Conditions NOT met for salary update:');
        console.log('  - nurseSalId exists?', nurseSalId !== undefined && nurseSalId !== null);
        console.log('  - finalPayStatus === "paid"?', finalPayStatus === 'paid');
      }
    } else {
      console.log('nurse_sal column does not exist on updatedRecord or updatedRecord is null');
    }

    console.log('=== UPDATE DEBUG END ===');

    res.status(200).json({
      message: 'Day book entry updated successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Update error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update day book entry'
    });
  }
});

router.delete('/delete/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const result = await dayBookService.delete(id);
    
    if (!result) {
      return res.status(404).json({
        error: 'Day book entry not found'
      });
    }

    res.status(200).json({
      message: 'Day book entry deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to delete day book entry'
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

// Fetch all nurses from the 'nurses' table
router.get('/nurses', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('nurses')
      .select('*')
      .order('nurse_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Nurses fetched', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch nurses' });
  }
});

// Fetch all clients from the 'clients' table
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('individual_clients')
      .select('*')
      .order('client_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Clients fetched', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch clients' });
  }
});

router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const paymentType = req.query.type as string; // 'incoming' or 'outgoing'
    const nurseId = req.query.nurse_id as string; // Filter by nurse_id
    const clientId = req.query.client_id as string; // Filter by client_id
    let result;
    // tenant-based filtering: admins see all tenants, others only their tenant
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    if (nurseId) {
      // Filter by nurse_id (only for outgoing payments)
      result = await dayBookService.getByNurseId(nurseId, tenantFilter);
    } else if (clientId) {
      // Filter by client_id (only for incoming payments)
      result = await dayBookService.getByClientId(clientId, tenantFilter);
    } else if (paymentType && ['incoming', 'outgoing'].includes(paymentType)) {
      result = await dayBookService.getAllByType(paymentType, tenantFilter);
    } else {
      result = await dayBookService.getAll(tenantFilter);
    }
    
    res.status(200).json({
      message: 'Day book entries retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch day book entries'
    });
  }
});

// Download Excel file with flexible date filtering
router.get('/download/excel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, type } = req.query;
    let result: any[];
    let filename: string;
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    // Determine which data to fetch based on query parameters
    if (start_date && end_date) {
      // Get data between two dates
      result = await dayBookService.getByDateRange(start_date as string, end_date as string, tenantFilter);
      filename = `daybook_${start_date}_to_${end_date}.xlsx`;
    } else if (start_date) {
      // Get data from start date to now
      result = await dayBookService.getFromDate(start_date as string, tenantFilter);
      filename = `daybook_from_${start_date}.xlsx`;
    } else if (type && ['incoming', 'outgoing'].includes(type as string)) {
      // Get data by payment type
      result = await dayBookService.getAllByType(type as string, tenantFilter);
      filename = `daybook_${type}_payments.xlsx`;
    } else {
      // Get all data
      result = await dayBookService.getAll(tenantFilter);
      console.log(result)
      filename = 'daybook_all_records.xlsx';
    }

    // Prepare data for Excel
    const excelData = result.map((record, index) => ({
      'S.No': index + 1,
      'ID': record.id,
      'Date': new Date(record.created_at).toLocaleDateString('en-IN'),
      'Payment Type': record.payment_type?.toUpperCase() || 'N/A',
      'Amount (₹)': record.amount || 0,
      'Payment Status': record.payment_status?.toUpperCase() || 'N/A',
      'Mode of Payment': record.mode_of_pay?.toUpperCase() || 'N/A',
      'Description': record.description || 'N/A',
      'Nurse ID': record.nurse_id || 'N/A',
      'Client ID': record.client_id || 'N/A',
      'Receipt': record.receipt ? 'Available' : 'Not Available',
      'Created At': new Date(record.created_at).toLocaleString('en-IN')
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = [
      { wch: 6 },   // S.No
      { wch: 8 },   // ID
      { wch: 12 },  // Date
      { wch: 15 },  // Payment Type
      { wch: 12 },  // Amount
      { wch: 15 },  // Payment Status
      { wch: 18 },  // Mode of Payment
      { wch: 30 },  // Description
      { wch: 12 },  // Nurse ID
      { wch: 12 },  // Client ID
      { wch: 15 },  // Receipt
      { wch: 20 }   // Created At
    ];
    worksheet['!cols'] = colWidths;

    // Add summary information at the top
    const summaryData = [
      { 'S.No': 'DAYBOOK REPORT' },
      { 'S.No': `Generated on: ${new Date().toLocaleString('en-IN')}` },
      { 'S.No': `Total Records: ${result.length}` },
      { 'S.No': `Date Range: ${start_date || 'All time'} to ${end_date || 'Present'}` },
      { 'S.No': '' } // Empty row for spacing
    ];

    // Insert summary at the beginning
    XLSX.utils.sheet_add_json(worksheet, summaryData, { origin: 'A1' });
    XLSX.utils.sheet_add_json(worksheet, excelData, { origin: 'A6' });

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DayBook Records');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the Excel file
    res.send(excelBuffer);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to generate Excel file'
    });
  }
});



// Get entries between two dates
router.get('/date-range', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Both start_date and end_date are required'
      });
    }

    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    const result = await dayBookService.getByDateRange(
      start_date as string,
      end_date as string,
      tenantFilter
    );

    res.status(200).json({
      message: 'Day book entries retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch day book entries'
    });
  }
});

// Get entries from a specific date till now
router.get('/from-date', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date } = req.query;
    
    if (!start_date) {
      return res.status(400).json({
        error: 'start_date is required'
      });
    }

  const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

  const result = await dayBookService.getFromDate(start_date as string, tenantFilter);

    res.status(200).json({
      message: 'Day book entries retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch day book entries'
    });
  }
});

// Get all records issued to a specific nurse (outgoing payments)
router.get('/nurse/:nurse_id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const nurseId = req.params.nurse_id;
    
    if (!nurseId || nurseId.trim() === '') {
      return res.status(400).json({
        error: 'nurse_id is required and cannot be empty'
      });
    }

  const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

  const result = await dayBookService.getByNurseId(nurseId, tenantFilter);

    res.status(200).json({
      message: `Day book entries for nurse ${nurseId} retrieved successfully`,
      nurse_id: nurseId,
      total_records: result.length,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch day book entries for nurse'
    });
  }
});  

// Get all records from a specific client (incoming payments)
router.get('/client/:client_id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.client_id;
    
    if (!clientId || clientId.trim() === '') {
      return res.status(400).json({
        error: 'client_id is required and cannot be empty'
      });
    }

  const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

  const result = await dayBookService.getByClientId(clientId, tenantFilter);

    res.status(200).json({
      message: `Day book entries for client ${clientId} retrieved successfully`,
      client_id: clientId,
      total_records: result.length,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch day book entries for client'
    });
  }
});


router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;
    const result = await dayBookService.getById(id, tenantFilter);
    
    if (!result) {
      return res.status(404).json({
        error: 'Day book entry not found'
      });
    }

    res.status(200).json({
      message: 'Day book entry retrieved successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch day book entry'
    });
  }
});

// Get payment summary (paid and pending amounts)
router.get('/summary/amounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    let summary;
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    if (start_date && end_date) {
      // Get summary with date range
      summary = await dayBookService.getPaymentSummaryByDateRange(
        start_date as string, 
        end_date as string,
        tenantFilter
      );
    } else if (start_date) {
      // Get summary from start date to now
      summary = await dayBookService.getPaymentSummaryFromDate(start_date as string, tenantFilter);
    } else {
      // Get overall summary
      summary = await dayBookService.getPaymentSummary(tenantFilter);
    }
    
    res.status(200).json({
      message: 'Payment summary retrieved successfully',
      summary: {
        total_paid_amount: summary.total_paid_amount || 0,
        total_pending_amount: summary.total_pending_amount || 0,
        total_entries: summary.total_entries || 0,
        paid_entries_count: summary.paid_entries_count || 0,
        pending_entries_count: summary.pending_entries_count || 0,
        date_range: {
          start_date: start_date || 'All time',
          end_date: end_date || 'Present'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch payment summary'
    });
  }
});

// Get net revenue calculation (profit/loss)
router.get('/revenue/net', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    let revenueData;
    const tenantFilter = (req as any).user?.role === 'admin' ? undefined : (req as any).user?.tenant;

    if (start_date && end_date) {
      // Get revenue with date range
      revenueData = await dayBookService.getNetRevenueByDateRange(
        start_date as string, 
        end_date as string,
        tenantFilter
      );
    } else if (start_date) {
      // Get revenue from start date to now
      revenueData = await dayBookService.getNetRevenueFromDate(start_date as string, tenantFilter);
    } else {
      // Get overall revenue
      revenueData = await dayBookService.getNetRevenue(tenantFilter);
    }
    
    const netRevenue = revenueData.total_incoming - revenueData.total_outgoing;
    const isProfit = netRevenue >= 0;
    
    res.status(200).json({
      message: 'Net revenue calculated successfully',
      revenue: {
        total_incoming: revenueData.total_incoming || 0,
        total_outgoing: revenueData.total_outgoing || 0,
        net_revenue: netRevenue,
        status: isProfit ? 'profit' : 'loss',
        incoming_count: revenueData.incoming_count || 0,
        outgoing_count: revenueData.outgoing_count || 0,
        total_transactions: (revenueData.incoming_count || 0) + (revenueData.outgoing_count || 0),
        date_range: {
          start_date: start_date || 'All time',
          end_date: end_date || 'Present'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to calculate net revenue'
    });
  }
});



export default router;