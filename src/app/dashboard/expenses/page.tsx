import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getServerT } from '@/lib/i18n'
import ExpenseRowActions from '@/components/ExpenseRowActions'

export const dynamic = 'force-dynamic'

const CATEGORY_ICONS: Record<string, string> = {
  'Oficina': '🖥️', 'Transporte': '🚗', 'Marketing': '📢',
  'Formación': '📚', 'Software': '💻', 'Comidas': '🍽️',
  'Material': '📦', 'Otros': '📎',
}

export default async function ExpensesPage() {
  const { userId } = await auth()
  const { t } = await getServerT()
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId!)
    .order('date', { ascending: false })

  const list = expenses || []
  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

  const total = list.reduce((s, e) => s + e.amount, 0)
  const deductible = list.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0)

  const byCategory = list.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: 'var(--navy)', marginBottom: '4px' }}>{t('expenses.title')}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{list.length} {t('expenses.countSuffix')}</p>
        </div>
        <Link href="/dashboard/expenses/new" className="btn-primary">{t('expenses.newBtn')}</Link>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginBottom: '4px' }}>TOTAL</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>{fmt(total)}</div>
        </div>
        <div className="card" style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginBottom: '4px' }}>{t('expenses.totalDeductible')}</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#16A34A' }}>{fmt(deductible)}</div>
        </div>
        {Object.entries(byCategory).slice(0, 3).map(([cat, amt]) => (
          <div key={cat} className="card" style={{ padding: '14px 20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginBottom: '4px' }}>
              {CATEGORY_ICONS[cat] || '📎'} {(t(`expenses.categories.${cat}`) || cat).toUpperCase()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>{fmt(amt as number)}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {list.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧾</div>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>{t('expenses.empty')}</p>
            <Link href="/dashboard/expenses/new" className="btn-primary">{t('expenses.createFirst')}</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('expenses.colDate')}</th>
                  <th>{t('expenses.colDesc')}</th>
                  <th>{t('expenses.colCategory')}</th>
                  <th>{t('expenses.colAmount')}</th>
                  <th>{t('expenses.colDeductible')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ color: 'var(--muted)' }}>{new Date(exp.date).toLocaleDateString('es-ES')}</td>
                    <td style={{ fontWeight: 500 }}>{exp.description}</td>
                    <td>
                      <span className="badge badge-grey">
                        {CATEGORY_ICONS[exp.category] || '📎'} {t(`expenses.categories.${exp.category}`) || exp.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(exp.amount)}</td>
                    <td>
                      {exp.deductible
                        ? <span className="badge badge-green">✓ {t('expenses.yes')}</span>
                        : <span className="badge badge-grey">{t('expenses.no')}</span>
                      }
                    </td>
                    <td><ExpenseRowActions expenseId={exp.id} description={exp.description} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
