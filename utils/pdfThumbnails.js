const { execFile } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

function getGsPath() {
  const bundled = path.join(process.resourcesPath, 'ghostscript', 'bin', 'gswin64c.exe')
  if (fs.existsSync(bundled)) return bundled
  const dev = path.join(__dirname, '../ghostscript/bin/gswin64c.exe')
  if (fs.existsSync(dev)) return dev
  return 'gswin64c'
}

/**
 * Render semua halaman PDF menjadi array base64 PNG thumbnail
 * @param {string} filePath  - path ke file PDF
 * @param {number} dpi       - resolusi render (default 72 untuk thumbnail cepat)
 * @returns {Promise<string[]>} - array base64 PNG per halaman
 */
async function renderThumbnails(filePath, dpi = 72) {
  const gs      = getGsPath()
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfthumbs_'))
  const outTemplate = path.join(tmpDir, 'page_%04d.png')

  // Render semua halaman sekaligus
  await new Promise((resolve, reject) => {
    const args = [
      '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET',
      '-sDEVICE=png16m',
      `-r${dpi}`,
      '-dTextAlphaBits=4',
      '-dGraphicsAlphaBits=4',
      `-sOutputFile=${outTemplate}`,
      filePath,
    ]
    execFile(gs, args, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error('GS thumbnail gagal: ' + (stderr || err.message)))
      resolve()
    })
  })

  // Baca semua file PNG yang dihasilkan, urutkan, encode base64
  const files = fs.readdirSync(tmpDir)
    .filter(f => f.endsWith('.png'))
    .sort()

  const thumbnails = files.map(f => {
    const data = fs.readFileSync(path.join(tmpDir, f))
    return 'data:image/png;base64,' + data.toString('base64')
  })

  // Cleanup tmp
  files.forEach(f => { try { fs.unlinkSync(path.join(tmpDir, f)) } catch {} })
  try { fs.rmdirSync(tmpDir) } catch {}

  return thumbnails
}

module.exports = { renderThumbnails }