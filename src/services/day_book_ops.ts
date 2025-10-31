import { supabase } from '../config/supabase';
import { DayBook } from '../models/pay_creation';

export class DayBookService {
  private readonly TABLE_NAME = 'day_book';

  async create(data: Omit<DayBook, 'id' | 'created_at'>) {
    const { data: result, error } = await supabase
      .from(this.TABLE_NAME)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create day book entry: ${error.message}`);
    }
    return result;
  }

  async getAll() {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getById(id: number) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

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

  async getAllByType(paymentType: string) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('payment_type', paymentType)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getByNurseId(nurseId: string) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('nurse_id', nurseId)
      .eq('payment_type', 'outgoing') // Only outgoing payments have nurse_id
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getByClientId(clientId: string) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('client_id', clientId)
      .eq('payment_type', 'incoming') // Only incoming payments have client_id
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  async getFromDate(startDate: string) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch day book entries: ${error.message}`);
    }
    return data;
  }

  // Get payment summary for all entries
  async getPaymentSummary() {
    try {
      // Get paid amount
      const { data: paidData, error: paidError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('pay_status', 'paid');

      if (paidError) {
        throw new Error(`Failed to fetch paid entries: ${paidError.message}`);
      }

      // Get pending amount  
      const { data: pendingData, error: pendingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('pay_status', 'un_paid');

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
  async getPaymentSummaryFromDate(startDate: string) {
    try {
      // Get paid amount from date
      const { data: paidData, error: paidError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('pay_status', 'paid')
        .gte('created_at', startDate);

      if (paidError) {
        throw new Error(`Failed to fetch paid entries: ${paidError.message}`);
      }

      // Get pending amount from date
      const { data: pendingData, error: pendingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('pay_status', 'un_paid')
        .gte('created_at', startDate);

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
  async getPaymentSummaryByDateRange(startDate: string, endDate: string) {
    try {
      // Get paid amount within date range
      const { data: paidData, error: paidError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('pay_status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (paidError) {
        throw new Error(`Failed to fetch paid entries: ${paidError.message}`);
      }

      // Get pending amount within date range
      const { data: pendingData, error: pendingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('pay_status', 'un_paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

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
  async getNetRevenue() {
    try {
      // Get total incoming (paid only)
      const { data: incomingData, error: incomingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('payment_type', 'incoming')
        .eq('pay_status', 'paid');

      if (incomingError) {
        throw new Error(`Failed to fetch incoming entries: ${incomingError.message}`);
      }

      // Get total outgoing (paid only)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('payment_type', 'outgoing')
        .eq('pay_status', 'paid');

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
  async getNetRevenueFromDate(startDate: string) {
    try {
      // Get total incoming (paid only) from date
      const { data: incomingData, error: incomingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('payment_type', 'incoming')
        .eq('pay_status', 'paid')
        .gte('created_at', startDate);

      if (incomingError) {
        throw new Error(`Failed to fetch incoming entries: ${incomingError.message}`);
      }

      // Get total outgoing (paid only) from date
      const { data: outgoingData, error: outgoingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('payment_type', 'outgoing')
        .eq('pay_status', 'paid')
        .gte('created_at', startDate);

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
  async getNetRevenueByDateRange(startDate: string, endDate: string) {
    try {
      // Get total incoming (paid only) within date range
      const { data: incomingData, error: incomingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('payment_type', 'incoming')
        .eq('pay_status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (incomingError) {
        throw new Error(`Failed to fetch incoming entries: ${incomingError.message}`);
      }

      // Get total outgoing (paid only) within date range
      const { data: outgoingData, error: outgoingError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('payment_type', 'outgoing')
        .eq('pay_status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

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