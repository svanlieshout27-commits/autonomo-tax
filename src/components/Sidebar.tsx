import { UserButton } from '@clerk/nextjs'
import { getServerT } from '@/lib/i18n'
import LanguageSwitcher from './LanguageSwitcher'
import SidebarNav from './SidebarNav'

export default async function Sidebar() {
  const { t, locale } = await getServerT()

  const navItems = [
    { href: '/dashboard',             icon: '📊', label: t('nav.dashboard') },
    { href: '/dashboard/invoices',    icon: '📄', label: t('nav.invoices')  },
    { href: '/dashboard/expenses',    icon: '🧾', label: t('nav.expenses')  },
    { href: '/dashboard/tax',         icon: '🏛️', label: t('nav.tax')       },
    { href: '/dashboard/settings',    icon: '⚙️', label: t('nav.settings')  },
  ]

  return (
    <aside style={{
      width: '220px', minHeight: '100vh', flexShrink: 0,
      background: 'var(--navy)',
      display: 'flex', flexDirection: 'column',
      padding: '0',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>
          autónomo<span style={{ color: 'var(--rust)' }}>.</span>app
        </span>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', letterSpacing: '0.05em' }}>
          {locale.toUpperCase()}
        </div>
      </div>

      {/* Nav (client for active-state highlighting) */}
      <SidebarNav items={navItems} />

      {/* Language switcher */}
      <div style={{ padding: '0 10px 12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', padding: '0 4px' }}>
          {t('common.language')}
        </div>
        <LanguageSwitcher current={locale} label={t('common.language')} />
      </div>

      {/* User */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <UserButton afterSignOutUrl="/" />
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Mi cuenta</span>
      </div>
    </aside>
  )
}
