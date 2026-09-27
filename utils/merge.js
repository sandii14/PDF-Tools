const { PDFDocument } = require('pdf-lib')
const fs = require('fs')
const path = require('path')
const os = require('os')

async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create()

  for (const file of files) {
    const pdfBytes = fs.readFileSync(file)
    const pdf = await PDFDocument.load(pdfBytes)

    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    pages.forEach(p => mergedPdf.addPage(p))
  }

  const mergedBytes = await mergedPdf.save()

  // Simpan ke TEMP
  const outputPath = path.join(os.tmpdir(), `merged_${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, mergedBytes)

  // Ukuran file hasil merge (bytes)
  const outputSize = fs.statSync(outputPath).size

  return { outputPath, outputSize }
}

module.exports = { mergePDFs }