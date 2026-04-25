import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { getServerT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function getQuarterRange(year: number, q: number, t: (k: string) => string) {
  const startMonth = (q - 1) * 3
  const deadlineKey = `tax.q${q}deadline` as const
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0),
    label: `${t('dashboard.quarter')}${q} ${year}`,
    deadline: t(deadlineKey),
    modelo: t('tax.modelo'),
  }
}

export default async function TaxPage() {
  const { userId } = await auth()
  const { t } = await getServerT()

  const [{ data: invoices }, { data: expenses }, { data: settings }] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', userId!),
    supabase.from('expenses').select('*').eq('user_id', userId!),
    supabase.from('user_settings').select('ss_monthly_quota').eq('user_id', userId!).single(),
  ])

  const ssMonthlyQuota: number = (settings as any)?.ss_monthly_quota ?? 294
  const ssQuarterly = ssMonthlyQuota * 3

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQ = Math.floor(now.getMonth() / 3) + 1

  const quarters = [1, 2, 3, 4].map(q => {
    const range = getQuarterRange(currentYear, q, t)
    const qInvoices = (invoices || []).filter(i => {
      const d = new Date(i.issued_date)
      return d >= range.start && d <= range.end && i.status !== 'draft'
    })
    const qExpenses = (expenses || []).filter(e => {
      const d = new Date(e.date)
      return d >= range.start && d <= range.end
    })

    const income      = qInvoices.reduce((s, i) => s + (i.subtotal || 0), 0)
    const ivaCharged  = qInvoices.reduce((s, i) => s + (i.iva_amount || 0), 0)
    const irpfHeld    = qInvoices.reduce((s, i) => s + (i.irpf_amount || 0), 0)
    const totalExp    = qExpenses.reduce((s, e) => s + (e.amount || 0), 0)
    const deductible  = qExpenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0)
    const ivaDeducted = qExpenses.filter(e => e.deductible).reduce((s, e) => s + e.amount * 0.21, 0)
    const ivaOwed     = Math.max(0, ivaCharged - ivaDeducted)
    const taxableBase = income - deductible
    const irpfEstimate= taxableBase * 0.20 // estimated 20% provisional IRPF payment

    return { q, range, qInvoices, qExpenses, income, ivaCharged, irpfHeld, totalExp, deductible, ivaDeducted, ivaOwed, taxableBase, irpfEstimate }
  })

  const yearIncome = quarters.reduce((s, q) => s + q.income, 0)
  const yearIva    = quarters.reduce((s, q) => s + q.ivaOwed, 0)
  const yearIrpf   = quarters.reduce((s, q) => s + q.irpfHeld, 0)
  const yearExp    = quarters.reduce((s, q) => s + q.totalExp, 0)
  const yearSS     = ssMonthlyQuota * 12

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', color: 'var(--navy)', marginBottom: '4px' }}>{t('tax.title')}</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{t('tax.year')} {currentYear} — {t('tax.subtitle')}</p>
      </div>

      {/* Year totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '32px' }}>
        {[
          { label: t('tax.yearIncome'),    value: fmt(yearIncome), color: 'var(--navy)', icon: '💶' },
          { label: t('tax.yearExpenses'), value: fmt(yearExp),    color: 'var(--navy)', icon: '🧾' },
          { label: t('tax.yearVat'),      value: fmt(yearIva),    color: '#C84B31',     icon: '📊' },
          { label: t('tax.yearIrpf'),     value: fmt(yearIrpf),   color: '#16A34A',     icon: '✅' },
          { label: t('tax.yearSS'),       value: fmt(yearSS),     color: '#7C3AED',     icon: '🏛️' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
              <span style={{ fontSize: '18px' }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Quarterly breakdown */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)', marginBottom: '16px' }}>{t('tax.quarterly')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {quarters.map(({ q, range, income, ivaCharged, irpfHeld, totalExp, deductible, ivaDeducted, ivaOwed, taxableBase, irpfEstimate }) => {
          const isPast    = q < currentQ
          const isCurrent = q === currentQ
          const isFuture  = q > currentQ

          return (
            <div
              key={q}
              className="card"
              style={{
                padding: '24px',
                opacity: isFuture ? 0.55 : 1,
                borderLeft: isCurrent ? '4px solid var(--rust)' : '4px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)', marginBottom: '2px' }}>
                    {range.label}
                    {isCurrent && <span style={{ marginLeft: '10px', fontSize: '11px', background: '#C84B31', color: 'white', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{t('tax.current')}</span>}
                    {isPast && <span style={{ marginLeft: '10px', fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{t('tax.completed')}</span>}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {t('tax.deadlineLabel')}: {range.deadline} — {range.modelo}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>{t('tax.totalToPayLabel')}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#C84B31' }}>{fmt(ivaOwed)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Income */}
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    📄 {t('tax.income')}
                  </div>
                  {[
                    { label: t('tax.base'), value: fmt(income) },
                    { label: t('tax.vatCharged'), value: fmt(ivaCharged) },
                    { label: t('tax.irpfHeld'), value: `-${fmt(irpfHeld)}` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid var(--border)', color: 'var(--ink)' }}>
                      <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                      <span style={{ fontWeight: 600 }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Expenses */}
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    🧾 {t('tax.expensesSection')}
                  </div>
                  {[
                    { label: t('tax.totalExpenses'), value: fmt(totalExp) },
                    { label: t('tax.deductible'), value: fmt(deductible) },
                    { label: t('tax.vatDeducted'), value: `-${fmt(ivaDeducted)}` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid var(--border)', color: 'var(--ink)' }}>
                      <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                      <span style={{ fontWeight: 600 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* IVA + IRPF + SS result */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{ background: ivaOwed > 0 ? '#FEF3C7' : '#DCFCE7', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: ivaOwed > 0 ? '#92400E' : '#14532D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('tax.vatNet')}</div>
                    <div style={{ fontSize: '11px', color: ivaOwed > 0 ? '#92400E' : '#14532D', marginTop: '2px' }}>{t('tax.vatFormula')}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: ivaOwed > 0 ? '#D97706' : '#16A34A' }}>{fmt(ivaOwed)}</div>
                </div>
                <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#14532D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('tax.irpfLabel')}</div>
                    <div style={{ fontSize: '11px', color: '#14532D', marginTop: '2px' }}>{t('tax.irpfSub')}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#16A34A' }}>{fmt(irpfHeld)}</div>
                </div>
                <div style={{ background: '#F3F0FF', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('tax.ssLabel')}</div>
                    <div style={{ fontSize: '11px', color: '#5B21B6', marginTop: '2px' }}>{t('tax.ssSub')}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#7C3AED' }}>{fmt(ssQuarterly)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: '24px', padding: '16px 20px', background: '#F1F5F9', borderRadius: '12px', fontSize: '13px', color: 'var(--muted)' }}>
        ⚠️ <strong>{t('tax.warning')}:</strong> {t('tax.disclaimer')}
      </div>
    </div>
  )
}
