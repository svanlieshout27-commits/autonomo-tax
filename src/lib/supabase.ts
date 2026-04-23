import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Invoice = {
  id: string
  user_id: string
  invoice_number: string
  client_name: string
  client_nif: string
  items: { description: string; quantity: number; unit_price: number }[]
  subtotal: number
  iva_amount: number
  irpf_amount: number
  total: number
  issued_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'pending'
  pdf_url?: string
  created_at: string
}

export type Expense = {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  deductible: boolean
  date: string
  created_at: string
}
