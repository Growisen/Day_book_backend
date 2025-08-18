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

  // ...existing code...

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

// ...existing code...
}


export const dayBookService = new DayBookService();