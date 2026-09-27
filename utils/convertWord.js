const { execFile } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

/**
 * Konversi satu file Word (.doc/.docx) ke PDF menggunakan LibreOffice.
 * Mendeteksi LibreOffice yang di-bundle ke dalam installer terlebih dahulu,
 * baru fallback ke instalasi sistem.
 */
function convertWordToPDF(inputPath, outputDir = null) {
  return new Promise((resolve, reject) => {
    // Default: simpan di folder yang sama dengan file sumber
    const destDir = outputDir || path.dirname(inputPath)

    const sofficePath = getSofficePath()

    const args = [
      '--headless',
      '--norestore',
      '--convert-to', 'pdf',
      '--outdir', destDir,
      inputPath
    ]

    execFile(sofficePath, args, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr || stdout || err.message
        return reject(new Error('LibreOffice gagal: ' + detail))
      }

      const baseName    = path.basename(inputPath, path.extname(inputPath)) + '.pdf'
      const outputPath  = path.join(destDir, baseName)

      if (!fs.existsSync(outputPath)) {
        return reject(new Error('File PDF tidak ditemukan setelah konversi. Output LibreOffice: ' + (stdout || stderr || '(kosong)')))
      }

      const size = fs.statSync(outputPath).size
      resolve({ outputPath, size })
    })
  })
}

/**
 * Cari soffice.exe dengan urutan prioritas:
 *   1. Versi bundled hasil build  -> {resources}/libreoffice/program/soffice.exe
 *   2. Versi bundled saat development -> {project}/resources/libreoffice/program/soffice.exe
 *   3. Instalasi LibreOffice standar di sistem (Program Files)
 *   4. Fallback ke PATH ("soffice")
 */
function getSofficePath() {
  // 1️⃣ Bundled hasil build (app sudah dipackage via electron-builder)
  //    process.resourcesPath -> ...\PDF Merge Modern\resources
  const bundledPath = path.join(process.resourcesPath, 'libreoffice', 'program', 'soffice.exe')
  if (fs.existsSync(bundledPath)) {
    return bundledPath
  }

  // 2️⃣ Bundled saat development (npm start, belum di-build)
  //    __dirname di sini = .../utils, naik 1 level ke root proyek
  const devBundledPath = path.join(__dirname, '..', 'resources', 'libreoffice', 'program', 'soffice.exe')
  if (fs.existsSync(devBundledPath)) {
    return devBundledPath
  }

  // 3️⃣ Instalasi sistem standar
  const systemPaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ]
  for (const p of systemPaths) {
    if (fs.existsSync(p)) return p
  }

  // 4️⃣ Fallback: andalkan PATH sistem
  return 'soffice'
}

module.exports = { convertWordToPDF }