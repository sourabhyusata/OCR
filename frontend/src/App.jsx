import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import ProcurementForm from './components/ProcurementForm'
import { uploadForOCR, saveTicket, getTickets, deleteTicket } from './api'

const EMPTY_FIELDS = {
  vehicle_number: null,
  driver_name: null,
  material_type: null,
  gross_weight: null,
  tare_weight: null,
  net_weight: null,
  ticket_number: null,
  date_on_ticket: null,
  source_location: null,
  destination: null,
}

export default function App() {
  const [view, setView] = useState('procurement') // 'procurement' | 'simple-upload' | 'simple-review'
  const [processing, setProcessing] = useState(false)
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [rawText, setRawText] = useState('')
  const [originalFilename, setOriginalFilename] = useState('')
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState(null)

  useEffect(() => {
    loadTickets()
  }, [])

  async function loadTickets() {
    try {
      const data = await getTickets()
      setTickets(data)
    } catch {
      // API may not be running yet
    }
  }

  // Simple OCR flow handlers
  async function handleFileSelected(file) {
    setProcessing(true)
    setStatus({ type: 'processing', message: 'Running OCR on your ticket...' })
    try {
      const result = await uploadForOCR(file)
      setRawText(result.raw_text)
      setFields(result.extracted_fields)
      setOriginalFilename(file.name)
      setView('simple-review')
      setStatus({ type: 'success', message: 'OCR complete! Review the extracted data below.' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'OCR processing failed. Please try again.'
      setStatus({ type: 'error', message: msg })
    } finally {
      setProcessing(false)
    }
  }

  async function handleSave() {
    try {
      await saveTicket({
        ...fields,
        raw_ocr_text: rawText,
        original_filename: originalFilename,
      })
      setStatus({ type: 'success', message: 'Ticket saved successfully!' })
      handleReset()
      loadTickets()
    } catch {
      setStatus({ type: 'error', message: 'Failed to save ticket.' })
    }
  }

  function handleReset() {
    setView('simple-upload')
    setFields(EMPTY_FIELDS)
    setRawText('')
    setOriginalFilename('')
  }

  async function handleDelete(id) {
    try {
      await deleteTicket(id)
      loadTickets()
    } catch {
      setStatus({ type: 'error', message: 'Failed to delete ticket.' })
    }
  }

  // Procurement form save
  async function handleProcurementSave(formData) {
    try {
      await saveTicket({
        vehicle_number: formData.vehicle_number || null,
        driver_name: formData.driver_name || null,
        material_type: null,
        gross_weight: formData.gross_weight_qtl ? parseFloat(formData.gross_weight_qtl) : null,
        tare_weight: formData.tare_weight_qtl ? parseFloat(formData.tare_weight_qtl) : null,
        net_weight: formData.net_weight_qtl ? parseFloat(formData.net_weight_qtl) : null,
        ticket_number: formData.load_ticket_number || null,
        date_on_ticket: formData.ticket_date || null,
        source_location: formData.source_location_text || null,
        destination: formData.warehouse_name || null,
        raw_ocr_text: formData.raw_ocr_text || '',
        original_filename: '',
      })
      setStatus({ type: 'success', message: 'Load Ticket saved successfully!' })
      loadTickets()
    } catch {
      setStatus({ type: 'error', message: 'Failed to save load ticket.' })
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Procurement &mdash; Tudi (Load Ticket)</h1>
        <p>Upload weighbridge tickets, extract data via OCR, and manage load records</p>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'procurement' ? 'nav-active' : ''}`}
            onClick={() => setView('procurement')}
          >
            Procurement Form
          </button>
          <button
            className={`nav-btn ${view.startsWith('simple') ? 'nav-active' : ''}`}
            onClick={() => setView('simple-upload')}
          >
            Quick OCR Scan
          </button>
        </nav>
      </header>

      {status && (
        <div className={`status-message ${status.type}`}>
          {status.type === 'processing' && <span className="spinner" />}
          {status.message}
          <button className="status-close" onClick={() => setStatus(null)}>&times;</button>
        </div>
      )}

      {/* Procurement Form View */}
      {view === 'procurement' && (
        <ProcurementForm
          onSave={handleProcurementSave}
          onCancel={() => setView('simple-upload')}
        />
      )}

      {/* Simple OCR Upload View */}
      {view === 'simple-upload' && (
        <FileUpload onFileSelected={handleFileSelected} isProcessing={processing} />
      )}

      {/* Simple OCR Review View */}
      {view === 'simple-review' && (
        <TicketForm
          fields={fields}
          onChange={setFields}
          onSave={handleSave}
          onReset={handleReset}
          rawText={rawText}
        />
      )}

      <TicketList tickets={tickets} onDelete={handleDelete} />
    </div>
  )
}
