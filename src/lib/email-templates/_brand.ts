/**
 * Shared DashCompass brand styles for auth emails.
 * Body background stays #ffffff (email client requirement); the inner card
 * carries the dark premium look with neon lime accents.
 */
export const FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: FONT_STACK,
  margin: '0',
  padding: '32px 0',
}

export const container = {
  backgroundColor: '#0b0f0a',
  borderRadius: '20px',
  border: '1px solid #1d2a18',
  padding: '40px 36px',
  maxWidth: '520px',
  margin: '0 auto',
}

export const brand = {
  fontSize: '18px',
  fontWeight: 700 as const,
  color: '#3dfc03',
  letterSpacing: '-0.02em',
  margin: '0 0 28px',
}

export const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#ffffff',
  letterSpacing: '-0.02em',
  margin: '0 0 16px',
}

export const text = {
  fontSize: '15px',
  color: '#a9b3a4',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const link = { color: '#3dfc03', textDecoration: 'underline' }

export const button = {
  backgroundColor: '#3dfc03',
  color: '#0b0f0a',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '14px',
  padding: '14px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const code = {
  fontSize: '30px',
  fontWeight: 700 as const,
  letterSpacing: '8px',
  color: '#3dfc03',
  backgroundColor: '#111a0e',
  border: '1px solid #26381f',
  borderRadius: '14px',
  padding: '18px 24px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

export const hr = {
  border: 'none',
  borderTop: '1px solid #1d2a18',
  margin: '32px 0 20px',
}

export const footer = {
  fontSize: '12px',
  color: '#6b7466',
  lineHeight: '1.6',
  margin: '0',
}
