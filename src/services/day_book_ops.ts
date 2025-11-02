import { supabase } from '../config/supabase';
import { DayBook } from '../models/pay_creation';

export class DayBookService {
  private readonly TABLE_NAME = 'day_book';

  async create(data: Omit<DayBook, 'id' | 'created_at'>) {
    try {
      // Sanitize & log payload to help debug invalid values (e.g., NaN being inserted into bigint)
      const sanitized: any = { ...data };
      // Prevent accidental insertion of client-supplied id or other server-managed fields
      delete sanitized.id;
      delete sanitized.created_at;
      console.log('DayBookService.create payload (sanitized):', JSON.stringify(sanitized));

      const { data: result, error } = await supabase
        .from(this.TABLE_NAME)
        .insert(sanitized)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Failed to create day book entry: ${error.message}`);
      }
      return result;
    } catch (err: any) {
      // Ensure we log unexpected errors too
      console.error('DayBookService.create unexpected error:', err?.message || err);
      throw err;
    }
  }

  async getAll(tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getById(id: number, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id);

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query.single();

    if (error) {
      throw new Error(`Failed to fetch day book entry: ${error.message}`);
    }
    return data;
  }
   async update(id: number, data: Partial<DayBook>) {
    const { data: result, error } = await supabase
      .from(this.TABLE_NAME)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update day book entry: ${error.message}`);
    }
    return result;
  }

  async delete(id: number) {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete day book entry: ${error.message}`);
    }
    return true;
  }

  async getAllByType(paymentType: string, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('payment_type', paymentType)
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getByNurseId(nurseId: string, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('nurse_id', nurseId)
      .eq('payment_type', 'outgoing') // Only outgoing payments have nurse_id
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getByClientId(clientId: string, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('client_id', clientId)
      .eq('payment_type', 'incoming') // Only incoming payments have client_id
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getByDateRange(startDate: string, endDate: string, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getFromDate(startDate: string, tenant?: string) {
    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (tenant) query = query.eq('tenant', tenant);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  // Get payment summary for all entries
  async getPaymentSummary(tenant?: string) {
    try {
      // Get paid amount
      let paidQuery = supabase.from(this.TABLE_NAME).select('amount').eq('pay_status', 'paid');
      if (tenant) paidQuery = paidQuery.eq('tenant', tenant);
      const { data: paidData, error: paidError } = await paidQuery;

      if (paidError) {
        throw new Error(`Failed to fetch paid entries: ${paidError.message}`);
      }

      // Get pending amount  
      let pendingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('pay_status', 'un_paid');
      if (tenant) pendingQuery = pendingQuery.eq('tenant', tenant);
      const { data: pendingData, error: pendingError } = await pendingQuery;

      if (pendingError) {
        throw new Error(`Failed to fetch pending entries: ${pendingError.message}`);
      }

      const totalPaid = paidData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalPending = pendingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      return {
        total_paid_amount: totalPaid,
        total_pending_amount: totalPending,
        total_entries: (paidData?.length || 0) + (pendingData?.length || 0),
        paid_entries_count: paidData?.length || 0,
        pending_entries_count: pendingData?.length || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate payment summary: ${error.message}`);
    }
  }

  // Get payment summary from a specific date
  async getPaymentSummaryFromDate(startDate: string, tenant?: string) {
    try {
      // Get paid amount from date
      let paidQuery = supabase.from(this.TABLE_NAME).select('amount').eq('pay_status', 'paid').gte('created_at', startDate);
      if (tenant) paidQuery = paidQuery.eq('tenant', tenant);
      const { data: paidData, error: paidError } = await paidQuery;

      if (paidError) {
        throw new Error(`Failed to fetch paid entries: ${paidError.message}`);
      }

      // Get pending amount from date
      let pendingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('pay_status', 'un_paid').gte('created_at', startDate);
      if (tenant) pendingQuery = pendingQuery.eq('tenant', tenant);
      const { data: pendingData, error: pendingError } = await pendingQuery;

      if (pendingError) {
        throw new Error(`Failed to fetch pending entries: ${pendingError.message}`);
      }

      const totalPaid = paidData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalPending = pendingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      return {
        total_paid_amount: totalPaid,
        total_pending_amount: totalPending,
        total_entries: (paidData?.length || 0) + (pendingData?.length || 0),
        paid_entries_count: paidData?.length || 0,
        pending_entries_count: pendingData?.length || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate payment summary: ${error.message}`);
    }
  }

  // Get payment summary within date range
  async getPaymentSummaryByDateRange(startDate: string, endDate: string, tenant?: string) {
    try {
      // Get paid amount within date range
      let paidQuery = supabase.from(this.TABLE_NAME).select('amount').eq('pay_status', 'paid').gte('created_at', startDate).lte('created_at', endDate);
      if (tenant) paidQuery = paidQuery.eq('tenant', tenant);
      const { data: paidData, error: paidError } = await paidQuery;

      if (paidError) {
        throw new Error(`Failed to fetch paid entries: ${paidError.message}`);
      }

      // Get pending amount within date range
      let pendingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('pay_status', 'un_paid').gte('created_at', startDate).lte('created_at', endDate);
      if (tenant) pendingQuery = pendingQuery.eq('tenant', tenant);
      const { data: pendingData, error: pendingError } = await pendingQuery;

      if (pendingError) {
        throw new Error(`Failed to fetch pending entries: ${pendingError.message}`);
      }

      const totalPaid = paidData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalPending = pendingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      return {
        total_paid_amount: totalPaid,
        total_pending_amount: totalPending,
        total_entries: (paidData?.length || 0) + (pendingData?.length || 0),
        paid_entries_count: paidData?.length || 0,
        pending_entries_count: pendingData?.length || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate payment summary: ${error.message}`);
    }
  }

  // Get net revenue for all paid entries (profit/loss calculation)
  async getNetRevenue(tenant?: string) {
    try {
      // Get total incoming (paid only)
      let incomingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('payment_type', 'incoming').eq('pay_status', 'paid');
      if (tenant) incomingQuery = incomingQuery.eq('tenant', tenant);
      const { data: incomingData, error: incomingError } = await incomingQuery;

      if (incomingError) {
        throw new Error(`Failed to fetch incoming entries: ${incomingError.message}`);
      }

      // Get total outgoing (paid only)
      let outgoingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('payment_type', 'outgoing').eq('pay_status', 'paid');
      if (tenant) outgoingQuery = outgoingQuery.eq('tenant', tenant);
      const { data: outgoingData, error: outgoingError } = await outgoingQuery;

      if (outgoingError) {
        throw new Error(`Failed to fetch outgoing entries: ${outgoingError.message}`);
      }

      const totalIncoming = incomingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalOutgoing = outgoingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      return {
        total_incoming: totalIncoming,
        total_outgoing: totalOutgoing,
        incoming_count: incomingData?.length || 0,
        outgoing_count: outgoingData?.length || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate net revenue: ${error.message}`);
    }
  }

  // Get net revenue from a specific date (profit/loss calculation)
  async getNetRevenueFromDate(startDate: string, tenant?: string) {
    try {
      // Get total incoming (paid only) from date
      let incomingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('payment_type', 'incoming').eq('pay_status', 'paid').gte('created_at', startDate);
      if (tenant) incomingQuery = incomingQuery.eq('tenant', tenant);
      const { data: incomingData, error: incomingError } = await incomingQuery;

      if (incomingError) {
        throw new Error(`Failed to fetch incoming entries: ${incomingError.message}`);
      }

      // Get total outgoing (paid only) from date
      let outgoingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('payment_type', 'outgoing').eq('pay_status', 'paid').gte('created_at', startDate);
      if (tenant) outgoingQuery = outgoingQuery.eq('tenant', tenant);
      const { data: outgoingData, error: outgoingError } = await outgoingQuery;

      if (outgoingError) {
        throw new Error(`Failed to fetch outgoing entries: ${outgoingError.message}`);
      }

      const totalIncoming = incomingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalOutgoing = outgoingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      return {
        total_incoming: totalIncoming,
        total_outgoing: totalOutgoing,
        incoming_count: incomingData?.length || 0,
        outgoing_count: outgoingData?.length || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate net revenue: ${error.message}`);
    }
  }

  // Get net revenue within date range (profit/loss calculation)
  async getNetRevenueByDateRange(startDate: string, endDate: string, tenant?: string) {
    try {
      // Get total incoming (paid only) within date range
      let incomingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('payment_type', 'incoming').eq('pay_status', 'paid').gte('created_at', startDate).lte('created_at', endDate);
      if (tenant) incomingQuery = incomingQuery.eq('tenant', tenant);
      const { data: incomingData, error: incomingError } = await incomingQuery;

      if (incomingError) {
        throw new Error(`Failed to fetch incoming entries: ${incomingError.message}`);
      }

      // Get total outgoing (paid only) within date range
      let outgoingQuery = supabase.from(this.TABLE_NAME).select('amount').eq('payment_type', 'outgoing').eq('pay_status', 'paid').gte('created_at', startDate).lte('created_at', endDate);
      if (tenant) outgoingQuery = outgoingQuery.eq('tenant', tenant);
      const { data: outgoingData, error: outgoingError } = await outgoingQuery;

      if (outgoingError) {
        throw new Error(`Failed to fetch outgoing entries: ${outgoingError.message}`);
      }

      const totalIncoming = incomingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalOutgoing = outgoingData?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      return {
        total_incoming: totalIncoming,
        total_outgoing: totalOutgoing,
        incoming_count: incomingData?.length || 0,
        outgoing_count: outgoingData?.length || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate net revenue: ${error.message}`);
    }
  }
}

export const dayBookService = new DayBookService();

export class FileService {
  private readonly BUCKET_NAME = 'Daybook';

  async uploadFile(file: Express.Multer.File, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        throw new Error(`File upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicData.publicUrl;
    } catch (error: any) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async deleteFile(fileName: string) {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        throw new Error(`File deletion failed: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }
}

export const fileService = new FileService();