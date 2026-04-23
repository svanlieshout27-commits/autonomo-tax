import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Nav */}
      <nav style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--navy)' }}>
          autónomo<span style={{ color: 'var(--rust)' }}>.</span>app
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/sign-in" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Iniciar sesión
          </Link>
          <Link href="/sign-up" className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '100px 24px 60px', textAlign: 'center' }}>
        <div className="badge badge-blue" style={{ marginBottom: '24px', fontSize: '13px' }}>
          Diseñado para autónomos en España
        </div>
        <h1 style={{ fontSize: '52px', lineHeight: 1.12, color: 'var(--navy)', marginBottom: '24px' }}>
          Facturas, gastos e impuestos<br />
          <em style={{ color: 'var(--rust)', fontStyle: 'italic' }}>sin complicaciones.</em>
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '40px', maxWidth: '540px', margin: '0 auto 40px' }}>
          Crea facturas legales, registra tus gastos y calcula cuánto debes a Hacienda este trimestre — en menos de 5 minutos.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/sign-up" className="btn-primary" style={{ fontSize: '15px', padding: '13px 28px' }}>
            Crear cuenta gratis →
          </Link>
          <Link href="/sign-in" className="btn-secondary" style={{ fontSize: '15px', padding: '13px 28px' }}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {[
            { icon: '📄', title: 'Facturas legales', desc: 'Crea facturas con IVA e IRPF válidas para España en segundos. Descarga en PDF.' },
            { icon: '💰', title: 'Control de gastos', desc: 'Registra tus gastos deducibles por categoría. Sube fotos de tus recibos.' },
            { icon: '📊', title: 'Cálculo trimestral', desc: 'Ve en tiempo real cuánto debes en tu próxima declaración. Sin sorpresas.' },
          ].map(f => (
            <div key={f.title} className="card" style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '17px', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '10px', color: 'var(--navy)' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
