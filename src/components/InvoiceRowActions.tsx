'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Props {
  invoiceId: string
  invoiceNumber: string
}

export default function InvoiceRowActions({ invoiceId, invoiceNumber }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminar la factura ${invoiceNumber}? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    await supabase.from('invoices').delete().eq('id', invoiceId)
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
      {/* PDF download */}
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btnBase, background: '#EFF6FF', color: '#1D4ED8' }}
      >
        PDF ↓
      </a>

      {/* Edit */}
      <Link
        href={`/dashboard/invoices/${invoiceId}/edit`}
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
