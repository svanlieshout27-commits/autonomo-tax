import { auth, currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Normalize Spanish special chars for PDF standard fonts
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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', paid: 'Cobrada', overdue: 'Vencida', pending: 'Pendiente',
}

const NAVY  = rgb(0.11, 0.17, 0.29) // #1C2B4A
const RUST  = rgb(0.78, 0.29, 0.19) // #C84B31
const MUTED = rgb(0.42, 0.44, 0.50) // #6B7280
const WHITE = rgb(1, 1, 1)
const LIGHT = rgb(0.97, 0.96, 0.94) // #F7F5F0
const BORDER = rgb(0.90, 0.89, 0.85)

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const user = await currentUser()
  const { id } = await context.params

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !invoice) return new Response('Not found', { status: 404 })

  // ── Build PDF ──────────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Factura ${invoice.invoice_number}`)
  pdfDoc.setAuthor('autonomo.app')

  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const margin = 48

  let y = height - margin

  // ── Header bar ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY })

  // Brand
  page.drawText('autonomo', {
    x: margin, y: height - 52,
    size: 22, font: fontBold, color: WHITE,
  })
  page.drawText('.app', {
    x: margin + fontBold.widthOfTextAtSize('autonomo', 22),
    y: height - 52,
    size: 22, font: fontBold, color: RUST,
  })

  // FACTURA label right-aligned
  const facLabel = 'FACTURA'
  page.drawText(facLabel, {
    x: width - margin - fontBold.widthOfTextAtSize(facLabel, 18),
    y: height - 50,
    size: 18, font: fontBold, color: WHITE,
  })

  y = height - 80 - 28

  // ── Invoice meta strip ────────────────────────────────────────────────────
  const metaItems = [
    { label: 'Numero:', value: norm(invoice.invoice_number) },
    { label: 'Fecha:', value: fmtDate(invoice.issued_date) },
    { label: 'Estado:', value: norm(STATUS_LABELS[invoice.status] || invoice.status) },
  ]
  const colW = (width - margin * 2) / metaItems.length

  metaItems.forEach((m, i) => {
    const x = margin + i * colW
    page.drawText(norm(m.label), { x, y, size: 9, font: fontReg, color: MUTED })
    page.drawText(m.value, { x, y: y - 14, size: 12, font: fontBold, color: NAVY })
  })

  y -= 48

  // ── Divider ───────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })
  y -= 24

  // ── Parties: Emisor | Receptor ────────────────────────────────────────────
  const halfW = (width - margin * 2 - 20) / 2

  // Emisor
  page.drawText('EMISOR', { x: margin, y, size: 8, font: fontBold, color: RUST })
  y -= 14
  const userName = norm([user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Tu nombre')
  page.drawText(userName, { x: margin, y, size: 11, font: fontBold, color: NAVY })
  if (user?.emailAddresses?.[0]?.emailAddress) {
    page.drawText(norm(user.emailAddresses[0].emailAddress), {
      x: margin, y: y - 14, size: 9, font: fontReg, color: MUTED,
    })
  }

  // Receptor
  const rxX = margin + halfW + 20
  page.drawText('RECEPTOR', { x: rxX, y: y + 14, size: 8, font: fontBold, color: RUST })
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
  const colTotalW = 80
  const xDesc  = margin
  const xQty   = xDesc + colDescW
  const xPrice = xQty + colQtyW
  const xTotal = xPrice + colPriceW

  // Table header
  page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 20, color: NAVY })
  page.drawText('DESCRIPCION', { x: xDesc, y: y + 2, size: 8, font: fontBold, color: WHITE })
  page.drawText('CANT.', { x: xQty, y: y + 2, size: 8, font: fontBold, color: WHITE })
  page.drawText('PRECIO UNIT.', { x: xPrice, y: y + 2, size: 8, font: fontBold, color: WHITE })
  page.drawText('IMPORTE', { x: xTotal, y: y + 2, size: 8, font: fontBold, color: WHITE })

  y -= 18

  // Items
  const items: { description: string; quantity: number; unit_price: number }[] = invoice.items || []
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 18, color: LIGHT })
    }
    const lineTotal = item.quantity * item.unit_price
    // Truncate long descriptions
    let desc = norm(item.description)
    while (fontReg.widthOfTextAtSize(desc, 10) > colDescW - 8 && desc.length > 0) {
      desc = desc.slice(0, -1)
    }
    if (desc.length < norm(item.description).length) desc = desc.slice(0, -3) + '...'

    page.drawText(desc, { x: xDesc, y, size: 10, font: fontReg, color: NAVY })
    page.drawText(String(item.quantity), { x: xQty, y, size: 10, font: fontReg, color: NAVY })
    page.drawText(fmtEur(item.unit_price), { x: xPrice, y, size: 10, font: fontReg, color: NAVY })
    page.drawText(fmtEur(lineTotal), { x: xTotal, y, size: 10, font: fontBold, color: NAVY })
    y -= 20
  })

  y -= 12

  // ── Totals block ──────────────────────────────────────────────────────────
  const totalsX = width - margin - 220
  const totalsWidth = 220

  const ivaRate  = invoice.subtotal > 0 ? Math.round((invoice.iva_amount  / invoice.subtotal) * 100) : 21
  const irpfRate = invoice.subtotal > 0 ? Math.round((invoice.irpf_amount / invoice.subtotal) * 100) : 15

  const totRows = [
    { label: 'Base imponible:', value: fmtEur(invoice.subtotal) },
    { label: `IVA (${ivaRate}%):`, value: fmtEur(invoice.iva_amount) },
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

  // Total line
  page.drawLine({ start: { x: totalsX, y }, end: { x: totalsX + totalsWidth, y }, thickness: 1, color: NAVY })
  y -= 14
  page.drawText('TOTAL:', { x: totalsX, y, size: 13, font: fontBold, color: NAVY })
  const totalStr = fmtEur(invoice.total)
  page.drawText(totalStr, {
    x: totalsX + totalsWidth - fontBold.widthOfTextAtSize(totalStr, 13),
    y, size: 13, font: fontBold, color: RUST,
  })

  y -= 50

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })
  y -= 14
  const footerText = norm(`Generado con autonomo.app — Estimacion orientativa. Consulta con tu asesor fiscal.`)
  page.drawText(footerText, {
    x: margin, y,
    size: 8, font: fontReg, color: MUTED,
  })

  // ── Serialize & return ────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="factura-${norm(invoice.invoice_number)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
