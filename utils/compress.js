const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ── DETECT GHOSTSCRIPT ──
function getGhostscriptPath() {
  const localPath = path.join(process.resourcesPath, 'ghostscript', 'bin', 'gswin64c.exe')
  if (fs.existsSync(localPath)) return `"${localPath}"`

  const devPath = path.join(__dirname, '../ghostscript/bin/gswin64c.exe')
  if (fs.existsSync(devPath)) return `"${devPath}"`

  return 'gswin64c'
}


function runGS(gs, inputPath, outputPath, pdfSettings, dpi) {
  return new Promise((resolve, reject) => {
    const cmd = [
      gs,
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${pdfSettings}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-dColorImageResolution=${dpi}`,
      `-dGrayImageResolution=${dpi}`,
      `-dMonoImageResolution=${dpi}`,
      `-sOutputFile="${outputPath}"`,
      `"${inputPath}"`
    ].join(' ')

    exec(cmd, (err) => {
      if (err) return reject(new Error('Ghostscript gagal: ' + err.message))
      resolve(outputPath)
    })
  })
}

const QUALITY_MAP = {
  2: { settings: '/screen',   dpi: 96  },
  3: { settings: '/ebook',    dpi: 150 },
  4: { settings: '/printer',  dpi: 200 },
  5: { settings: '/prepress', dpi: 300 },
}

// Urutan agresif untuk mode paksa < 1 MB
const FORCE_STEPS = [
  { settings: '/ebook',  dpi: 120 },
  { settings: '/screen', dpi: 96  },
  { settings: '/screen', dpi: 72  },
  { settings: '/screen', dpi: 60  },
  { settings: '/screen', dpi: 48  },
]

async function compressPDF(inputPath, quality = 3, customOutput = null) {
  const gs = getGhostscriptPath()
  const outputPath = customOutput || path.join(os.tmpdir(), `compressed_${Date.now()}.pdf`)
  const ONE_MB = 1024 * 1024

  // Pastikan quality adalah integer (bisa datang sebagai string dari IPC)
  const q = parseInt(quality, 10)

  console.log(`[compress] quality=${q}, input=${inputPath}`)

  // ── Mode 1: Paksa di bawah 1 MB ──
  if (q === 1) {
    for (let i = 0; i < FORCE_STEPS.length; i++) {
      const { settings, dpi } = FORCE_STEPS[i]
      const tmp = path.join(os.tmpdir(), `force_${Date.now()}_${i}.pdf`)

      console.log(`[compress] step ${i+1}: ${settings} DPI=${dpi}`)
      await runGS(gs, inputPath, tmp, settings, dpi)

      const size = fs.statSync(tmp).size
      console.log(`[compress] step ${i+1} size: ${(size/1024/1024).toFixed(2)} MB`)

      const isLast = i === FORCE_STEPS.length - 1

      if (size < ONE_MB || isLast) {
        fs.copyFileSync(tmp, outputPath)
        fs.unlinkSync(tmp)
        console.log(`[compress] selesai di step ${i+1}: ${(size/1024/1024).toFixed(2)} MB`)
        return outputPath
      }

      fs.unlinkSync(tmp)
    }
    return outputPath
  }

  // ── Mode 2–5: Compress sesuai level ──
  const { settings, dpi } = QUALITY_MAP[q] || QUALITY_MAP[3]
  console.log(`[compress] mode ${q}: ${settings} DPI=${dpi}`)
  await runGS(gs, inputPath, outputPath, settings, dpi)
  return outputPath
}

module.exports = { compressPDF }