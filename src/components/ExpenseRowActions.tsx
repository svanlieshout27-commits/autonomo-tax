'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Props {
  expenseId: string
  description: string
}

export default function ExpenseRowActions({ expenseId, description }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    const short = description.length > 40 ? description.slice(0, 40) + '…' : description
    if (!confirm(`¿Eliminar el gasto "${short}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    await supabase.from('expenses').delete().eq('id', expenseId)
    router.refresh()
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '7px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    textDecoration: 'none',
    fontFamily: 'Outfit, sans-serif',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      {/* Edit */}
      <Link
        href={`/dashboard/expenses/${expenseId}/edit`}
        style={{ ...btnBase, background: '#F1F5F9', color: '#475569' }}
      >
        Editar
      </Link>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{ ...btnBase, background: deleting ? '#FEE2E2' : '#FEF2F2', color: '#EF4444', opacity: deleting ? 0.6 : 1 }}
      >
        {deleting ? '…' : 'Eliminar'}
      </button>
    </div>
  )
}
