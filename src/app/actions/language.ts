'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Locale } from '@/lib/locales'

export async function setLanguage(locale: Locale) {
  const cookieStore = await cookies()
  cookieStore.set('lang', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}
