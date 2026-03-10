import { useState } from 'react'

/**
 * OCR Panel — shows extracted values + raw text lines.
 * - "Auto-fill Form" pushes all matched OCR values into the form at once.
 * - Per-value remapping: click any OCR value → pick which form field to map it to → overrides that field.
 */

const OCR_LABELS = {
  ticket_number: 'Ticket Number (पर्ची नं)',
  date_on_ticket: 'Date (तारीख)',
  vehicle_number: 'Vehicle Number (गाड़ी नं)',
  driver_name: 'Driver Name (चालक)',
  material_type: 'Material Type (माल)',
  gross_weight: 'Gross Weight (भरा वजन)',
  tare_weight: 'Tare Weight (खाली वजन)',
  net_weight: 'Net Weight (शुद्ध वजन)',
  source_location: 'Source (स्थान)',
  destination: 'Destination',
}

// All form fields an OCR value can be remapped to
const FORM_FIELD_OPTIONS = [
  { value: 'load_ticket_number', label: 'Load Ticket #' },
  { value: 'ticket_date', label: 'Date' },
  { value: 'vehicle_number', label: 'Trolley / Truck #' },
  { value: 'vendor_name', label: 'Vendor Name' },
  { value: 'driver_name', label: 'Driver Name' },
  { value: 'driver_mobile', label: 'Driver Mobile' },
  { value: 'source_location_text', label: 'Source Location' },
  { value: 'warehouse_name', label: 'Godown / Warehouse' },
  { value: 'gross_weight_qtl', label: 'Gross Weight (Qtl)' },
  { value: 'tare_weight_qtl', label: 'Tare Weight (Qtl)' },
  { value: 'net_weight_qtl', label: 'Net Weight (Qtl)' },
  { value: 'moisture_pct', label: 'Moisture %' },
  { value: 'weighbridge_location', label: 'WeighBridge Location' },
  { value: 'remarks', label: 'QC Remarks / Note' },
]

export default function OcrPanel({ ocrResult, onAutoFill, onMapField, onClose }) {
  const [showRaw, setShowRaw] = useState(false)
  const [activeRemap, setActiveRemap] = useState(null) // id of row currently showing dropdown

  if (!ocrResult) return null

  const { raw_text, extracted_fields } = ocrResult
  const hasStructured = Object.values(extracted_fields).some((v) => v !== null)
  const extraLines = getExtraLines(raw_text, extracted_fields)

  function handleRemapSelect(formFieldKey, value) {
    if (onMapField) {
      onMapField(formFieldKey, String(value))
    }
    setActiveRemap(null)
  }

  function renderRemapDropdown(value) {
    return (
      <div className="remap-dropdown">
        <span className="remap-title">Map to field:</span>
        {FORM_FIELD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className="remap-option"
            onClick={(e) => { e.stopPropagation(); handleRemapSelect(opt.value, value) }}
          >
            {opt.label}
          </button>
        ))}
        <button
          className="remap-option remap-cancel"
          onClick={(e) => { e.stopPropagation(); setActiveRemap(null) }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="ocr-panel">
      <div className="ocr-panel-header">
        <h3>OCR Extracted Data</h3>
        <button className="btn-icon btn-close-x" onClick={onClose} title="Close">&times;</button>
      </div>

      <p className="ocr-panel-hint">
        Click <strong>"Auto-fill"</strong> to populate all fields. Or click any value below to map it to a specific form field (overrides existing value).
      </p>

      <div className="ocr-fields-list">
        {/* Structured extracted fields */}
        {hasStructured && Object.entries(OCR_LABELS).map(([key, label]) => {
          const val = extracted_fields[key]
          if (val === null || val === undefined) return null
          const rowId = `struct-${key}`
          return (
            <div className="ocr-field-row" key={rowId}>
              <span className="ocr-field-label">{label}</span>
              <span
                className={`ocr-field-value ocr-clickable ${activeRemap === rowId ? 'ocr-selected' : ''}`}
                onClick={() => setActiveRemap(activeRemap === rowId ? null : rowId)}
                title="Click to remap this value to any form field"
              >
                {val}
              </span>
              {activeRemap === rowId && renderRemapDropdown(val)}
            </div>
          )
        })}

        {/* Extra raw text lines (not already captured as structured) */}
        {extraLines.length > 0 && (
          <div className="ocr-extra-divider">Other OCR text lines:</div>
        )}
        {extraLines.map((line, i) => {
          const rowId = `extra-${i}`
          return (
            <div className="ocr-field-row ocr-extra" key={rowId}>
              <span className="ocr-field-label">Line {i + 1}</span>
              <span
                className={`ocr-field-value ocr-clickable ${activeRemap === rowId ? 'ocr-selected' : ''}`}
                onClick={() => setActiveRemap(activeRemap === rowId ? null : rowId)}
                title="Click to map this value to a form field"
              >
                {line}
              </span>
              {activeRemap === rowId && renderRemapDropdown(line)}
            </div>
          )
        })}

        {!hasStructured && extraLines.length === 0 && (
          <p className="ocr-no-fields">No data could be extracted. Try a clearer photo.</p>
        )}
      </div>

      <div className="ocr-panel-actions">
        <button className="btn btn-success" onClick={() => onAutoFill(extracted_fields)} disabled={!hasStructured}>
          Auto-fill Form
        </button>
        <button className="btn btn-outline" onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? 'Hide' : 'Show'} Raw Text
        </button>
      </div>

      {showRaw && raw_text && (
        <div className="ocr-raw-section">
          <pre>{raw_text}</pre>
        </div>
      )}
    </div>
  )
}

/** Get meaningful lines from raw text that aren't already in extracted fields */
function getExtraLines(rawText, fields) {
  if (!rawText) return []
  const fieldValues = new Set(
    Object.values(fields)
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).trim().toLowerCase())
  )
  return rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && !fieldValues.has(l.toLowerCase()))
    .slice(0, 25)
}
