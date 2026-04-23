import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--navy)' }}>
          autónomo<span style={{ color: 'var(--rust)' }}>.</span>app
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>Crea tu cuenta gratis</p>
      </div>
      <SignUp />
    </div>
  )
}
