'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; icon: string; label: string }

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const path = usePathname()

  return (
    <nav style={{ flex: 1, padding: '16px 10px' }}>
      {items.map(({ href, icon, label }) => {
        const active = path === href || (href !== '/dashboard' && path.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px', marginBottom: '2px',
              textDecoration: 'none', fontSize: '14px', fontWeight: 500,
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '16px' }}>{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
