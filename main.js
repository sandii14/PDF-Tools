const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')

const { mergePDFs }          = require('./utils/merge')
const { compressPDF }        = require('./utils/compress')
const { convertWordToPDF }   = require('./utils/convertWord')
const { splitPDF, getPdfPageCount } = require('./utils/splitPDF')
const { renderThumbnails }   = require('./utils/pdfThumbnails')
const { convertPdfToWord }   = require('./utils/convertPdfToWord')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('public/index.html')
}

app.whenReady().then(createWindow)

// ── MERGE PDF ──
ipcMain.handle('merge-pdf', async (event, files, quality = 3, suggestedName = null) => {
  const q = parseInt(quality, 10) || 3
  try {
    // Pakai nama yang disarankan (dari NIP) jika ada, fallback ke timestamp
    const defaultName = suggestedName || `merged_${Date.now()}.pdf`

    const { filePath } = await dialog.showSaveDialog({
      title: 'Simpan PDF',
      defaultPath: defaultName,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    if (!filePath) return { success: false, error: 'Dibatalkan user' }

    event.sender.send('progress', 10)
    const { outputPath: mergedPath } = await mergePDFs(files)

    event.sender.send('progress', 60)
    const finalPath = await compressPDF(mergedPath, q, filePath)

    event.sender.send('progress', 100)
    const totalSize = fs.statSync(finalPath).size

    return { success: true, file: finalPath, totalSize }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ── PILIH FOLDER OUTPUT ──
ipcMain.handle('select-output-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Pilih Folder Penyimpanan',
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  return { canceled: false, folder: filePaths[0] }
})

// ── CONVERT WORD TO PDF ──
ipcMain.handle('convert-word-to-pdf', async (event, filePath, outputDir) => {
  try {
    const { outputPath, size } = await convertWordToPDF(filePath, outputDir || null)
    return { success: true, file: outputPath, size }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ── CONVERT PDF TO WORD ──
ipcMain.handle('convert-pdf-to-word', async (event, filePath, outputDir) => {
  try {
    const { outputPath, size } = await convertPdfToWord(filePath, outputDir || null)
    return { success: true, file: outputPath, size }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ── BUKA FILE DI EXPLORER ──
ipcMain.handle('open-file', async (event, filePath) => {
  const { shell } = require('electron')
  shell.showItemInFolder(filePath)
})

// ── HITUNG HALAMAN PDF ──
ipcMain.handle('get-pdf-page-count', async (event, filePath) => {
  try {
    const count = await getPdfPageCount(filePath)
    return count
  } catch (err) {
    return 0
  }
})

// ── RENDER PDF THUMBNAILS ──
ipcMain.handle('render-pdf-thumbnails', async (event, filePath) => {
  try {
    const thumbnails = await renderThumbnails(filePath, 96)
    return { success: true, thumbnails }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ── SPLIT PDF ──
ipcMain.handle('split-pdf', async (event, filePath, opts, outputDir) => {
  try {
    const files = await splitPDF(filePath, opts, outputDir || null)
    return { success: true, files }
  } catch (err) {
    return { success: false, error: err.message }
  }
})