// SERVER-ONLY: imports next/headers. Do not import this in client components.
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, getT, type Locale, LOCALES } from './locales'

export type { Locale }
export { LOCALES, DEFAULT_LOCALE, getT }

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value
  if (lang && LOCALES.find(l => l.code === lang)) return lang as Locale
  return DEFAULT_LOCALE
}

export async function getServerT() {
  const locale = await getLocale()
  return { t: getT(locale), locale }
}
