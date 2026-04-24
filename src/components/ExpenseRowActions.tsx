'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getT, DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/locales'

function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  const lang = match?.[1]
  return (LOCALES.some(l => l.code === lang) ? lang as Locale : DEFAULT_LOCALE)
}

interface Props {
  expenseId: string
  description: string
}

export default function ExpenseRowActions({ expenseId, description }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const t = getT(getClientLocale())

  async function handleDelete() {
    const short = description.length > 40 ? description.slice(0, 40) + '…' : description
    if (!confirm(`${t('common.delete')}: "${short}"?`)) return
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
      <Link
        href={`/dashboard/expenses/${expenseId}/edit`}
        style={{ ...btnBase, background: '#F1F5F9', color: '#475569' }}
      >
        {t('common.edit')}
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{ ...btnBase, background: deleting ? '#FEE2E2' : '#FEF2F2', color: '#EF4444', opacity: deleting ? 0.6 : 1 }}
      >
        {deleting ? '…' : t('common.delete')}
      </button>
    </div>
  )
}
