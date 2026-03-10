import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
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
  const [step, setStep] = useState('upload') // 'upload' | 'review'
  const [processing, setProcessing] = useState(false)
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [rawText, setRawText] = useState('')
  const [originalFilename, setOriginalFilename] = useState('')
  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState(null) // { type, message }

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

  async function handleFileSelected(file) {
    setProcessing(true)
    setStatus({ type: 'processing', message: 'Running OCR on your ticket...' })
    try {
      const result = await uploadForOCR(file)
      setRawText(result.raw_text)
      setFields(result.extracted_fields)
      setOriginalFilename(file.name)
      setStep('review')
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
    setStep('upload')
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Load Ticket OCR Tool</h1>
        <p>Upload a load ticket image or PDF to extract vehicle and weight data</p>
      </header>

      {status && (
        <div className={`status-message ${status.type}`}>
          {status.type === 'processing' && <span className="spinner" />}
          {status.message}
        </div>
      )}

      {step === 'upload' && (
        <FileUpload onFileSelected={handleFileSelected} isProcessing={processing} />
      )}

      {step === 'review' && (
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
