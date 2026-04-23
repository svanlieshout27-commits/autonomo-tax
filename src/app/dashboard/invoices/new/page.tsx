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

type LineItem = { description: string; quantity: number; unit_price: number }

export default function NewInvoicePage() {
  const { user } = useUser()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const t = getT(getClientLocale())

  const [form, setForm] = useState({
    invoice_number: `F-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    client_name: '',
    client_nif: '',
    issued_date: new Date().toISOString().split('T')[0],
    iva_rate: 21,
    irpf_rate: 15,
    status: 'sent',
  })
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }])

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const iva_amount  = subtotal * (form.iva_rate / 100)
  const irpf_amount = subtotal * (form.irpf_rate / 100)
  const total = subtotal + iva_amount - irpf_amount

  function setItem(idx: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }

  function addItem() { setItems(p => [...p, { description: '', quantity: 1, unit_price: 0 }]) }
  function removeItem(idx: number) { setItems(p => p.filter((_, i) => i !== idx)) }

  async function handleSave() {
    if (!form.client_name) return setError(t('invoices.errClientRequired'))
    if (items.some(i => !i.description)) return setError(t('invoices.errDescRequired'))
    setSaving(true)
    setError('')
    const { error: e } = await supabase.from('invoices').insert({
      user_id: user!.id,
      invoice_number: form.invoice_number,
      client_name: form.client_name,
      client_nif: form.client_nif,
      items,
      subtotal,
      iva_amount,
      irpf_amount,
      total,
      issued_date: form.issued_date,
      status: form.status,
    })
    setSaving(false)
    if (e) return setError(e.message)
    router.push('/dashboard/invoices')
  }

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

  return (
    <div style={{ padding: '32px 36px', maxWidth: '820px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>{t('common.back')}</button>
        <h1 style={{ fontSize: '22px', color: 'var(--navy)' }}>{t('invoices.newTitle')}</h1>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Invoice meta */}
        <div className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '18px', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('invoices.invoiceData')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label">{t('invoices.invoiceNumber')}</label>
              <input className="input" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('invoices.issueDate')}</label>
              <input className="input" type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('invoices.statusLabel')}</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">{t('invoices.draft')}</option>
                <option value="sent">{t('invoices.sent')}</option>
                <option value="paid">{t('invoices.paidStatus')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('invoices.clientName')}</label>
              <input className="input" placeholder="Empresa S.L." value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('invoices.clientNif')}</label>
              <input className="input" placeholder="B12345678" value={form.client_nif} onChange={e => setForm(f => ({ ...f, client_nif: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label className="label">IVA %</label>
                <select className="input" value={form.iva_rate} onChange={e => setForm(f => ({ ...f, iva_rate: Number(e.target.value) }))}>
                  {[0, 4, 10, 21].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">IRPF %</label>
                <select className="input" value={form.irpf_rate} onChange={e => setForm(f => ({ ...f, irpf_rate: Number(e.target.value) }))}>
                  {[0, 7, 15, 19].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '18px', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('invoices.items')}</h3>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 36px', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
              <input className="input" placeholder={t('invoices.serviceDesc')} value={it.description} onChange={e => setItem(idx, 'description', e.target.value)} />
              <input className="input" type="number" min={1} placeholder="Uds." value={it.quantity} onChange={e => setItem(idx, 'quantity', Number(e.target.value))} />
              <input className="input" type="number" min={0} step="0.01" placeholder="€ / ud." value={it.unit_price} onChange={e => setItem(idx, 'unit_price', Number(e.target.value))} />
              <button onClick={() => removeItem(idx)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid #FCA5A5', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}
          <button onClick={addItem} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px', marginTop: '6px' }}>
            {t('invoices.addLine')}
          </button>
        </div>

        {/* Totals */}
        <div className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px' }}>
              {[
                { label: t('invoices.netAmount'), val: fmt(subtotal) },
                { label: `IVA (${form.iva_rate}%)`, val: fmt(iva_amount) },
                { label: `IRPF (${form.irpf_rate}%)`, val: `-${fmt(irpf_amount)}` },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '14px', color: 'var(--muted)' }}>
                  <span>{r.label}</span><span>{r.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button onClick={() => router.back()} className="btn-secondary">{t('invoices.cancel')}</button>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? t('invoices.saving') : `💾 ${t('invoices.saveInvoice')}`}
        </button>
      </div>
    </div>
  )
}
