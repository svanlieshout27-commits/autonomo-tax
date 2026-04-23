'use client'

import { useState } from 'react'
import { LOCALES, type Locale } from '@/lib/locales'
import { setLanguage } from '@/app/actions/language'

export default function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSelect(code: Locale) {
    if (code === current) { setOpen(false); return }
    setOpen(false)
    setIsPending(true)
    await setLanguage(code)
    window.location.reload()
  }

  const currentLocale = LOCALES.find(l => l.code === current)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1.5px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.75)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      >
        <span style={{ fontSize: '16px' }}>{currentLocale?.flag}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{currentLocale?.label}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: 0,
          right: 0,
          background: '#1C2B4A',
          border: '1.5px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              disabled={isPending}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: l.code === current ? 'rgba(200,75,49,0.25)' : 'transparent',
                border: 'none',
                color: l.code === current ? '#fff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: l.code === current ? 600 : 400,
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (l.code !== current) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { if (l.code !== current) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '16px' }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === current && <span style={{ marginLeft: 'auto', color: '#C84B31' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
