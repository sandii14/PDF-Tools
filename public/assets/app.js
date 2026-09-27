// ══════════════════════════════════════
//  NAVBAR — tab switching
// ══════════════════════════════════════
const navTabs    = document.querySelectorAll('.nav-tab')
const pageMerge  = document.querySelector('.page-merge')
const pageWord   = document.querySelector('.page-word2pdf')
const pageSplit  = document.querySelector('.page-split')
const pageP2W    = document.querySelector('.page-pdf2word')

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    navTabs.forEach(t => t.classList.remove('active'))
    tab.classList.add('active')

    const page = tab.dataset.page
    pageMerge.hidden = page !== 'merge'
    pageWord.hidden  = page !== 'word2pdf'
    pageSplit.hidden = page !== 'split'
    pageP2W.hidden   = page !== 'pdf2word'
  })
})

// ══════════════════════════════════════
//  SHARED UTILS
// ══════════════════════════════════════
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// ══════════════════════════════════════
//  PAGE 1 — PDF MERGER
// ══════════════════════════════════════
const dropzone       = document.getElementById('dropzone')
const fileInput      = document.getElementById('fileInput')
const selectButton   = document.getElementById('selectButton')
const fileList       = document.getElementById('fileList')
const fileCounter    = document.getElementById('fileCounter')
const mergeButton    = document.getElementById('mergeButton')
const clearButton    = document.getElementById('clearButton')
const qualitySlider  = document.getElementById('qualitySlider')
const defaultQuality = document.getElementById('defaultQuality')
const progressBox    = document.getElementById('progressBox')
const progressBar    = document.getElementById('progressBar')
const progressPercent= document.getElementById('progressPercent')
const progressText   = document.getElementById('progressText')
const resultBox      = document.getElementById('resultBox')

let files = []

defaultQuality.onclick = () => { qualitySlider.value = 3 }
function getQualityLevel() { return parseInt(qualitySlider.value, 10) }

selectButton.onclick = () => fileInput.click()
fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); fileInput.value = '' })

dropzone.addEventListener('dragover',  (e) => { e.preventDefault(); dropzone.classList.add('dragover') })
dropzone.addEventListener('dragleave', ()  => { dropzone.classList.remove('dragover') })
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files)
})

function handleFiles(fileListInput) {
  const pdfFiles = Array.from(fileListInput).filter(f => f.type === 'application/pdf')
  if (pdfFiles.length === 0) { alert('Hanya file PDF yang diizinkan!'); return }
  pdfFiles.forEach(f => {
    if (!files.some(x => x.name === f.name && x.size === f.size))
      files.push({ path: f.path || null, name: f.name, size: f.size })
  })
  renderFileList(); updateToolbar()
}

function updateToolbar() {
  const total = files.reduce((s, f) => s + f.size, 0)
  const nip   = extractNipFromFiles(files)

  if (files.length > 0) {
    fileCounter.innerHTML = `${files.length} file dipilih • ${formatSize(total)}`
      + (nip ? ` &nbsp;|&nbsp; <span style="color:var(--green);font-weight:700">NIP terdeteksi: ${nip}</span>` : '')
  } else {
    fileCounter.textContent = '0 file dipilih'
  }
  mergeButton.disabled = files.length === 0
  clearButton.disabled = files.length === 0
}

function renderFileList() {
  fileList.innerHTML = ''
  files.forEach((file, index) => {
    const li = document.createElement('li')
    li.className = 'file-item'

    const fileLeft = document.createElement('div')
    fileLeft.className = 'file-left'

    const badge = document.createElement('div')
    badge.className = 'pdf-badge'
    badge.textContent = 'PDF'

    const info = document.createElement('div')
    info.className = 'file-info'

    const name = document.createElement('strong')
    name.textContent = file.name

    const size = document.createElement('span')
    size.className = 'file-size'
    if (file.compressedSize !== undefined) {
      const pct = (((file.size - file.compressedSize) / file.size) * 100).toFixed(1)
      size.innerHTML = `<span style="color:var(--muted)">${formatSize(file.size)}</span> → <span class="size-after">${formatSize(file.compressedSize)}</span> <span class="size-saved">(hemat ${pct}%)</span>`
    } else {
      size.textContent = formatSize(file.size)
    }

    const status = document.createElement('div')
    status.className = 'file-status'
    status.textContent = 'Siap digabungkan'

    info.appendChild(name); info.appendChild(size); info.appendChild(status)
    fileLeft.appendChild(badge); fileLeft.appendChild(info)

    const actions = document.createElement('div')
    actions.className = 'file-actions'

    const btnUp = document.createElement('button')
    btnUp.className = 'icon-button'; btnUp.innerHTML = '↑'; btnUp.title = 'Naik'
    btnUp.disabled = index === 0; btnUp.onclick = () => moveFile(index, index - 1)

    const btnDown = document.createElement('button')
    btnDown.className = 'icon-button'; btnDown.innerHTML = '↓'; btnDown.title = 'Turun'
    btnDown.disabled = index === files.length - 1; btnDown.onclick = () => moveFile(index, index + 1)

    const btnDel = document.createElement('button')
    btnDel.className = 'icon-button delete'; btnDel.innerHTML = '×'; btnDel.title = 'Hapus'
    btnDel.onclick = () => removeFile(index)

    actions.appendChild(btnUp); actions.appendChild(btnDown); actions.appendChild(btnDel)

    li.draggable = true
    li.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', index); li.style.opacity = '0.5' })
    li.addEventListener('dragend',   ()  => { li.style.opacity = '' })
    li.addEventListener('dragover',  (e) => { e.preventDefault(); li.style.background = '#f8fafc' })
    li.addEventListener('dragleave', ()  => { li.style.background = '' })
    li.addEventListener('drop', (e) => {
      e.preventDefault(); li.style.background = ''
      const from = Number(e.dataTransfer.getData('text/plain'))
      if (from !== index) moveFile(from, index)
    })

    li.appendChild(fileLeft); li.appendChild(actions)
    fileList.appendChild(li)
  })
}

function moveFile(from, to) {
  if (to < 0 || to >= files.length) return
  files.splice(to, 0, files.splice(from, 1)[0])
  renderFileList(); updateToolbar()
}

function removeFile(index) {
  files.splice(index, 1); renderFileList(); updateToolbar()
  if (files.length === 0) { progressBox.hidden = true; resultBox.hidden = true; resultBox.innerHTML = '' }
}

clearButton.onclick = () => {
  files = []; renderFileList(); updateToolbar()
  progressBox.hidden = true; resultBox.hidden = true; resultBox.innerHTML = ''
}

// ══════════════════════════════════════
//  EKSTRAK NIP DARI NAMA FILE
//  Ambil bagian sebelum underscore pertama.
//  Hanya dipakai jika SEMUA file punya prefix yang SAMA PERSIS.
// ══════════════════════════════════════
function extractNipFromFiles(fileList) {
  if (fileList.length === 0) return null

  // Ambil prefix (sebelum '_' pertama) dari tiap file
  const prefixes = fileList.map(f => {
    const base = f.name.replace(/\.pdf$/i, '')
    const idx  = base.indexOf('_')
    return idx > 0 ? base.substring(0, idx) : null
  })

  // Kalau ada file yang tidak punya underscore → tidak ada NIP bersama
  if (prefixes.some(p => p === null)) return null

  // Cek semua prefix sama persis
  const first = prefixes[0]
  const allSame = prefixes.every(p => p === first)

  return allSame ? first : null
}

mergeButton.onclick = async () => {
  if (files.length === 0) return
  progressBox.hidden = false; resultBox.hidden = true; resultBox.innerHTML = ''

  // Cari NIP yang sama dari semua file
  const nip = extractNipFromFiles(files)
  const suggestedName = nip
    ? `${nip}_merged.pdf`
    : `merged_${Date.now()}.pdf`

  const result = await window.electronAPI.mergePDF(files.map(f => f.path), getQualityLevel(), suggestedName)

  if (result.success) {
    if (result.fileSizes) {
      result.fileSizes.forEach((s, i) => { if (files[i]) files[i].compressedSize = s })
      renderFileList()
    }
    const totalBefore = files.reduce((s, f) => s + f.size, 0)
    const totalAfter  = result.totalSize ?? null
    const fileName    = result.file ? result.file.replace(/\\/g, '/').split('/').pop() : 'merged.pdf'

    resultBox.hidden = false
    resultBox.innerHTML = `
      <div class="result-info">
        <span class="result-filename">${fileName}</span>
        <span class="result-meta">
          Sebelum: <strong>${formatSize(totalBefore)}</strong> &nbsp;•&nbsp;
          Sesudah: <strong>${totalAfter !== null ? formatSize(totalAfter) : '—'}</strong>
        </span>
      </div>
      <button class="download-button" onclick="window.electronAPI.openFile && window.electronAPI.openFile('${result.file.replace(/\\/g, '\\\\')}')">
        Download PDF
      </button>`
  } else {
    resultBox.hidden = false
    resultBox.innerHTML = `<div class="result-info"><span class="result-filename" style="color:var(--red)">❌ Gagal</span><span class="result-meta">${result.error}</span></div>`
  }
}

if (window.electronAPI?.onProgress) {
  window.electronAPI.onProgress((pct) => {
    progressBox.hidden = false
    progressBar.style.width = pct + '%'
    progressPercent.textContent = pct + '%'
    progressText.textContent = pct >= 100 ? 'Selesai!' : pct > 50 ? 'Compressing...' : 'Merging...'
    if (pct >= 100) setTimeout(() => { progressBox.hidden = true }, 1500)
  })
}

// ══════════════════════════════════════
//  PAGE 2 — WORD TO PDF
// ══════════════════════════════════════
const w2pDropzone     = document.getElementById('w2pDropzone')
const w2pFileInput    = document.getElementById('w2pFileInput')
const w2pSelectBtn    = document.getElementById('w2pSelectButton')
const w2pFileList     = document.getElementById('w2pFileList')
const w2pFileCounter  = document.getElementById('w2pFileCounter')
const w2pConvertBtn   = document.getElementById('w2pConvertButton')
const w2pClearBtn     = document.getElementById('w2pClearButton')
const w2pProgressBox  = document.getElementById('w2pProgressBox')
const w2pProgressBar  = document.getElementById('w2pProgressBar')
const w2pProgressPct  = document.getElementById('w2pProgressPercent')
const w2pProgressText = document.getElementById('w2pProgressText')
const w2pResultBox    = document.getElementById('w2pResultBox')
const w2pChooseFolderBtn  = document.getElementById('w2pChooseFolderButton')
const w2pOutputFolderPath = document.getElementById('w2pOutputFolderPath')

let w2pFiles = []
let w2pOutputFolder = null // null = simpan di folder sumber file masing-masing

w2pChooseFolderBtn.onclick = async () => {
  const result = await window.electronAPI.selectOutputFolder()
  if (!result.canceled) {
    w2pOutputFolder = result.folder
    w2pOutputFolderPath.textContent = result.folder
    w2pOutputFolderPath.title = result.folder
  }
}

const WORD_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

w2pSelectBtn.onclick = () => w2pFileInput.click()
w2pFileInput.addEventListener('change', (e) => { handleW2PFiles(e.target.files); w2pFileInput.value = '' })

w2pDropzone.addEventListener('dragover',  (e) => { e.preventDefault(); w2pDropzone.classList.add('dragover') })
w2pDropzone.addEventListener('dragleave', ()  => { w2pDropzone.classList.remove('dragover') })
w2pDropzone.addEventListener('drop', (e) => {
  e.preventDefault(); w2pDropzone.classList.remove('dragover'); handleW2PFiles(e.dataTransfer.files)
})

function handleW2PFiles(fileListInput) {
  const wordFiles = Array.from(fileListInput).filter(f =>
    WORD_TYPES.includes(f.type) || f.name.match(/\.docx$/i)
  )
  if (wordFiles.length === 0) { alert('Hanya file .docx yang didukung!'); return }
  wordFiles.forEach(f => {
    if (!w2pFiles.some(x => x.name === f.name && x.size === f.size))
      w2pFiles.push({ path: f.path || null, name: f.name, size: f.size, status: 'pending' })
  })
  renderW2PList(); updateW2PToolbar()
}

function updateW2PToolbar() {
  w2pFileCounter.textContent = w2pFiles.length > 0
    ? `${w2pFiles.length} file dipilih`
    : '0 file dipilih'
  w2pConvertBtn.disabled = w2pFiles.length === 0
  w2pClearBtn.disabled   = w2pFiles.length === 0
}

function renderW2PList() {
  w2pFileList.innerHTML = ''
  w2pFiles.forEach((file, index) => {
    const li = document.createElement('li')
    li.className = 'file-item'

    const fileLeft = document.createElement('div')
    fileLeft.className = 'file-left'

    const badge = document.createElement('div')
    badge.className = 'word-badge'
    badge.textContent = 'DOCX'

    const info = document.createElement('div')
    info.className = 'file-info'

    const name = document.createElement('strong')
    name.textContent = file.name

    const size = document.createElement('span')
    size.className = 'file-size'
    size.textContent = formatSize(file.size)

    const status = document.createElement('div')
    status.className = 'file-status'
    if (file.status === 'done')    { status.textContent = '✓ Selesai dikonversi'; status.style.color = 'var(--green)' }
    else if (file.status === 'error') { status.textContent = '✗ Gagal'; status.style.color = 'var(--red)' }
    else if (file.status === 'converting') { status.textContent = 'Mengkonversi...'; status.style.color = 'var(--gold)' }
    else { status.textContent = 'Siap dikonversi' }

    info.appendChild(name); info.appendChild(size); info.appendChild(status)
    fileLeft.appendChild(badge); fileLeft.appendChild(info)

    const actions = document.createElement('div')
    actions.className = 'file-actions'

    const btnDel = document.createElement('button')
    btnDel.className = 'icon-button delete'; btnDel.innerHTML = '×'; btnDel.title = 'Hapus'
    btnDel.onclick = () => { w2pFiles.splice(index, 1); renderW2PList(); updateW2PToolbar() }

    actions.appendChild(btnDel)
    li.appendChild(fileLeft); li.appendChild(actions)
    w2pFileList.appendChild(li)
  })
}

w2pClearBtn.onclick = () => {
  w2pFiles = []; renderW2PList(); updateW2PToolbar()
  w2pProgressBox.hidden = true; w2pResultBox.hidden = true; w2pResultBox.innerHTML = ''
}

w2pConvertBtn.onclick = async () => {
  if (w2pFiles.length === 0) return

  w2pProgressBox.hidden  = false
  w2pResultBox.hidden    = true
  w2pResultBox.innerHTML = ''
  w2pConvertBtn.disabled = true

  const results = []

  for (let i = 0; i < w2pFiles.length; i++) {
    // Update status jadi "converting"
    w2pFiles[i].status = 'converting'
    renderW2PList()

    // Update progress bar
    const pct = Math.round(((i) / w2pFiles.length) * 100)
    w2pProgressBar.style.width = pct + '%'
    w2pProgressPct.textContent = pct + '%'
    w2pProgressText.textContent = `Mengkonversi ${i + 1} / ${w2pFiles.length}...`

    try {
      const result = await window.electronAPI.convertWordToPDF(w2pFiles[i].path, w2pOutputFolder)
      if (result.success) {
        w2pFiles[i].status   = 'done'
        w2pFiles[i].outPath  = result.file
        w2pFiles[i].outSize  = result.size
      } else {
        w2pFiles[i].status = 'error'
        w2pFiles[i].error  = result.error
      }
    } catch (e) {
      w2pFiles[i].status = 'error'
      w2pFiles[i].error  = e.message
    }

    renderW2PList()
    results.push(w2pFiles[i])
  }

  // Selesai
  w2pProgressBar.style.width  = '100%'
  w2pProgressPct.textContent  = '100%'
  w2pProgressText.textContent = 'Selesai!'
  setTimeout(() => { w2pProgressBox.hidden = true }, 1500)

  // Tampilkan hasil
  w2pResultBox.hidden    = false
  w2pResultBox.innerHTML = ''

  const doneCount  = results.filter(r => r.status === 'done').length
  const errorCount = results.filter(r => r.status === 'error').length

  const summary = document.createElement('div')
  summary.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;font-weight:600'
  summary.textContent = `${doneCount} berhasil${errorCount > 0 ? ` • ${errorCount} gagal` : ''}`
  w2pResultBox.appendChild(summary)

  results.forEach(file => {
    const item = document.createElement('div')
    item.className = `w2p-result-item ${file.status === 'done' ? 'success' : 'error'}`

    const info = document.createElement('div')
    info.className = 'w2p-result-info'

    const nameEl = document.createElement('span')
    nameEl.className = 'w2p-result-name'
    nameEl.textContent = file.name.replace(/\.(docx?)$/i, '.pdf')

    const metaEl = document.createElement('span')
    metaEl.className = `w2p-result-meta ${file.status === 'done' ? 'ok' : 'err'}`
    metaEl.textContent = file.status === 'done'
      ? `✓ Berhasil • ${formatSize(file.outSize || 0)}`
      : `✗ ${file.error || 'Gagal dikonversi'}`

    info.appendChild(nameEl); info.appendChild(metaEl)
    item.appendChild(info)

    if (file.status === 'done' && file.outPath) {
      const dlBtn = document.createElement('button')
      dlBtn.className = 'w2p-download-btn'
      dlBtn.textContent = 'Buka'
      dlBtn.onclick = () => window.electronAPI.openFile && window.electronAPI.openFile(file.outPath)
      item.appendChild(dlBtn)
    }

    w2pResultBox.appendChild(item)
  })

  w2pConvertBtn.disabled = false
}

// ══════════════════════════════════════
//  PAGE 3 — SPLIT PDF
// ══════════════════════════════════════
const spDropzone         = document.getElementById('spDropzone')
const spFileInput        = document.getElementById('spFileInput')
const spSelectBtn        = document.getElementById('spSelectButton')
const spFileInfo         = document.getElementById('spFileInfo')
const spFileName         = document.getElementById('spFileName')
const spFileMeta         = document.getElementById('spFileMeta')
const spClearFile        = document.getElementById('spClearFile')
const spModeSection      = document.getElementById('spModeSection')
const spModeBtns         = document.querySelectorAll('.sp-mode-btn')
const spPanelPages       = document.getElementById('spPanelPages')
const spPanelRange       = document.getElementById('spPanelRange')
const spPanelAll         = document.getElementById('spPanelAll')
const spThumbLoading     = document.getElementById('spThumbLoading')
const spThumbGrid        = document.getElementById('spThumbGrid')
const spSelectAllBtn     = document.getElementById('spSelectAll')
const spClearSelectBtn   = document.getElementById('spClearSelect')
const spPagesPreview     = document.getElementById('spPagesPreview')
const spRangeFrom        = document.getElementById('spRangeFrom')
const spRangeTo          = document.getElementById('spRangeTo')
const spRangePreview     = document.getElementById('spRangePreview')
const spOutputFolderPath = document.getElementById('spOutputFolderPath')
const spChooseFolderBtn  = document.getElementById('spChooseFolderButton')
const spProgressBox      = document.getElementById('spProgressBox')
const spProgressBar      = document.getElementById('spProgressBar')
const spProgressPct      = document.getElementById('spProgressPercent')
const spProgressText     = document.getElementById('spProgressText')
const spResultBox        = document.getElementById('spResultBox')
const spSplitButton      = document.getElementById('spSplitButton')

let spFile          = null   // { path, name, size, pageCount }
let spMode          = 'pages'
let spOutputFolder  = null
let spSelectedPages = new Set()  // halaman yang dicentang (1-based)

// ── Upload ──
spSelectBtn.onclick = () => spFileInput.click()
spFileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleSpFile(e.target.files[0])
  spFileInput.value = ''
})

spDropzone.addEventListener('dragover',  (e) => { e.preventDefault(); spDropzone.classList.add('dragover') })
spDropzone.addEventListener('dragleave', ()  => spDropzone.classList.remove('dragover'))
spDropzone.addEventListener('drop', (e) => {
  e.preventDefault(); spDropzone.classList.remove('dragover')
  const f = e.dataTransfer.files[0]
  if (f && f.type === 'application/pdf') handleSpFile(f)
  else alert('Hanya file PDF yang diizinkan!')
})

async function handleSpFile(f) {
  if (f.type !== 'application/pdf') { alert('Hanya file PDF!'); return }

  spFile = { path: f.path || null, name: f.name, size: f.size, pageCount: null }
  spSelectedPages.clear()

  spFileName.textContent  = f.name
  spFileMeta.textContent  = formatSize(f.size) + ' • memuat pratinjau...'
  spFileInfo.hidden       = false
  spDropzone.hidden       = true
  spModeSection.hidden    = false
  spSplitButton.disabled  = true

  // Mulai render thumbnail
  spThumbLoading.hidden = false
  spThumbGrid.hidden    = true
  spThumbGrid.innerHTML = ''
  spPagesPreview.textContent = ''

  try {
    const res = await window.electronAPI.renderPdfThumbnails(f.path)
    spThumbLoading.hidden = true

    if (res.success && res.thumbnails.length > 0) {
      spFile.pageCount = res.thumbnails.length
      spFileMeta.textContent = formatSize(f.size) + ' • ' + res.thumbnails.length + ' halaman'
      spRangeTo.max    = res.thumbnails.length
      spRangeFrom.max  = res.thumbnails.length
      spRangeTo.value  = res.thumbnails.length
      renderThumbnailGrid(res.thumbnails)
    } else {
      // Fallback: hanya hitung halaman tanpa thumbnail
      const count = await window.electronAPI.getPdfPageCount(f.path)
      spFile.pageCount = count
      spFileMeta.textContent = formatSize(f.size) + ' • ' + count + ' halaman'
      renderThumbnailGridFallback(count)
    }
    updateRangePreview()
  } catch {
    spThumbLoading.hidden = true
    spFileMeta.textContent = formatSize(f.size)
  }
}

// ── Render grid dengan thumbnail gambar ──
function renderThumbnailGrid(thumbnails) {
  spThumbGrid.innerHTML = ''

  thumbnails.forEach((src, i) => {
    const pageNum = i + 1
    const item    = document.createElement('div')
    item.className    = 'sp-thumb-item'
    item.dataset.page = pageNum

    item.innerHTML = `
      <div class="sp-thumb-check">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div class="sp-thumb-overlay"></div>
      <img class="sp-thumb-img" src="${src}" alt="Halaman ${pageNum}" loading="lazy" />
      <div class="sp-thumb-num">${pageNum}</div>
    `

    item.addEventListener('click', () => togglePage(pageNum, item))
    spThumbGrid.appendChild(item)
  })

  spThumbGrid.hidden = false
  updatePagesPreview()
}

// ── Fallback: grid tanpa gambar ──
function renderThumbnailGridFallback(count) {
  spThumbGrid.innerHTML = ''

  for (let i = 1; i <= count; i++) {
    const item = document.createElement('div')
    item.className    = 'sp-thumb-item'
    item.dataset.page = i

    item.innerHTML = `
      <div class="sp-thumb-check">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div class="sp-thumb-overlay"></div>
      <div class="sp-thumb-img" style="display:flex;align-items:center;justify-content:center;background:#f5f7fb;color:var(--muted);font-size:22px;font-weight:700;aspect-ratio:3/4">${i}</div>
      <div class="sp-thumb-num">${i}</div>
    `

    item.addEventListener('click', () => togglePage(i, item))
    spThumbGrid.appendChild(item)
  }

  spThumbGrid.hidden = false
  updatePagesPreview()
}

// ── Toggle pilih halaman ──
function togglePage(pageNum, el) {
  if (spSelectedPages.has(pageNum)) {
    spSelectedPages.delete(pageNum)
    el.classList.remove('selected')
  } else {
    spSelectedPages.add(pageNum)
    el.classList.add('selected')
  }
  updatePagesPreview()
  updateSplitButtonState()
}

// ── Pilih semua / hapus semua ──
spSelectAllBtn.onclick = () => {
  document.querySelectorAll('.sp-thumb-item').forEach(item => {
    const n = parseInt(item.dataset.page)
    spSelectedPages.add(n)
    item.classList.add('selected')
  })
  updatePagesPreview()
  updateSplitButtonState()
}

spClearSelectBtn.onclick = () => {
  document.querySelectorAll('.sp-thumb-item').forEach(item => {
    item.classList.remove('selected')
  })
  spSelectedPages.clear()
  updatePagesPreview()
  updateSplitButtonState()
}

// ── Clear file ──
spClearFile.onclick = () => {
  spFile = null
  spSelectedPages.clear()
  spFileInfo.hidden     = true
  spDropzone.hidden     = false
  spModeSection.hidden  = true
  spSplitButton.disabled = true
  spProgressBox.hidden  = true
  spResultBox.hidden    = true
  spResultBox.innerHTML = ''
  spThumbGrid.innerHTML = ''
  spThumbGrid.hidden    = true
  spThumbLoading.hidden = true
  spPagesPreview.textContent = ''
  spRangePreview.textContent = ''
}

// ── Mode buttons ──
spModeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    spModeBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    spMode = btn.dataset.mode
    spPanelPages.hidden = spMode !== 'pages'
    spPanelRange.hidden = spMode !== 'range'
    spPanelAll.hidden   = spMode !== 'all'
    updateSplitButtonState()
  })
})

// ── Update split button enabled state ──
function updateSplitButtonState() {
  if (!spFile) { spSplitButton.disabled = true; return }
  if (spMode === 'pages') {
    spSplitButton.disabled = spSelectedPages.size === 0
  } else {
    spSplitButton.disabled = false
  }
}

// ── Preview teks halaman tertentu ──
function updatePagesPreview() {
  const count    = spSelectedPages.size
  const pagesArr = [...spSelectedPages].sort((a, b) => a - b)
  if (count === 0) {
    spPagesPreview.textContent = 'Belum ada halaman yang dipilih'
    spPagesPreview.style.color = 'var(--muted)'
  } else {
    spPagesPreview.textContent = `→ ${count} halaman dipilih (hal. ${pagesArr.join(', ')}) • akan menjadi 1 file PDF`
    spPagesPreview.style.color = 'var(--primary)'
  }
}

function updateRangePreview() {
  const from = parseInt(spRangeFrom.value) || 1
  const to   = parseInt(spRangeTo.value)   || 1
  if (from > to) {
    spRangePreview.textContent = '⚠ Halaman awal tidak boleh lebih besar dari halaman akhir'
    spRangePreview.style.color = 'var(--red)'
  } else {
    spRangePreview.textContent = `→ Akan mengekstrak halaman ${from} hingga ${to} (${to - from + 1} halaman) menjadi 1 file PDF`
    spRangePreview.style.color = 'var(--primary)'
  }
}

spRangeFrom.addEventListener('input', updateRangePreview)
spRangeTo.addEventListener('input',   updateRangePreview)

// ── Pilih folder output ──
spChooseFolderBtn.onclick = async () => {
  const result = await window.electronAPI.selectOutputFolder()
  if (!result.canceled) {
    spOutputFolder = result.folder
    spOutputFolderPath.textContent = result.folder
  }
}

// ── SPLIT BUTTON ──
spSplitButton.onclick = async () => {
  if (!spFile) return

  let splitOpts = {}
  if (spMode === 'pages') {
    const pages = [...spSelectedPages].sort((a, b) => a - b)
    if (pages.length === 0) { alert('Pilih minimal satu halaman!'); return }
    splitOpts = { mode: 'pages', pages }
  } else if (spMode === 'range') {
    const from = parseInt(spRangeFrom.value)
    const to   = parseInt(spRangeTo.value)
    if (from > to || from < 1) { alert('Rentang halaman tidak valid!'); return }
    splitOpts = { mode: 'range', from, to }
  } else {
    splitOpts = { mode: 'all' }
  }

  spProgressBox.hidden   = false
  spResultBox.hidden     = true
  spResultBox.innerHTML  = ''
  spSplitButton.disabled = true
  spProgressBar.style.width  = '30%'
  spProgressPct.textContent  = '30%'
  spProgressText.textContent = 'Memisahkan...'

  const result = await window.electronAPI.splitPDF(spFile.path, splitOpts, spOutputFolder)

  spProgressBar.style.width  = '100%'
  spProgressPct.textContent  = '100%'
  spProgressText.textContent = 'Selesai!'
  setTimeout(() => { spProgressBox.hidden = true }, 1500)
  spSplitButton.disabled = false

  spResultBox.hidden = false

  if (result.success) {
    const summary = document.createElement('div')
    summary.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;font-weight:600'
    summary.textContent = `✅ ${result.files.length} file PDF berhasil dibuat`
    spResultBox.appendChild(summary)

    result.files.forEach(fp => {
      const name = fp.replace(/\\/g, '/').split('/').pop()
      const item = document.createElement('div')
      item.className = 'w2p-result-item success'
      item.innerHTML = `
        <div class="w2p-result-info">
          <span class="w2p-result-name">${name}</span>
          <span class="w2p-result-meta ok">✓ Berhasil disimpan</span>
        </div>
        <button class="w2p-download-btn" onclick="window.electronAPI.openFile && window.electronAPI.openFile('${fp.replace(/\\/g, '\\\\')}')">Buka</button>
      `
      spResultBox.appendChild(item)
    })
  } else {
    spResultBox.innerHTML = `<div class="w2p-result-item error"><div class="w2p-result-info"><span class="w2p-result-name" style="color:var(--red)">❌ Gagal</span><span class="w2p-result-meta err">${result.error}</span></div></div>`
  }
}

// ══════════════════════════════════════
//  PAGE 4 — PDF TO WORD
// ══════════════════════════════════════
const p2wDropzone      = document.getElementById('p2wDropzone')
const p2wFileInput     = document.getElementById('p2wFileInput')
const p2wSelectBtn     = document.getElementById('p2wSelectButton')
const p2wFileList      = document.getElementById('p2wFileList')
const p2wFileCounter   = document.getElementById('p2wFileCounter')
const p2wConvertBtn    = document.getElementById('p2wConvertButton')
const p2wClearBtn      = document.getElementById('p2wClearButton')
const p2wProgressBox   = document.getElementById('p2wProgressBox')
const p2wProgressBar   = document.getElementById('p2wProgressBar')
const p2wProgressPct   = document.getElementById('p2wProgressPercent')
const p2wProgressText  = document.getElementById('p2wProgressText')
const p2wResultBox     = document.getElementById('p2wResultBox')
const p2wFolderBtn     = document.getElementById('p2wChooseFolderButton')
const p2wFolderPath    = document.getElementById('p2wOutputFolderPath')

let p2wFiles        = []
let p2wOutputFolder = null

// ── Upload ──
p2wSelectBtn.onclick = () => p2wFileInput.click()
p2wFileInput.addEventListener('change', (e) => { handleP2WFiles(e.target.files); p2wFileInput.value = '' })

p2wDropzone.addEventListener('dragover',  (e) => { e.preventDefault(); p2wDropzone.classList.add('dragover') })
p2wDropzone.addEventListener('dragleave', ()  => p2wDropzone.classList.remove('dragover'))
p2wDropzone.addEventListener('drop', (e) => {
  e.preventDefault(); p2wDropzone.classList.remove('dragover')
  handleP2WFiles(e.dataTransfer.files)
})

function handleP2WFiles(fileListInput) {
  const pdfFiles = Array.from(fileListInput).filter(f => f.type === 'application/pdf')
  if (pdfFiles.length === 0) { alert('Hanya file PDF yang diizinkan!'); return }
  pdfFiles.forEach(f => {
    if (!p2wFiles.some(x => x.name === f.name && x.size === f.size))
      p2wFiles.push({ path: f.path || null, name: f.name, size: f.size, status: 'pending' })
  })
  renderP2WList(); updateP2WToolbar()
}

function updateP2WToolbar() {
  p2wFileCounter.textContent = p2wFiles.length > 0
    ? `${p2wFiles.length} file dipilih`
    : '0 file dipilih'
  p2wConvertBtn.disabled = p2wFiles.length === 0
  p2wClearBtn.disabled   = p2wFiles.length === 0
}

function renderP2WList() {
  p2wFileList.innerHTML = ''
  p2wFiles.forEach((file, index) => {
    const li = document.createElement('li')
    li.className = 'file-item'

    const left = document.createElement('div')
    left.className = 'file-left'

    const badge = document.createElement('div')
    badge.className = 'pdf-badge-p2w'
    badge.textContent = 'PDF'

    const info = document.createElement('div')
    info.className = 'file-info'

    const name = document.createElement('strong')
    name.textContent = file.name

    const size = document.createElement('span')
    size.className = 'file-size'
    size.textContent = formatSize(file.size)

    const status = document.createElement('div')
    status.className = 'file-status'
    if (file.status === 'done')        { status.textContent = '✓ Selesai dikonversi'; status.style.color = 'var(--green)' }
    else if (file.status === 'error')  { status.textContent = '✗ ' + (file.error || 'Gagal'); status.style.color = 'var(--red)' }
    else if (file.status === 'converting') { status.textContent = 'Mengkonversi...'; status.style.color = '#1565c0' }
    else { status.textContent = 'Siap dikonversi' }

    info.appendChild(name); info.appendChild(size); info.appendChild(status)
    left.appendChild(badge); left.appendChild(info)

    const actions = document.createElement('div')
    actions.className = 'file-actions'
    const btnDel = document.createElement('button')
    btnDel.className = 'icon-button delete'; btnDel.innerHTML = '×'; btnDel.title = 'Hapus'
    btnDel.onclick = () => { p2wFiles.splice(index, 1); renderP2WList(); updateP2WToolbar() }
    actions.appendChild(btnDel)

    li.appendChild(left); li.appendChild(actions)
    p2wFileList.appendChild(li)
  })
}

// ── Clear ──
p2wClearBtn.onclick = () => {
  p2wFiles = []; renderP2WList(); updateP2WToolbar()
  p2wProgressBox.hidden = true
  p2wResultBox.hidden   = true; p2wResultBox.innerHTML = ''
}

// ── Pilih folder ──
p2wFolderBtn.onclick = async () => {
  const result = await window.electronAPI.selectOutputFolder()
  if (!result.canceled) {
    p2wOutputFolder = result.folder
    p2wFolderPath.textContent = result.folder
  }
}

// ── Convert button ──
p2wConvertBtn.onclick = async () => {
  if (p2wFiles.length === 0) return

  p2wProgressBox.hidden  = false
  p2wResultBox.hidden    = true
  p2wResultBox.innerHTML = ''
  p2wConvertBtn.disabled = true

  for (let i = 0; i < p2wFiles.length; i++) {
    p2wFiles[i].status = 'converting'
    renderP2WList()

    const pct = Math.round((i / p2wFiles.length) * 100)
    p2wProgressBar.style.width = pct + '%'
    p2wProgressPct.textContent = pct + '%'
    p2wProgressText.textContent = `Mengkonversi ${i + 1} / ${p2wFiles.length}...`

    try {
      const result = await window.electronAPI.convertPdfToWord(p2wFiles[i].path, p2wOutputFolder)
      if (result.success) {
        p2wFiles[i].status  = 'done'
        p2wFiles[i].outPath = result.file
        p2wFiles[i].outSize = result.size
      } else {
        p2wFiles[i].status = 'error'
        p2wFiles[i].error  = result.error
      }
    } catch (e) {
      p2wFiles[i].status = 'error'
      p2wFiles[i].error  = e.message
    }
    renderP2WList()
  }

  // Selesai
  p2wProgressBar.style.width  = '100%'
  p2wProgressPct.textContent  = '100%'
  p2wProgressText.textContent = 'Selesai!'
  setTimeout(() => { p2wProgressBox.hidden = true }, 1500)

  // Tampilkan hasil
  p2wResultBox.hidden = false
  p2wResultBox.innerHTML = ''

  const doneCount  = p2wFiles.filter(f => f.status === 'done').length
  const errorCount = p2wFiles.filter(f => f.status === 'error').length

  const summary = document.createElement('div')
  summary.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:10px;font-weight:600'
  summary.textContent = `${doneCount} berhasil${errorCount > 0 ? ` • ${errorCount} gagal` : ''}`
  p2wResultBox.appendChild(summary)

  p2wFiles.forEach(file => {
    const item = document.createElement('div')
    item.className = `w2p-result-item ${file.status === 'done' ? 'success' : 'error'}`

    const info = document.createElement('div')
    info.className = 'w2p-result-info'

    const nameEl = document.createElement('span')
    nameEl.className = 'w2p-result-name'
    nameEl.textContent = file.name.replace(/\.pdf$/i, '.docx')

    const metaEl = document.createElement('span')
    metaEl.className = `w2p-result-meta ${file.status === 'done' ? 'ok' : 'err'}`
    metaEl.textContent = file.status === 'done'
      ? `✓ Berhasil • ${formatSize(file.outSize || 0)}`
      : `✗ ${file.error || 'Gagal dikonversi'}`

    info.appendChild(nameEl); info.appendChild(metaEl)
    item.appendChild(info)

    if (file.status === 'done' && file.outPath) {
      const btn = document.createElement('button')
      btn.className = 'w2p-download-btn'
      btn.style.background = '#1565c0'
      btn.textContent = 'Buka'
      btn.onclick = () => window.electronAPI.openFile && window.electronAPI.openFile(file.outPath)
      item.appendChild(btn)
    }
    p2wResultBox.appendChild(item)
  })

  p2wConvertBtn.disabled = false
}