import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

// A small Markdown subset → .docx and .pdf, with no dependencies, so /mep:export works on any machine.
// Supported: # ## ### headings, paragraphs, - and 1. lists, | tables |, > quotes, --- page breaks, **bold**,
// and PNG images on a line of their own: ![alt](path.png).

export type Inline = { text: string; bold: boolean }
export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: Inline[] }
  | { kind: 'paragraph'; text: Inline[] }
  | { kind: 'quote'; text: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'table'; rows: Inline[][][] }
  | { kind: 'image'; alt: string; path: string; data?: Buffer }
  | { kind: 'pagebreak' }

/** Reads each image block's PNG, relative to the Markdown file's folder. */
export function loadImages(blocks: Block[], baseDir: string): Block[] {
  return blocks.map(b => {
    if (b.kind !== 'image') return b
    if (!/\.png$/i.test(b.path)) throw new Error(`solo PNG: ${b.path}`)
    const file = join(baseDir, b.path)
    if (!existsSync(file)) throw new Error(`falta la imagen ${b.path}`)
    const data = readFileSync(file)
    const problem = pngProblem(data)
    if (problem) throw new Error(`${problem}: ${b.path}`)
    return { ...b, data }
  })
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/** Why a file cannot be embedded, or undefined when it is a PNG decodePng supports. */
function pngProblem(data: Buffer): string | undefined {
  if (data.length < 33 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) return 'no es un PNG válido'
  if (data[24] !== 8 || ![0, 2, 4, 6].includes(data[25]) || data[28] !== 0) return 'PNG no soportado (usa 8 bits por canal, sin paleta ni entrelazado)'
  return undefined
}

// ── PNG (8-bit gray, RGB, gray+alpha and RGBA, not interlaced: what diagram exports produce) ──

export function pngSize(data: Buffer): { width: number; height: number } {
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
}

/** Decoded pixels: color bytes (1 or 3 per pixel) and, when the PNG has it, an alpha byte per pixel. */
function decodePng(data: Buffer): { width: number; height: number; colors: 1 | 3; color: Buffer; alpha?: Buffer } {
  const { width, height } = pngSize(data)
  const depth = data[24]
  const type = data[25]
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[type]
  if (depth !== 8 || !channels || data[28] !== 0) throw new Error('PNG no soportado: usa 8 bits por canal, sin paleta ni entrelazado')
  const idat: Buffer[] = []
  for (let pos = 8; pos < data.length; ) {
    const len = data.readUInt32BE(pos)
    if (data.toString('latin1', pos + 4, pos + 8) === 'IDAT') idat.push(data.subarray(pos + 8, pos + 8 + len))
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const cur = raw[y * (stride + 1) + 1 + x]
      const a = x >= channels ? pixels[y * stride + x - channels] : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0
      const p = a + b - c
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      const pred = [0, a, b, (a + b) >> 1, paeth][filter] ?? 0
      pixels[y * stride + x] = (cur + pred) & 0xff
    }
  }
  const colors = channels >= 3 ? 3 : 1
  if (channels === colors) return { width, height, colors, color: pixels }
  const color = Buffer.alloc(width * height * colors)
  const alpha = Buffer.alloc(width * height)
  for (let i = 0; i < width * height; i++) {
    pixels.copy(color, i * colors, i * channels, i * channels + colors)
    alpha[i] = pixels[i * channels + colors]
  }
  return { width, height, colors, color, alpha }
}

export function inline(text: string): Inline[] {
  const out: Inline[] = []
  const parts = text.replace(/`([^`]*)`/g, '$1').split(/(\*\*[^*]+\*\*)/)
  for (const p of parts) {
    if (!p) continue
    const bold = p.startsWith('**') && p.endsWith('**')
    out.push({ text: bold ? p.slice(2, -2) : p, bold })
  }
  return out
}

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ kind: 'paragraph', text: inline(para.join(' ')) })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    const li = line.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/)
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
    if (!line.trim()) flush()
    else if (img) {
      flush()
      blocks.push({ kind: 'image', alt: img[1], path: img[2] })
    } else if (h) {
      flush()
      blocks.push({ kind: 'heading', level: h[1].length as 1 | 2 | 3, text: inline(h[2]) })
    } else if (/^-{3,}$/.test(line.trim())) {
      flush()
      blocks.push({ kind: 'pagebreak' })
    } else if (line.startsWith('|')) {
      flush()
      const rows: Inline[][][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (!cells.every(c => /^:?-{2,}:?$/.test(c))) rows.push(cells.map(inline))
        i++
      }
      i--
      blocks.push({ kind: 'table', rows })
    } else if (li) {
      flush()
      const ordered = li[1] !== undefined
      const items: Inline[][] = []
      while (i < lines.length) {
        const m = lines[i].match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/)
        if (!m || (m[1] !== undefined) !== ordered) break
        items.push(inline(m[2]))
        i++
      }
      i--
      blocks.push({ kind: 'list', ordered, items })
    } else if (line.startsWith('>')) {
      flush()
      blocks.push({ kind: 'quote', text: inline(line.replace(/^>\s?/, '')) })
    } else para.push(line.trim())
  }
  flush()
  return blocks
}

// ── DOCX ──────────────────────────────────────────────────────────────────────

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function runs(text: Inline[]): string {
  return text.map(t => `<w:r>${t.bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xml(t.text)}</w:t></w:r>`).join('')
}

function docxBlock(b: Block): string {
  switch (b.kind) {
    case 'heading':
      return `<w:p><w:pPr><w:pStyle w:val="${b.level === 1 ? 'Title' : `Heading${b.level - 1}`}"/></w:pPr>${runs(b.text)}</w:p>`
    case 'paragraph':
      return `<w:p>${runs(b.text)}</w:p>`
    case 'quote':
      return `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>${runs(b.text)}</w:p>`
    case 'list':
      return b.items
        .map((item, n) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="360" w:hanging="360"/></w:pPr><w:r><w:t xml:space="preserve">${b.ordered ? `${n + 1}.` : '•'}\t</w:t></w:r>${runs(item)}</w:p>`)
        .join('')
    case 'table': {
      const border = '<w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/>'
      const rows = b.rows
        .map((row, r) => `<w:tr>${row.map(cell => `<w:tc><w:p>${runs(r === 0 ? cell.map(c => ({ ...c, bold: true })) : cell)}</w:p></w:tc>`).join('')}</w:tr>`)
        .join('')
      return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>${rows}</w:tbl><w:p/>`
    }
    case 'pagebreak':
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    case 'image':
      return '' // docxImage, which needs the image's number
  }
}

// Text width of the page (12240 twips − 2 × 1134 margin) in EMU; images are sized at 96 dpi and shrunk to fit.
const DOCX_TEXT_EMU = Math.round(((12240 - 2 * 1134) / 1440) * 914400)

function docxImage(b: Extract<Block, { kind: 'image' }>, n: number): string {
  const { width, height } = pngSize(b.data!)
  const scale = Math.min(1, DOCX_TEXT_EMU / (width * 9525))
  const cx = Math.round(width * 9525 * scale)
  const cy = Math.round(height * 9525 * scale)
  const pic = `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="image${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`
  return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Imagen ${n}" descr="${xml(b.alt)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">${pic}</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
</w:styles>`

export function toDocx(blocks: Block[]): Buffer {
  const media: [string, Buffer][] = []
  const body = blocks
    .map(b => {
      if (b.kind !== 'image') return docxBlock(b)
      media.push([`word/media/image${media.length + 1}.png`, b.data!])
      return docxImage(b, media.length)
    })
    .join('')
  const imageRels = media.map((_, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.png"/>`).join('')
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${imageRels}</Relationships>`],
    ['word/document.xml', document],
    ['word/styles.xml', STYLES],
    ...media,
  ])
}

// ── ZIP (stored, no compression: what a .docx needs) ─────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(files: [string, string | Buffer][]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [name, content] of files) {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBuf, data)
    centrals.push(central, nameBuf)
    offset += local.length + nameBuf.length + data.length
  }
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBuf, end])
}

// ── PDF (Helvetica, WinAnsi: covers Spanish, French, Portuguese and German) ──

// Helvetica glyph widths (AFM), ASCII 32–126, in 1/1000 em.
const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]

const WIN_ANSI: Record<string, number> = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 }

function ansi(text: string): number[] {
  const out: number[] = []
  for (const ch of text.normalize('NFC')) {
    const code = ch.codePointAt(0)!
    if (WIN_ANSI[ch]) out.push(WIN_ANSI[ch])
    else if (ch === '→') out.push(...[0x2d, 0x3e])
    else if (code >= 32 && code <= 255 && !(code >= 127 && code < 160)) out.push(code)
    // Anything outside WinAnsi (emoji, CJK) is dropped: the client brief is plain text.
  }
  return out
}

function baseChar(code: number): number {
  const accents = 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÑñÇçÝýÿ'
  const bases = 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCcYyy'
  const i = accents.indexOf(String.fromCharCode(code))
  return i >= 0 ? bases.charCodeAt(i) : code
}

// Widths of the WinAnsi punctuation outside ASCII (dashes, quotes, bullet, ellipsis, ¿ ¡).
const EXTRA_WIDTHS: Record<number, number> = { 0x80: 556, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0x99: 1000, 0xa1: 333, 0xbf: 611, 0xb7: 278, 0xab: 556, 0xbb: 556 }

function widthOf(codes: number[], size: number, bold: boolean): number {
  let w = 0
  for (const c of codes) {
    const b = baseChar(c)
    w += b >= 32 && b <= 126 ? HELVETICA[b - 32] : (EXTRA_WIDTHS[c] ?? 556)
  }
  // Helvetica-Bold runs about 10% wider; erring wide keeps words from touching.
  return (w / 1000) * size * (bold ? 1.12 : 1)
}

type Word = { codes: number[]; bold: boolean }
type Line = Word[]

function words(text: Inline[]): Word[] {
  return text.flatMap(t => t.text.split(/\s+/).filter(Boolean).map(w => ({ codes: ansi(w), bold: t.bold })))
}

function wrap(text: Inline[], size: number, maxWidth: number): Line[] {
  const lines: Line[] = []
  let line: Line = []
  let width = 0
  const space = widthOf([32], size, false)
  for (const w of words(text)) {
    const ww = widthOf(w.codes, size, w.bold)
    if (line.length && width + space + ww > maxWidth) {
      lines.push(line)
      line = []
      width = 0
    }
    width += (line.length ? space : 0) + ww
    line.push(w)
  }
  if (line.length) lines.push(line)
  return lines.length ? lines : [[]]
}

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 56

function pdfString(codes: number[]): string {
  return '(' + codes.map(c => (c === 0x28 || c === 0x29 || c === 0x5c ? '\\' + String.fromCharCode(c) : c < 32 || c > 126 ? '\\' + c.toString(8).padStart(3, '0') : String.fromCharCode(c))).join('') + ')'
}

const pdfStream = (dict: string, data: Buffer) => {
  const z = deflateSync(data)
  return Buffer.concat([Buffer.from(`<< ${dict} /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), z, Buffer.from('\nendstream', 'latin1')])
}

class PdfWriter {
  pages: string[] = []
  ops: string[] = []
  images: ReturnType<typeof decodePng>[] = []
  y = PAGE_H - MARGIN

  /** An image at the text width or smaller (96 dpi), on the next page if it does not fit. */
  image(data: Buffer) {
    const img = decodePng(data)
    this.images.push(img)
    const scale = Math.min(0.75, (PAGE_W - 2 * MARGIN) / img.width, (PAGE_H - 2 * MARGIN) / img.height)
    const w = img.width * scale
    const h = img.height * scale
    this.ensure(h)
    this.y -= h
    this.ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${MARGIN} ${this.y.toFixed(2)} cm /Im${this.images.length} Do Q`)
    this.y -= 10
  }

  newPage() {
    if (this.ops.length) this.pages.push(this.ops.join('\n'))
    this.ops = []
    this.y = PAGE_H - MARGIN
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) this.newPage()
  }

  text(line: Line, x: number, size: number, gray = 0) {
    let cx = x
    const space = widthOf([32], size, false)
    for (const w of line) {
      this.ops.push(`BT /${w.bold ? 'F2' : 'F1'} ${size} Tf ${gray} g ${cx.toFixed(2)} ${this.y.toFixed(2)} Td ${pdfString(w.codes)} Tj ET`)
      cx += widthOf(w.codes, size, w.bold) + space
    }
  }

  paragraph(text: Inline[], size: number, opts: { indent?: number; bold?: boolean; gray?: number; before?: number; after?: number } = {}) {
    const lh = size * 1.35
    const x = MARGIN + (opts.indent ?? 0)
    const lines = wrap(opts.bold ? text.map(t => ({ ...t, bold: true })) : text, size, PAGE_W - MARGIN - x)
    this.y -= opts.before ?? 0
    this.ensure(lh * Math.min(lines.length, 2))
    for (const line of lines) {
      this.ensure(lh)
      this.y -= size
      this.text(line, x, size, opts.gray)
      this.y -= lh - size
    }
    this.y -= opts.after ?? size * 0.5
  }

  table(rows: Inline[][][]) {
    const size = 9.5
    const lh = size * 1.3
    const cols = Math.max(...rows.map(r => r.length))
    const colW = (PAGE_W - 2 * MARGIN) / cols
    rows.forEach((row, r) => {
      const cells = Array.from({ length: cols }, (_, c) => wrap(r === 0 ? (row[c] ?? []).map(t => ({ ...t, bold: true })) : row[c] ?? [], size, colW - 8))
      const height = Math.max(...cells.map(c => c.length)) * lh + 6
      this.ensure(height)
      const top = this.y
      cells.forEach((lines, c) => {
        this.y = top - 3
        for (const line of lines) {
          this.y -= size
          this.text(line, MARGIN + c * colW + 4, size)
          this.y -= lh - size
        }
      })
      this.y = top - height
      this.ops.push(`0.75 G 0.5 w ${MARGIN} ${top.toFixed(2)} ${PAGE_W - 2 * MARGIN} ${(-height).toFixed(2)} re S`)
      for (let c = 1; c < cols; c++) this.ops.push(`${(MARGIN + c * colW).toFixed(2)} ${top.toFixed(2)} m ${(MARGIN + c * colW).toFixed(2)} ${this.y.toFixed(2)} l S`)
    })
    this.y -= 10
  }

  finish(): Buffer {
    this.newPage()
    const objects: (string | Buffer)[] = []
    const add = (o: string | Buffer) => objects.push(o) // object number = index + 1
    add('<< /Type /Catalog /Pages 2 0 R >>')
    add('') // pages, filled below
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    const xobjects = this.images.map((img, i) => {
      const size = `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /BitsPerComponent 8`
      let mask = ''
      if (img.alpha) {
        add(pdfStream(`${size} /ColorSpace /DeviceGray`, img.alpha))
        mask = ` /SMask ${objects.length} 0 R`
      }
      add(pdfStream(`${size} /ColorSpace /${img.colors === 3 ? 'DeviceRGB' : 'DeviceGray'}${mask}`, img.color))
      return `/Im${i + 1} ${objects.length} 0 R`
    })
    const resources = `/Font << /F1 3 0 R /F2 4 0 R >>${xobjects.length ? ` /XObject << ${xobjects.join(' ')} >>` : ''}`
    const kids: number[] = []
    this.pages.forEach((content, i) => {
      const footer = `BT /F1 8 Tf 0.5 g ${PAGE_W - MARGIN - 20} 30 Td (${i + 1}/${this.pages.length}) Tj ET`
      const stream = deflateSync(Buffer.from(`${content}\n${footer}`, 'latin1'))
      add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), stream, Buffer.from('\nendstream', 'latin1')]))
      const contentId = objects.length
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << ${resources} >> /Contents ${contentId} 0 R >>`)
      kids.push(objects.length)
    })
    objects[1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`
    const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')]
    const offsets: number[] = []
    let pos = chunks[0].length
    objects.forEach((o, i) => {
      const body = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), typeof o === 'string' ? Buffer.from(o, 'latin1') : o, Buffer.from('\nendobj\n', 'latin1')])
      offsets.push(pos)
      chunks.push(body)
      pos += body.length
    })
    const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`)].join('')
    chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'))
    return Buffer.concat(chunks)
  }
}

export function toPdf(blocks: Block[]): Buffer {
  const pdf = new PdfWriter()
  for (const b of blocks) {
    switch (b.kind) {
      case 'heading':
        pdf.paragraph(b.text, b.level === 1 ? 20 : b.level === 2 ? 14 : 11.5, { bold: true, before: b.level === 1 ? 0 : 10, after: 6 })
        break
      case 'paragraph':
        pdf.paragraph(b.text, 10.5)
        break
      case 'quote':
        pdf.paragraph(b.text, 10, { indent: 14, gray: 0.35 })
        break
      case 'list':
        b.items.forEach((item, n) => pdf.paragraph([{ text: b.ordered ? `${n + 1}.` : '•', bold: false }, ...item], 10.5, { indent: 12, after: 2 }))
        pdf.y -= 4
        break
      case 'table':
        pdf.table(b.rows)
        break
      case 'image':
        pdf.image(b.data!)
        break
      case 'pagebreak':
        pdf.newPage()
        break
    }
  }
  return pdf.finish()
}
