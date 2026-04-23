import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getServerT } from '@/lib/i18n'
import InvoiceStatusSelect from '@/components/InvoiceStatusSelect'
import InvoiceRowActions from '@/components/InvoiceRowActions'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:   { label: 'Borrador', cls: 'badge-grey' },
  sent:    { label: 'Enviada',  cls: 'badge-blue' },
  paid:    { label: 'Cobrada',  cls: 'badge-green' },
  overdue: { label: 'Vencida',  cls: 'badge-red' },
  pending: { label: 'Pendiente',cls: 'badge-amber' },
}

export default async function InvoicesPage() {
  const { userId } = await auth()
  const { t } = await getServerT()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId!)
    .order('issued_date', { ascending: false })

  const list = invoices || []
  const totalPaid = list.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalPending = list.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + i.total, 0)

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    draft:   { label: t('invoices.draft'),         cls: 'badge-grey'  },
    sent:    { label: t('invoices.sent'),           cls: 'badge-blue'  },
    paid:    { label: t('invoices.paidStatus'),     cls: 'badge-green' },
    overdue: { label: t('invoices.overdue'),        cls: 'badge-red'   },
    pending: { label: t('invoices.pendingStatus'),  cls: 'badge-amber' },
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: 'var(--navy)', marginBottom: '4px' }}>{t('invoices.title')}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{list.length} {t('invoices.countSuffix')}</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary">{t('invoices.newBtn')}</Link>
      </div>

      {/* Summary strips */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{t('invoices.paid')}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#16A34A' }}>{fmt(totalPaid)}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>🕐</span>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{t('invoices.pending')}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#D97706' }}>{fmt(totalPending)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {list.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>{t('invoices.empty')}</p>
            <Link href="/dashboard/invoices/new" className="btn-primary">{t('invoices.createFirst')}</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('invoices.colNumber')}</th>
                  <th>{t('invoices.colClient')}</th>
                  <th>{t('invoices.colDate')}</th>
                  <th>{t('invoices.colBase')}</th>
                  <th>{t('invoices.colVat')}</th>
                  <th>{t('invoices.colTotal')}</th>
                  <th>{t('invoices.colStatus')}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map(inv => {
                  const s = STATUS_MAP[inv.status] || STATUS_MAP.draft
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{inv.invoice_number}</td>
                      <td>{inv.client_name}</td>
                      <td style={{ color: 'var(--muted)' }}>{new Date(inv.issued_date).toLocaleDateString('es-ES')}</td>
                      <td>{fmt(inv.subtotal)}</td>
                      <td>{fmt(inv.iva_amount)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(inv.total)}</td>
                      <td><InvoiceStatusSelect invoiceId={inv.id} currentStatus={inv.status} /></td>
                      <td><InvoiceRowActions invoiceId={inv.id} invoiceNumber={inv.invoice_number} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
