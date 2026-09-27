const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  mergePDF:              (files, quality, suggestedName) => ipcRenderer.invoke('merge-pdf', files, quality, suggestedName),
  convertWordToPDF:      (filePath, outputDir)       => ipcRenderer.invoke('convert-word-to-pdf', filePath, outputDir),
  convertPdfToWord:      (filePath, outputDir)       => ipcRenderer.invoke('convert-pdf-to-word', filePath, outputDir),
  selectOutputFolder:    ()                          => ipcRenderer.invoke('select-output-folder'),
  openFile:              (filePath)                  => ipcRenderer.invoke('open-file', filePath),
  getPdfPageCount:       (filePath)                  => ipcRenderer.invoke('get-pdf-page-count', filePath),
  splitPDF:              (filePath, opts, outputDir) => ipcRenderer.invoke('split-pdf', filePath, opts, outputDir),
  renderPdfThumbnails:   (filePath)                  => ipcRenderer.invoke('render-pdf-thumbnails', filePath),
  onProgress:            (callback)                  => ipcRenderer.on('progress', (e, value) => callback(value)),
})