import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import EditInvoiceClient from './EditInvoiceClient'

export const dynamic = 'force-dynamic'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!invoice) notFound()

  return <EditInvoiceClient invoice={invoice} />
}
