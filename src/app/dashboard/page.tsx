import { auth, currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getServerT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function getQuarter() {
  const m = new Date().getMonth()
  return Math.floor(m / 3) + 1
}

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()
  const { t } = await getServerT()

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', userId!),
    supabase.from('expenses').select('*').eq('user_id', userId!),
  ])

  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)

  const qInvoices = (invoices || []).filter(i => new Date(i.issued_date) >= qStart && i.status !== 'draft')
  const qExpenses = (expenses || []).filter(e => new Date(e.date) >= qStart)

  const totalIncome  = qInvoices.reduce((s, i) => s + (i.subtotal || 0), 0)
  const totalIva     = qInvoices.reduce((s, i) => s + (i.iva_amount || 0), 0)
  const totalIrpf    = qInvoices.reduce((s, i) => s + (i.irpf_amount || 0), 0)
  const totalExpenses= qExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const deductible   = qExpenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0)
  const ivaOwed      = totalIva - qExpenses.reduce((s,e)=> s + (e.deductible ? e.amount * 0.21 : 0), 0)
  const irpfOwed     = totalIrpf

  const pending = (invoices || []).filter(i => i.status === 'pending' || i.status === 'sent').length
  const overdue = (invoices || []).filter(i => i.status === 'overdue').length

  const firstName = user?.firstName || 'autónomo'
  const q = getQuarter()

  const kpis = [
    { label: `${t('dashboard.income')} T${q}`, value: fmt(totalIncome),          sub: `${qInvoices.length} ${t('dashboard.invoicesIssued')}`, color: '#1C2B4A', icon: '💶' },
    { label: `${t('dashboard.expenses')} T${q}`,value: fmt(totalExpenses),        sub: `${fmt(deductible)} ${t('dashboard.deductible')}`,      color: '#1C2B4A', icon: '🧾' },
    { label: t('dashboard.vatOwed'),             value: fmt(Math.max(0, ivaOwed)), sub: `T${q} ${t('dashboard.estimated')}`,                   color: '#C84B31', icon: '📊' },
    { label: t('dashboard.irpfHeld'),            value: fmt(irpfOwed),             sub: t('dashboard.alreadyWithheld'),                        color: '#16A34A', icon: '✅' },
  ]

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', color: 'var(--navy)', marginBottom: '6px' }}>
          {t('dashboard.hello')}, {firstName} 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          {t('dashboard.summary')} {`T${q}`} — {now.getFullYear()}
        </p>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {kpis.map(k => (
          <div key={k.label} className="card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
              <span style={{ fontSize: '20px' }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: k.color, fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '6px' }}>{k.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions + alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Quick actions */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--navy)' }}>{t('dashboard.quickActions')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/dashboard/invoices/new" className="btn-primary" style={{ justifyContent: 'center' }}>
              {t('dashboard.newInvoice')}
            </Link>
            <Link href="/dashboard/expenses/new" className="btn-secondary" style={{ justifyContent: 'center' }}>
              {t('dashboard.addExpense')}
            </Link>
            <Link href="/dashboard/tax" className="btn-secondary" style={{ justifyContent: 'center' }}>
              {t('dashboard.viewTax')}
            </Link>
          </div>
        </div>

        {/* Alerts */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--navy)' }}>{t('dashboard.statusTitle')}</h3>
          {pending === 0 && overdue === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#DCFCE7', borderRadius: '10px', color: '#15803D', fontSize: '14px' }}>
              ✅ {t('dashboard.allGood')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overdue > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#FEE2E2', borderRadius: '10px', color: '#B91C1C', fontSize: '14px' }}>
                  ⚠️ {overdue} {overdue > 1 ? t('dashboard.overdueP') : t('dashboard.overdue')}
                </div>
              )}
              {pending > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#FEF3C7', borderRadius: '10px', color: '#B45309', fontSize: '14px' }}>
                  🕐 {pending} {pending > 1 ? t('dashboard.pendingP') : t('dashboard.pending')}
                </div>
              )}
            </div>
          )}

          {/* Next deadline */}
          <div style={{ marginTop: '16px', padding: '14px', background: '#F1F5F9', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('dashboard.nextDeclaration')}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--navy)', fontWeight: 600 }}>
              {q === 1 ? '30 de abril' : q === 2 ? '20 de julio' : q === 3 ? '20 de octubre' : '30 de enero'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Modelo 303 (IVA) + Modelo 130 (IRPF)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
