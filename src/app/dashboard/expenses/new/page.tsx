'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { getT, DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/locales'

function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  const lang = match?.[1]
  return (LOCALES.some(l => l.code === lang) ? lang as Locale : DEFAULT_LOCALE)
}

const CATEGORIES = ['Oficina', 'Transporte', 'Marketing', 'Formación', 'Software', 'Comidas', 'Material', 'Otros']

const CATEGORY_ICONS: Record<string, string> = {
  'Oficina': '🖥️', 'Transporte': '🚗', 'Marketing': '📢',
  'Formación': '📚', 'Software': '💻', 'Comidas': '🍽️',
  'Material': '📦', 'Otros': '📎',
}

export default function NewExpensePage() {
  const { user } = useUser()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const t = getT(getClientLocale())

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Otros',
    date: new Date().toISOString().split('T')[0],
    deductible: true,
    notes: '',
  })

  async function handleSave() {
    if (!form.description) return setError(t('expenses.errDescRequired'))
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      return setError(t('expenses.errAmountRequired'))
    }
    setSaving(true)
    setError('')
    const { error: e } = await supabase.from('expenses').insert({
      user_id: user!.id,
      description: form.description,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      deductible: form.deductible,
      notes: form.notes || null,
    })
    setSaving(false)
    if (e) return setError(e.message)
    router.push('/dashboard/expenses')
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>{t('common.back')}</button>
        <h1 style={{ fontSize: '22px', color: 'var(--navy)' }}>{t('expenses.newTitle')}</h1>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Description */}
        <div>
          <label className="label">{t('expenses.descLabel')}</label>
          <input
            className="input"
            placeholder={t('expenses.descPlaceholder')}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* Amount + Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="label">{t('expenses.amountLabel')}</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">{t('expenses.dateLabel')}</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label">{t('expenses.categoryLabel')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '6px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                style={{
                  padding: '10px 6px',
                  borderRadius: '10px',
                  border: form.category === cat ? '2px solid var(--navy)' : '1.5px solid var(--border)',
                  background: form.category === cat ? 'var(--navy)' : 'white',
                  color: form.category === cat ? 'white' : 'var(--ink)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '18px' }}>{CATEGORY_ICONS[cat]}</span>
                <span>{t(`expenses.categories.${cat}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Deductible toggle */}
        <div>
          <label className="label">{t('expenses.deductibleQ')}</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            {[true, false].map(val => (
              <button
                key={String(val)}
                onClick={() => setForm(f => ({ ...f, deductible: val }))}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: form.deductible === val
                    ? `2px solid ${val ? '#16A34A' : '#EF4444'}`
                    : '1.5px solid var(--border)',
                  background: form.deductible === val
                    ? (val ? '#DCFCE7' : '#FEE2E2')
                    : 'white',
                  color: form.deductible === val
                    ? (val ? '#15803D' : '#B91C1C')
                    : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {val ? t('expenses.yesDeductible') : t('expenses.noDeductible')}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            {t('expenses.deductibleInfo')}
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="label">{t('expenses.notesLabel')} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{t('expenses.optional')}</span></label>
          <textarea
            className="input"
            placeholder={t('expenses.notesPlaceholder')}
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button onClick={() => router.back()} className="btn-secondary">{t('expenses.cancel')}</button>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? t('expenses.saving') : `💾 ${t('expenses.saveExpense')}`}
        </button>
      </div>
    </div>
  )
}
