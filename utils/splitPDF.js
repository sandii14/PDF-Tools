const { PDFDocument } = require('pdf-lib')
const fs   = require('fs')
const path = require('path')

/**
 * Ambil jumlah halaman dari file PDF
 */
async function getPdfPageCount(filePath) {
  const bytes = fs.readFileSync(filePath)
  const pdf   = await PDFDocument.load(bytes)
  return pdf.getPageCount()
}

/**
 * Pisahkan PDF berdasarkan opsi:
 *   { mode: 'pages', pages: [1,3,5] }      → tiap halaman jadi 1 file
 *   { mode: 'range', from: 2, to: 6 }      → halaman 2-6 jadi 1 file
 *   { mode: 'all' }                         → semua halaman masing-masing jadi 1 file
 *
 * Nomor halaman menggunakan indeks 1-based dari user, dikonversi ke 0-based di sini.
 * outputDir: folder tujuan simpan. Nama file: <namaAsli>_p<n>.pdf
 * Mengembalikan: { success, files: [...path] } atau { success: false, error }
 */
async function splitPDF(filePath, opts, outputDir = null) {
  const bytes   = fs.readFileSync(filePath)
  const srcPdf  = await PDFDocument.load(bytes)
  const total   = srcPdf.getPageCount()
  const destDir = outputDir || path.dirname(filePath)
  const baseName = path.basename(filePath, path.extname(filePath))

  const outputFiles = []

  if (opts.mode === 'range') {
    // Satu file berisi halaman from..to
    const from = Math.max(1, opts.from)
    const to   = Math.min(total, opts.to)
    if (from > to) throw new Error(`Rentang tidak valid: ${from}-${to}`)

    const newPdf  = await PDFDocument.create()
    const indices = []
    for (let i = from - 1; i <= to - 1; i++) indices.push(i)
    const pages   = await newPdf.copyPages(srcPdf, indices)
    pages.forEach(p => newPdf.addPage(p))

    const outPath = path.join(destDir, `${baseName}_p${from}-${to}.pdf`)
    fs.writeFileSync(outPath, await newPdf.save())
    outputFiles.push(outPath)

  } else if (opts.mode === 'pages') {
    // Semua halaman yang dipilih → digabung jadi SATU file PDF
    const validIndices = opts.pages
      .map(n => n - 1)
      .filter(i => i >= 0 && i < total)

    if (validIndices.length === 0) throw new Error('Tidak ada halaman valid yang dipilih')

    const newPdf  = await PDFDocument.create()
    const pages   = await newPdf.copyPages(srcPdf, validIndices)
    pages.forEach(p => newPdf.addPage(p))

    // Nama file: namafile_p1-3-5.pdf (maksimum 5 nomor, sisanya "dst")
    const labelNums = opts.pages.slice(0, 5).join('-')
    const suffix    = opts.pages.length > 5 ? `-dst` : ''
    const outPath   = path.join(destDir, `${baseName}_p${labelNums}${suffix}.pdf`)
    fs.writeFileSync(outPath, await newPdf.save())
    outputFiles.push(outPath)

  } else if (opts.mode === 'all') {
    // Tiap halaman jadi file tersendiri
    for (let i = 0; i < total; i++) {
      const newPdf = await PDFDocument.create()
      const [page] = await newPdf.copyPages(srcPdf, [i])
      newPdf.addPage(page)

      const outPath = path.join(destDir, `${baseName}_p${i + 1}.pdf`)
      fs.writeFileSync(outPath, await newPdf.save())
      outputFiles.push(outPath)
    }
  }

  return outputFiles
}

module.exports = { splitPDF, getPdfPageCount }