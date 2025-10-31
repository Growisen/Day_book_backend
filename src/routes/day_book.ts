import { Router, Request, Response } from 'express';
import { getUsers } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';
import { dayBookService, fileService } from '../services/day_book_ops';
import { DayBook } from '../models/pay_creation';
import { upload } from '../middlewares/fileupload';
import * as XLSX from 'xlsx';

const router = Router();

router.post('/create', authenticateToken, upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const dayBookEntry: Omit<DayBook, 'id' | 'created_at'> = req.body;
    
    // Validation for nurse_id - only check if it's provided and not empty
    if (dayBookEntry.nurse_id !== undefined && dayBookEntry.nurse_id !== null && dayBookEntry.nurse_id.trim() === '') {
      return res.status(400).json({
        error: 'nurse_id cannot be empty string when provided'
      });
    }
    
    // Validation for client_id - only check if it's provided and not empty
    if (dayBookEntry.client_id !== undefined && dayBookEntry.client_id !== null && dayBookEntry.client_id.trim() === '') {
      return res.status(400).json({
        error: 'client_id cannot be empty string when provided'
      });
    }
    
    // Remove nurse_id for incoming payments and client_id for outgoing payments
    if (dayBookEntry.payment_type === 'incoming') {
      delete dayBookEntry.nurse_id;
    } else if (dayBookEntry.payment_type === 'outgoing') {
      delete dayBookEntry.client_id;
    }
    
    // Handle file upload if present
    if (req.file) {
      const fileName = `receipts/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await fileService.uploadFile(req.file, fileName);
      dayBookEntry.receipt = fileUrl;
    }
    
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

router.put('/update/:id', authenticateToken, upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: Partial<DayBook> = req.body;
    
    // Validation for nurse_id - only check if it's provided and not empty
    if (updateData.nurse_id !== undefined && updateData.nurse_id !== null && updateData.nurse_id.trim() === '') {
      return res.status(400).json({
        error: 'nurse_id cannot be empty string when provided'
      });
    }
    
    // Validation for client_id - only check if it's provided and not empty
    if (updateData.client_id !== undefined && updateData.client_id !== null && updateData.client_id.trim() === '') {
      return res.status(400).json({
        error: 'client_id cannot be empty string when provided'
      });
    }
    
    // Remove nurse_id for incoming payments and client_id for outgoing payments
    if (updateData.payment_type === 'incoming') {
      delete updateData.nurse_id;
    } else if (updateData.payment_type === 'outgoing') {
      delete updateData.client_id;
    }
    
    // Handle file upload if present
    if (req.file) {
      const fileName = `receipts/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await fileService.uploadFile(req.file, fileName);
      updateData.receipt = fileUrl;
    }
    
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

router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const paymentType = req.query.type as string; // 'incoming' or 'outgoing'
    const nurseId = req.query.nurse_id as string; // Filter by nurse_id
    const clientId = req.query.client_id as string; // Filter by client_id
    let result;

    if (nurseId) {
      // Filter by nurse_id (only for outgoing payments)
      result = await dayBookService.getByNurseId(nurseId);
    } else if (clientId) {
      // Filter by client_id (only for incoming payments)
      result = await dayBookService.getByClientId(clientId);
    } else if (paymentType && ['incoming', 'outgoing'].includes(paymentType)) {
      result = await dayBookService.getAllByType(paymentType);
    } else {
      result = await dayBookService.getAll();
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

    // Determine which data to fetch based on query parameters
    if (start_date && end_date) {
      // Get data between two dates
      result = await dayBookService.getByDateRange(start_date as string, end_date as string);
      filename = `daybook_${start_date}_to_${end_date}.xlsx`;
    } else if (start_date) {
      // Get data from start date to now
      result = await dayBookService.getFromDate(start_date as string);
      filename = `daybook_from_${start_date}.xlsx`;
    } else if (type && ['incoming', 'outgoing'].includes(type as string)) {
      // Get data by payment type
      result = await dayBookService.getAllByType(type as string);
      filename = `daybook_${type}_payments.xlsx`;
    } else {
      // Get all data
      result = await dayBookService.getAll();
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

    const result = await dayBookService.getByDateRange(
      start_date as string,
      end_date as string
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

    const result = await dayBookService.getFromDate(start_date as string);

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

    const result = await dayBookService.getByNurseId(nurseId);

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

    const result = await dayBookService.getByClientId(clientId);

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
    const result = await dayBookService.getById(id);
    
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
    
    if (start_date && end_date) {
      // Get summary with date range
      summary = await dayBookService.getPaymentSummaryByDateRange(
        start_date as string, 
        end_date as string
      );
    } else if (start_date) {
      // Get summary from start date to now
      summary = await dayBookService.getPaymentSummaryFromDate(start_date as string);
    } else {
      // Get overall summary
      summary = await dayBookService.getPaymentSummary();
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
    
    if (start_date && end_date) {
      // Get revenue with date range
      revenueData = await dayBookService.getNetRevenueByDateRange(
        start_date as string, 
        end_date as string
      );
    } else if (start_date) {
      // Get revenue from start date to now
      revenueData = await dayBookService.getNetRevenueFromDate(start_date as string);
    } else {
      // Get overall revenue
      revenueData = await dayBookService.getNetRevenue();
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