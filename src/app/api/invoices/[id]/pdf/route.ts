import { auth, currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getT, LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locales'

// Normalize accented/special chars for PDF standard fonts
function norm(str: string): string {
  return (str || '')
    .replace(/á/g, 'a').replace(/Á/g, 'A')
    .replace(/é/g, 'e').replace(/É/g, 'E')
    .replace(/í/g, 'i').replace(/Í/g, 'I')
    .replace(/ó/g, 'o').replace(/Ó/g, 'O')
    .replace(/ú/g, 'u').replace(/Ú/g, 'U')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/¡/g, '!').replace(/¿/g, '?')
    .replace(/€/g, 'EUR')
    .replace(/[^\x00-\x7F]/g, '?')
}

function fmtEur(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// PDF-specific labels per locale (keeps route self-contained)
const PDF_LABELS: Record<string, Record<string, string>> = {
  es: {
    invoice: 'FACTURA', number: 'Numero:', date: 'Fecha:', status: 'Estado:',
    from: 'EMISOR', to: 'RECEPTOR',
    description: 'DESCRIPCION', qty: 'CANT.', unitPrice: 'PRECIO UNIT.', amount: 'IMPORTE',
    netAmount: 'Base imponible:', total: 'TOTAL:',
    footer: 'Generado con autonomo.app — Estimacion orientativa. Consulta con tu asesor fiscal.',
    draft: 'Borrador', sent: 'Enviada', paid: 'Cobrada', overdue: 'Vencida', pending: 'Pendiente',
  },
  en: {
    invoice: 'INVOICE', number: 'Number:', date: 'Date:', status: 'Status:',
    from: 'FROM', to: 'TO',
    description: 'DESCRIPTION', qty: 'QTY', unitPrice: 'UNIT PRICE', amount: 'AMOUNT',
    netAmount: 'Net amount:', total: 'TOTAL:',
    footer: 'Generated with autonomo.app — Indicative estimates only. Consult a tax adviser for official filings.',
    draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', pending: 'Pending',
  },
  nl: {
    invoice: 'FACTUUR', number: 'Nummer:', date: 'Datum:', status: 'Status:',
    from: 'VAN', to: 'AAN',
    description: 'OMSCHRIJVING', qty: 'AANTAL', unitPrice: 'STUKSPRIJS', amount: 'BEDRAG',
    netAmount: 'Nettobedrag:', total: 'TOTAAL:',
    footer: 'Gegenereerd met autonomo.app — Indicatieve schattingen. Raadpleeg een belastingadviseur.',
    draft: 'Concept', sent: 'Verzonden', paid: 'Betaald', overdue: 'Verlopen', pending: 'In behandeling',
  },
  ca: {
    invoice: 'FACTURA', number: 'Numero:', date: 'Data:', status: 'Estat:',
    from: 'EMISSOR', to: 'RECEPTOR',
    description: 'DESCRIPCIO', qty: 'QUANT.', unitPrice: 'PREU UNIT.', amount: 'IMPORT',
    netAmount: 'Base imposable:', total: 'TOTAL:',
    footer: 'Generat amb autonomo.app — Estimacions orientatives. Consulta un assessor fiscal.',
    draft: 'Esborrany', sent: 'Enviada', paid: 'Cobrada', overdue: 'Vencuda', pending: 'Pendent',
  },
  de: {
    invoice: 'RECHNUNG', number: 'Nummer:', date: 'Datum:', status: 'Status:',
    from: 'VON', to: 'AN',
    description: 'BESCHREIBUNG', qty: 'MENGE', unitPrice: 'EINZELPREIS', amount: 'BETRAG',
    netAmount: 'Nettobetrag:', total: 'GESAMT:',
    footer: 'Erstellt mit autonomo.app — Orientierungswerte. Bitte Steuerberater konsultieren.',
    draft: 'Entwurf', sent: 'Gesendet', paid: 'Bezahlt', overdue: 'Uberfällig', pending: 'Ausstehend',
  },
  fr: {
    invoice: 'FACTURE', number: 'Numero:', date: 'Date:', status: 'Statut:',
    from: 'DE', to: 'A',
    description: 'DESCRIPTION', qty: 'QTE', unitPrice: 'PRIX UNIT.', amount: 'MONTANT',
    netAmount: 'Base imposable:', total: 'TOTAL:',
    footer: 'Genere avec autonomo.app — Estimations indicatives. Consultez un conseiller fiscal.',
    draft: 'Brouillon', sent: 'Envoyee', paid: 'Payee', overdue: 'En retard', pending: 'En attente',
  },
  it: {
    invoice: 'FATTURA', number: 'Numero:', date: 'Data:', status: 'Stato:',
    from: 'DA', to: 'A',
    description: 'DESCRIZIONE', qty: 'QTA', unitPrice: 'PREZZO UNIT.', amount: 'IMPORTO',
    netAmount: 'Imponibile:', total: 'TOTALE:',
    footer: 'Generato con autonomo.app — Stime indicative. Consultare un consulente fiscale.',
    draft: 'Bozza', sent: 'Inviata', paid: 'Pagata', overdue: 'Scaduta', pending: 'In attesa',
  },
}

const NAVY  = rgb(0.11, 0.17, 0.29)
const RUST  = rgb(0.78, 0.29, 0.19)
const MUTED = rgb(0.42, 0.44, 0.50)
const WHITE = rgb(1, 1, 1)
const LIGHT = rgb(0.97, 0.96, 0.94)
const BORDER = rgb(0.90, 0.89, 0.85)

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const user = await currentUser()
  const { id } = await context.params

  // Read locale from cookie
  const cookieHeader = req.headers.get('cookie') || ''
  const langMatch = cookieHeader.match(/(?:^|;\s*)lang=([^;]+)/)
  const langRaw = langMatch?.[1]
  const locale: Locale = (LOCALES.some(l => l.code === langRaw) ? langRaw as Locale : DEFAULT_LOCALE)
  const L = PDF_LABELS[locale] || PDF_LABELS.es

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !invoice) return new Response('Not found', { status: 404 })

  // ── Build PDF ──────────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`${L.invoice} ${invoice.invoice_number}`)
  pdfDoc.setAuthor('autonomo.app')

  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const margin = 48

  let y = height - margin

  // ── Header bar ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY })

  page.drawText('autonomo', { x: margin, y: height - 52, size: 22, font: fontBold, color: WHITE })
  page.drawText('.app', {
    x: margin + fontBold.widthOfTextAtSize('autonomo', 22),
    y: height - 52, size: 22, font: fontBold, color: RUST,
  })

  const facLabel = L.invoice
  page.drawText(facLabel, {
    x: width - margin - fontBold.widthOfTextAtSize(facLabel, 18),
    y: height - 50, size: 18, font: fontBold, color: WHITE,
  })

  y = height - 80 - 28

  // ── Invoice meta strip ────────────────────────────────────────────────────
  const statusLabel = L[invoice.status as keyof typeof L] || invoice.status
  const metaItems = [
    { label: L.number, value: norm(invoice.invoice_number) },
    { label: L.date,   value: fmtDate(invoice.issued_date) },
    { label: L.status, value: norm(String(statusLabel)) },
  ]
  const colW = (width - margin * 2) / metaItems.length

  metaItems.forEach((m, i) => {
    const x = margin + i * colW
    page.drawText(m.label, { x, y, size: 9, font: fontReg, color: MUTED })
    page.drawText(m.value, { x, y: y - 14, size: 12, font: fontBold, color: NAVY })
  })

  y -= 48

  // ── Divider ───────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })
  y -= 24

  // ── Parties ───────────────────────────────────────────────────────────────
  const halfW = (width - margin * 2 - 20) / 2

  page.drawText(L.from, { x: margin, y, size: 8, font: fontBold, color: RUST })
  y -= 14
  const userName = norm([user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your name')
  page.drawText(userName, { x: margin, y, size: 11, font: fontBold, color: NAVY })
  if (user?.emailAddresses?.[0]?.emailAddress) {
    page.drawText(norm(user.emailAddresses[0].emailAddress), {
      x: margin, y: y - 14, size: 9, font: fontReg, color: MUTED,
    })
  }

  const rxX = margin + halfW + 20
  page.drawText(L.to, { x: rxX, y: y + 14, size: 8, font: fontBold, color: RUST })
  page.drawText(norm(invoice.client_name), { x: rxX, y, size: 11, font: fontBold, color: NAVY })
  if (invoice.client_nif) {
    page.drawText(`NIF/CIF: ${norm(invoice.client_nif)}`, {
      x: rxX, y: y - 14, size: 9, font: fontReg, color: MUTED,
    })
  }

  y -= 50

  // ── Divider ───────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })
  y -= 18

  // ── Line items table ──────────────────────────────────────────────────────
  const colDescW  = 290
  const colQtyW   = 50
  const colPriceW = 80
  const xDesc  = margin
  const xQty   = xDesc + colDescW
  const xPrice = xQty + colQtyW
  const xTotal = xPrice + colPriceW

  page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 20, color: NAVY })
  page.drawText(L.description, { x: xDesc,  y: y + 2, size: 8, font: fontBold, color: WHITE })
  page.drawText(L.qty,         { x: xQty,   y: y + 2, size: 8, font: fontBold, color: WHITE })
  page.drawText(L.unitPrice,   { x: xPrice, y: y + 2, size: 8, font: fontBold, color: WHITE })
  page.drawText(L.amount,      { x: xTotal, y: y + 2, size: 8, font: fontBold, color: WHITE })

  y -= 18

  const items: { description: string; quantity: number; unit_price: number }[] = invoice.items || []
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 18, color: LIGHT })
    }
    const lineTotal = item.quantity * item.unit_price
    let desc = norm(item.description)
    while (fontReg.widthOfTextAtSize(desc, 10) > colDescW - 8 && desc.length > 0) desc = desc.slice(0, -1)
    if (desc.length < norm(item.description).length) desc = desc.slice(0, -3) + '...'

    page.drawText(desc,                    { x: xDesc,  y, size: 10, font: fontReg,  color: NAVY })
    page.drawText(String(item.quantity),   { x: xQty,   y, size: 10, font: fontReg,  color: NAVY })
    page.drawText(fmtEur(item.unit_price), { x: xPrice, y, size: 10, font: fontReg,  color: NAVY })
    page.drawText(fmtEur(lineTotal),       { x: xTotal, y, size: 10, font: fontBold, color: NAVY })
    y -= 20
  })

  y -= 12

  // ── Totals block ──────────────────────────────────────────────────────────
  const totalsX = width - margin - 220
  const totalsWidth = 220

  const ivaRate  = invoice.subtotal > 0 ? Math.round((invoice.iva_amount  / invoice.subtotal) * 100) : 21
  const irpfRate = invoice.subtotal > 0 ? Math.round((invoice.irpf_amount / invoice.subtotal) * 100) : 15

  const totRows = [
    { label: L.netAmount,            value: fmtEur(invoice.subtotal) },
    { label: `IVA (${ivaRate}%):`,   value: fmtEur(invoice.iva_amount) },
    { label: `IRPF (${irpfRate}%):`, value: `-${fmtEur(invoice.irpf_amount)}` },
  ]

  totRows.forEach(row => {
    page.drawText(row.label, { x: totalsX, y, size: 10, font: fontReg, color: MUTED })
    page.drawText(row.value, {
      x: totalsX + totalsWidth - fontReg.widthOfTextAtSize(row.value, 10),
      y, size: 10, font: fontReg, color: NAVY,
    })
    y -= 16
  })

  page.drawLine({ start: { x: totalsX, y }, end: { x: totalsX + totalsWidth, y }, thickness: 1, color: NAVY })
  y -= 14
  page.drawText(L.total, { x: totalsX, y, size: 13, font: fontBold, color: NAVY })
  const totalStr = fmtEur(invoice.total)
  page.drawText(totalStr, {
    x: totalsX + totalsWidth - fontBold.widthOfTextAtSize(totalStr, 13),
    y, size: 13, font: fontBold, color: RUST,
  })

  y -= 50

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })
  y -= 14
  page.drawText(norm(L.footer), { x: margin, y, size: 8, font: fontReg, color: MUTED })

  // ── Serialize & return ────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${norm(L.invoice.toLowerCase())}-${norm(invoice.invoice_number)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
