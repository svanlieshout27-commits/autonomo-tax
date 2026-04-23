'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getT, DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/locales'

function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  const lang = match?.[1]
  return (LOCALES.some(l => l.code === lang) ? lang as Locale : DEFAULT_LOCALE)
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft:   { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  sent:    { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  paid:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  overdue: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  pending: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
}

const ALL_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'pending']

type Props = {
  invoiceId: string
  currentStatus: string
}

export default function InvoiceStatusSelect({ invoiceId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const t = getT(getClientLocale())

  const statusLabels: Record<string, string> = {
    draft:   t('invoices.draft'),
    sent:    t('invoices.sent'),
    paid:    t('invoices.paidStatus'),
    overdue: t('invoices.overdue'),
    pending: t('invoices.pendingStatus'),
  }

  async function handleChange(newStatus: string) {
    if (newStatus === status) return
    setLoading(true)
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoiceId)

    if (!error) {
      setStatus(newStatus)
      router.refresh()
    }
    setLoading(false)
  }

  const style = STATUS_STYLES[status] || STATUS_STYLES.draft

  return (
    <select
      value={status}
      onChange={e => handleChange(e.target.value)}
      disabled={loading}
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        background: style.bg,
        color: style.color,
        border: `1.5px solid ${style.border}`,
        borderRadius: '20px',
        padding: '4px 24px 4px 10px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        outline: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='${encodeURIComponent(style.color)}' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        transition: 'opacity 0.15s',
        opacity: loading ? 0.6 : 1,
        minWidth: '100px',
      }}
    >
      {ALL_STATUSES.map(s => (
        <option key={s} value={s}>{statusLabels[s]}</option>
      ))}
    </select>
  )
}
