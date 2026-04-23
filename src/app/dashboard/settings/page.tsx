'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

const IVA_RATES = [
  { value: 0,  label: '0% — Exento / Operaciones no sujetas' },
  { value: 4,  label: '4% — Tipo superreducido (bienes básicos)' },
  { value: 10, label: '10% — Tipo reducido (servicios específicos)' },
  { value: 21, label: '21% — Tipo general ✓ (la mayoría de autónomos)' },
]

const IRPF_RATES = [
  { value: 0,  label: '0% — Sin retención' },
  { value: 7,  label: '7% — Inicio actividad (primeros 3 años)' },
  { value: 15, label: '15% — Tipo general ✓ (la mayoría de autónomos)' },
  { value: 19, label: '19% — Otros rendimientos de capital' },
]

const OFFICIAL_LINKS = [
  {
    category: 'Agencia Tributaria (AEAT)',
    links: [
      { label: 'Portal principal AEAT', url: 'https://www.agenciatributaria.es/', desc: 'Sede electrónica oficial — declaraciones, certificados, consultas' },
      { label: 'Calendario del contribuyente 2025', url: 'https://www.agenciatributaria.es/AEAT.internet/Inicio/Ayuda/Manuales__Folletos_y_Videos/Folletos/Folleto_Calendario_del_contribuyente/Folleto_Calendario_del_contribuyente.shtml', desc: 'Fechas límite de todas las declaraciones trimestrales' },
      { label: 'Modelo 303 — Declaración IVA', url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html', desc: 'Presentación trimestral del IVA (autoliquidación)' },
      { label: 'Modelo 130 — Pago fraccionado IRPF', url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-130.html', desc: 'Pago trimestral a cuenta del IRPF para actividades económicas' },
      { label: 'Censo de actividades (IAE)', url: 'https://www.agenciatributaria.es/AEAT.internet/Inicio/Ayuda/Manuales__Folletos_y_Videos/Folletos/Folleto_Impuesto_sobre_Actividades_Economicas/Folleto_Impuesto_sobre_Actividades_Economicas.shtml', desc: 'Epígrafes IAE y tipos de actividades' },
    ]
  },
  {
    category: 'IVA — Tipo aplicable',
    links: [
      { label: 'Tipos de IVA en España (AEAT)', url: 'https://www.agenciatributaria.es/AEAT.internet/Inicio/Ayuda/Manuales__Folletos_y_Videos/Manuales_de_ayuda_a_la_presentacion/Ejercicio_2024/Manual_practico_de_IVA_2024/Manual_practico_de_IVA_2024.shtml', desc: 'Manual práctico oficial: tipos general, reducido y superreducido' },
      { label: '¿Qué tipo de IVA aplico?', url: 'https://www.agenciatributaria.es/AEAT.internet/Inicio/Ayuda/Manuales__Folletos_y_Videos/Folletos/Folleto_IVA_para_el_pequeno_empresario_y_profesional/Folleto_IVA_para_el_pequeno_empresario_y_profesional.shtml', desc: 'Guía para pequeños empresarios y profesionales' },
    ]
  },
  {
    category: 'IRPF — Retención autónomos',
    links: [
      { label: 'Rendimientos de actividades económicas', url: 'https://www.agenciatributaria.es/AEAT.internet/Inicio/Ayuda/Manuales__Folletos_y_Videos/Manuales_de_ayuda_a_la_presentacion/Ejercicio_2024/Manual_IRPF_2024/Manual_IRPF_2024.shtml', desc: 'Manual oficial IRPF 2024 — módulos, estimación directa' },
      { label: 'Tipo reducido 7% nuevos autónomos', url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta/profesionales-autonomos.html', desc: 'Condiciones para aplicar el tipo reducido del 7%' },
    ]
  },
  {
    category: 'Seguridad Social — Cuota autónomos',
    links: [
      { label: 'Cotización autónomos (TGSS)', url: 'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/10721', desc: 'Sistema de cotización por ingresos reales desde 2023' },
      { label: 'Tabla de cuotas 2025', url: 'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537', desc: 'Tramos de rendimientos netos y cuotas mensuales' },
    ]
  },
]

export default function SettingsPage() {
  const { user } = useUser()
  const [ivaRate, setIvaRate] = useState(21)
  const [irpfRate, setIrpfRate] = useState(15)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setIvaRate(data.default_iva_rate)
        setIrpfRate(data.default_irpf_rate)
      }
      setLoading(false)
    }
    load()
  }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      default_iva_rate: ivaRate,
      default_irpf_rate: irpfRate,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: '820px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', color: 'var(--navy)', marginBottom: '4px' }}>Configuración</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Ajusta tus tipos por defecto y consulta fuentes oficiales</p>
      </div>

      {/* Tax defaults */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)', marginBottom: '6px' }}>
          ⚙️ Tipos por defecto
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
          Estos valores se preseleccionarán al crear nuevas facturas. Puedes cambiarlos en cada factura individualmente.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* IVA */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              IVA por defecto
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {IVA_RATES.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: ivaRate === r.value ? '2px solid var(--navy)' : '1.5px solid var(--border)', background: ivaRate === r.value ? '#EEF2FF' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="radio" name="iva" value={r.value} checked={ivaRate === r.value} onChange={() => setIvaRate(r.value)} style={{ marginTop: '2px', accentColor: 'var(--navy)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.4' }}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* IRPF */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              IRPF por defecto
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {IRPF_RATES.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: irpfRate === r.value ? '2px solid var(--navy)' : '1.5px solid var(--border)', background: irpfRate === r.value ? '#EEF2FF' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="radio" name="irpf" value={r.value} checked={irpfRate === r.value} onChange={() => setIrpfRate(r.value)} style={{ marginTop: '2px', accentColor: 'var(--navy)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.4' }}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '24px' }}>
          <button onClick={handleSave} className="btn-primary" disabled={saving || loading}>
            {saving ? 'Guardando…' : '💾 Guardar configuración'}
          </button>
          {saved && (
            <span style={{ fontSize: '13px', color: '#16A34A', fontWeight: 600 }}>✓ Guardado correctamente</span>
          )}
        </div>
      </div>

      {/* Official sources */}
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>
          📋 Fuentes oficiales
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
          Consulta siempre la normativa vigente antes de declarar. Los tipos impositivos pueden cambiar con cada ejercicio fiscal.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {OFFICIAL_LINKS.map(section => (
          <div key={section.category} className="card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
              {section.category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {section.links.map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1.5px solid var(--border)', textDecoration: 'none', transition: 'all 0.15s', gap: '12px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = 'var(--navy)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', marginBottom: '2px' }}>{link.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{link.desc}</div>
                  </div>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: '24px', padding: '14px 18px', background: '#FEF3C7', borderRadius: '12px', fontSize: '13px', color: '#92400E', border: '1px solid #FDE68A' }}>
        ⚠️ <strong>Aviso legal:</strong> Esta aplicación proporciona estimaciones orientativas. Los tipos fiscales mostrados son de carácter general. Tu situación particular puede variar. Consulta siempre con un asesor fiscal homologado para tus declaraciones oficiales.
      </div>
    </div>
  )
}
