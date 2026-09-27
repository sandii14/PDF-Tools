const { execFile } = require('child_process')
const fs   = require('fs')
const path = require('path')

/**
 * Konversi satu file PDF ke DOCX menggunakan LibreOffice headless.
 * Menggunakan nama filter resmi LibreOffice agar kompatibel dengan
 * semua versi LibreOffice termasuk yang di-bundle.
 */
function convertPdfToWord(inputPath, outputDir = null) {
  return new Promise((resolve, reject) => {
    const destDir     = outputDir || path.dirname(inputPath)
    const sofficePath = getSofficePath()

    // Nama filter resmi LibreOffice untuk export ke Word 2007+ (.docx)
    // Format: "docx:MS Word 2007 XML"
    const args = [
      '--headless',
      '--norestore',
      '--infilter=writer_pdf_import',
      '--convert-to', 'docx:MS Word 2007 XML',
      '--outdir', destDir,
      inputPath,
    ]

    execFile(sofficePath, args, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        // Coba fallback dengan filter yang lebih sederhana
        const argsFallback = [
          '--headless',
          '--norestore',
          '--convert-to', 'docx',
          '--outdir', destDir,
          inputPath,
        ]

        execFile(sofficePath, argsFallback, { timeout: 120000 }, (err2, stdout2, stderr2) => {
          if (err2) {
            const detail = stderr2 || stdout2 || err2.message
            return reject(new Error('LibreOffice gagal: ' + detail))
          }

          const baseName   = path.basename(inputPath, path.extname(inputPath)) + '.docx'
          const outputPath = path.join(destDir, baseName)

          if (!fs.existsSync(outputPath)) {
            return reject(new Error('File Word tidak ditemukan setelah konversi. ' + (stdout2 || stderr2 || '')))
          }

          const size = fs.statSync(outputPath).size
          resolve({ outputPath, size })
        })
        return
      }

      const baseName   = path.basename(inputPath, path.extname(inputPath)) + '.docx'
      const outputPath = path.join(destDir, baseName)

      if (!fs.existsSync(outputPath)) {
        // Coba nama alternatif yang mungkin dihasilkan LibreOffice
        const altName = path.basename(inputPath, path.extname(inputPath)) + '.docx'
        const altPath = path.join(destDir, altName)
        if (!fs.existsSync(altPath)) {
          return reject(new Error('File Word tidak ditemukan setelah konversi. Output: ' + (stdout || stderr || '(kosong)')))
        }
      }

      const size = fs.statSync(outputPath).size
      resolve({ outputPath, size })
    })
  })
}

/**
 * Deteksi path soffice.exe:
 *   1. Bundled hasil build  → {resources}/libreoffice/program/soffice.exe
 *   2. Bundled saat dev     → {project}/resources/libreoffice/program/soffice.exe
 *   3. Instalasi sistem     → Program Files
 *   4. Fallback PATH        → soffice
 */
function getSofficePath() {
  const bundledPath = path.join(process.resourcesPath, 'libreoffice', 'program', 'soffice.exe')
  if (fs.existsSync(bundledPath)) return bundledPath

  const devPath = path.join(__dirname, '..', 'resources', 'libreoffice', 'program', 'soffice.exe')
  if (fs.existsSync(devPath)) return devPath

  const sysPaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ]
  for (const p of sysPaths) {
    if (fs.existsSync(p)) return p
  }

  return 'soffice'
}

module.exports = { convertPdfToWord }