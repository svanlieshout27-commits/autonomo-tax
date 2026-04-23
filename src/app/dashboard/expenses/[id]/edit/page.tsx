import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import EditExpenseClient from './EditExpenseClient'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params

  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!expense) notFound()

  return <EditExpenseClient expense={expense} />
}
