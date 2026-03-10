import { useState, useRef } from 'react'
import OcrPanel from './OcrPanel'
import { uploadForOCR } from '../api'

const TODAY = new Date().toISOString().slice(0, 10)
const NOW_TIME = new Date().toTimeString().slice(0, 5)

const INITIAL_FORM = {
  // Entry
  load_ticket_number: '',
  ticket_date: TODAY,
  ticket_time: NOW_TIME,
  // Vehicle & Vendor
  vehicle_number: '',
  vendor_name: '',
  // Driver
  driver_name: '',
  driver_mobile: '',
  // Source
  source_type: 'farmer_field',
  source_location_text: '',
  // Destination
  warehouse_name: '',
  // Weight
  gross_weight_qtl: '',
  tare_weight_qtl: '',
  net_weight_qtl: '',
  moisture_pct: '',
  weighbridge_location: '',
  // Quality
  tudi_quality: '',
  remarks: '',
  // Status
  status: 'draft',
  payment_status: 'pending',
}

export default function ProcurementForm({ onSave, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [ocrResult, setOcrResult] = useState(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrError, setOcrError] = useState(null)
  const [photos, setPhotos] = useState({ weighbridge: null, load_ticket: null, additional: [] })
  const fileRef = useRef()

  function set(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-calc net weight
      if (key === 'gross_weight_qtl' || key === 'tare_weight_qtl') {
        const gross = parseFloat(key === 'gross_weight_qtl' ? value : prev.gross_weight_qtl)
        const tare = parseFloat(key === 'tare_weight_qtl' ? value : prev.tare_weight_qtl)
        if (!isNaN(gross) && !isNaN(tare) && tare < gross) {
          next.net_weight_qtl = (gross - tare).toFixed(2)
        }
      }
      return next
    })
  }

  // OCR upload handler
  async function handleOcrUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrProcessing(true)
    setOcrError(null)
    try {
      const result = await uploadForOCR(file)
      setOcrResult(result)
      // Also store the photo as weighbridge photo
      setPhotos((p) => ({ ...p, weighbridge: file }))
    } catch (err) {
      setOcrError(err.response?.data?.detail || 'OCR processing failed.')
    } finally {
      setOcrProcessing(false)
    }
  }

  // Auto-fill form from OCR extracted fields
  function handleAutoFill(extracted) {
    setForm((prev) => {
      const next = { ...prev }

      if (extracted.ticket_number) next.load_ticket_number = String(extracted.ticket_number)
      if (extracted.date_on_ticket) next.ticket_date = extracted.date_on_ticket
      if (extracted.vehicle_number) next.vehicle_number = extracted.vehicle_number
      if (extracted.driver_name) next.driver_name = extracted.driver_name
      if (extracted.material_type) next.source_location_text = extracted.material_type
      if (extracted.source_location) next.source_location_text = extracted.source_location

      if (extracted.gross_weight != null) next.gross_weight_qtl = String(extracted.gross_weight)
      if (extracted.tare_weight != null) next.tare_weight_qtl = String(extracted.tare_weight)
      if (extracted.net_weight != null) {
        next.net_weight_qtl = String(extracted.net_weight)
      } else if (extracted.gross_weight != null && extracted.tare_weight != null) {
        next.net_weight_qtl = (extracted.gross_weight - extracted.tare_weight).toFixed(2)
      }

      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (onSave) {
      onSave({
        ...form,
        raw_ocr_text: ocrResult?.raw_text || '',
      })
    }
  }

  const canCalcNet = form.gross_weight_qtl && form.tare_weight_qtl
  const isConfirmed = form.status === 'confirmed'

  return (
    <div className="procurement-layout">
      {/* OCR Panel — right side */}
      <div className="procurement-ocr-col">
        <div className="ocr-upload-card">
          <h3>Scan Weighbridge Ticket</h3>
          <p>Upload a photo of the weighbridge slip to auto-fill the form</p>
          <button
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={ocrProcessing}
          >
            {ocrProcessing ? (
              <><span className="spinner" /> Processing OCR...</>
            ) : (
              'Upload Ticket Photo'
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleOcrUpload}
            style={{ display: 'none' }}
          />
          {ocrError && <p className="ocr-error">{ocrError}</p>}
        </div>

        {ocrResult && (
          <OcrPanel
            ocrResult={ocrResult}
            onAutoFill={handleAutoFill}
            onMapField={(fieldKey, value) => set(fieldKey, value)}
            onClose={() => setOcrResult(null)}
          />
        )}
      </div>

      {/* Procurement Form — left/main */}
      <form className="procurement-form" onSubmit={handleSubmit}>
        <div className="procurement-header">
          <h2>Tudi (Load Ticket) &mdash; Procurement</h2>
          <div className="procurement-badges">
            <span className={`badge badge-${form.status}`}>{form.status.toUpperCase()}</span>
            <span className="badge badge-payment">{form.payment_status.toUpperCase()}</span>
          </div>
        </div>

        {/* SECTION: Entry Type & Date */}
        <fieldset className="form-fieldset">
          <legend>Entry Details</legend>
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label>Load Ticket # <span className="req">*</span></label>
              <input
                type="text"
                value={form.load_ticket_number}
                onChange={(e) => set('load_ticket_number', e.target.value)}
                placeholder="e.g. LT-00123"
                required
              />
            </div>
            <div className="form-group">
              <label>Date <span className="req">*</span></label>
              <input
                type="date"
                value={form.ticket_date}
                onChange={(e) => set('ticket_date', e.target.value)}
                max={TODAY}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={form.ticket_time}
                onChange={(e) => set('ticket_time', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION: Vehicle & Vendor */}
        <fieldset className="form-fieldset">
          <legend>Vehicle &amp; Vendor</legend>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Trolley / Truck # <span className="req">*</span></label>
              <input
                type="text"
                value={form.vehicle_number}
                onChange={(e) => set('vehicle_number', e.target.value)}
                placeholder="e.g. RJ14GB1234"
                required
              />
            </div>
            <div className="form-group">
              <label>Vendor Name</label>
              <input
                type="text"
                value={form.vendor_name}
                onChange={(e) => set('vendor_name', e.target.value)}
                placeholder="Auto-filled from equipment master"
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION: Driver */}
        <fieldset className="form-fieldset">
          <legend>Driver</legend>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Driver Name</label>
              <input
                type="text"
                value={form.driver_name}
                onChange={(e) => set('driver_name', e.target.value)}
                placeholder="Driver name"
              />
            </div>
            <div className="form-group">
              <label>Driver Mobile</label>
              <input
                type="tel"
                value={form.driver_mobile}
                onChange={(e) => set('driver_mobile', e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION: Source */}
        <fieldset className="form-fieldset">
          <legend>Source &mdash; Tudi Location</legend>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Source Type <span className="req">*</span></label>
              <select value={form.source_type} onChange={(e) => set('source_type', e.target.value)}>
                <option value="farmer_field">Farmer Field</option>
                <option value="open_market">Open Market</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                Source Location
                {(form.source_type === 'open_market' || form.source_type === 'other') && <span className="req"> *</span>}
              </label>
              <input
                type="text"
                value={form.source_location_text}
                onChange={(e) => set('source_location_text', e.target.value)}
                placeholder="Location name or address"
                required={form.source_type === 'open_market' || form.source_type === 'other'}
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION: Destination */}
        <fieldset className="form-fieldset">
          <legend>Destination &mdash; Godown / Warehouse</legend>
          <div className="form-grid form-grid-1">
            <div className="form-group">
              <label>Godown / Warehouse <span className="req">*</span></label>
              <input
                type="text"
                value={form.warehouse_name}
                onChange={(e) => set('warehouse_name', e.target.value)}
                placeholder="Select or type warehouse name"
                required
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION: Weight & Measurement */}
        <fieldset className="form-fieldset">
          <legend>Weight &amp; Measurement</legend>
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label>Gross Weight (Qtl) <span className="req">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.gross_weight_qtl}
                onChange={(e) => set('gross_weight_qtl', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label>Tare Weight (Qtl)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.tare_weight_qtl}
                onChange={(e) => set('tare_weight_qtl', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Net Weight (Qtl) <span className="req">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.net_weight_qtl}
                onChange={(e) => set('net_weight_qtl', e.target.value)}
                placeholder={canCalcNet ? 'Auto-calculated' : '0.00'}
                readOnly={!!canCalcNet}
                required
              />
              {canCalcNet && <span className="field-hint">Auto: Gross - Tare</span>}
            </div>
          </div>
          <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label>Moisture %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.moisture_pct}
                onChange={(e) => set('moisture_pct', e.target.value)}
                placeholder="0.0"
              />
            </div>
            <div className="form-group">
              <label>WeighBridge Location</label>
              <input
                type="text"
                value={form.weighbridge_location}
                onChange={(e) => set('weighbridge_location', e.target.value)}
                placeholder="Weighbridge name / location"
              />
            </div>
          </div>
        </fieldset>

        {/* SECTION: Photos */}
        <fieldset className="form-fieldset">
          <legend>Photos &amp; Attachments</legend>
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label>WeighBridge Photo</label>
              {photos.weighbridge ? (
                <span className="file-attached">
                  {photos.weighbridge.name}
                </span>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotos((p) => ({ ...p, weighbridge: e.target.files[0] }))}
                />
              )}
            </div>
            <div className="form-group">
              <label>Load Ticket Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotos((p) => ({ ...p, load_ticket: e.target.files[0] }))}
              />
            </div>
            <div className="form-group">
              <label>Additional Photos</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos((p) => ({ ...p, additional: Array.from(e.target.files) }))}
              />
              <span className="field-hint">Up to 5 photos</span>
            </div>
          </div>
        </fieldset>

        {/* SECTION: Quality & Notes */}
        <fieldset className="form-fieldset">
          <legend>Quality &amp; Notes</legend>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>QC Checked</label>
              <select value={form.tudi_quality} onChange={(e) => set('tudi_quality', e.target.value)}>
                <option value="">-- Select --</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div className="form-group">
              <label>QC Remarks / Note</label>
              <textarea
                value={form.remarks}
                onChange={(e) => set('remarks', e.target.value)}
                placeholder="Any observations..."
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className="procurement-actions">
          <button type="submit" className="btn btn-success btn-lg">
            Save Load Ticket
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              set('status', 'confirmed')
              // In future: trigger print
              alert('Load Ticket confirmed & ready to print!')
            }}
          >
            Confirm &amp; Print
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
