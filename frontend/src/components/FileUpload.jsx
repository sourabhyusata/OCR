import { useState, useRef } from 'react'

export default function FileUpload({ onFileSelected, isProcessing }) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const inputRef = useRef()

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    onFileSelected(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleChange(e) {
    handleFile(e.target.files[0])
  }

  return (
    <div className="upload-section">
      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <div className="icon">&#128196;</div>
        <h3>{fileName ? fileName : 'Drop your load ticket here'}</h3>
        <p>Supports PNG, JPG, TIFF, BMP, WebP, HEIC, PDF (max 10 MB)</p>
        {isProcessing && (
          <p style={{ marginTop: 12 }}>
            <span className="spinner" /> Processing OCR...
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
