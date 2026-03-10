const FIELD_LABELS = {
  vehicle_number: 'Vehicle Number',
  driver_name: 'Driver Name',
  material_type: 'Material Type',
  gross_weight: 'Gross Weight (kg)',
  tare_weight: 'Tare Weight (kg)',
  net_weight: 'Net Weight (kg)',
  ticket_number: 'Ticket Number',
  date_on_ticket: 'Date on Ticket',
  source_location: 'Source / Origin',
  destination: 'Destination',
}

export default function TicketForm({ fields, onChange, onSave, onReset, rawText }) {
  function handleChange(key, value) {
    onChange({ ...fields, [key]: value })
  }

  return (
    <>
      <div className="form-section">
        <h2>Extracted Ticket Data</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Review and correct the OCR results, then save.
        </p>
        <div className="form-grid">
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input
                type={key.includes('weight') ? 'number' : 'text'}
                value={fields[key] ?? ''}
                onChange={(e) => handleChange(key, e.target.value || null)}
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn btn-success" onClick={onSave}>
            Save Ticket
          </button>
          <button className="btn btn-primary" onClick={onReset}>
            Upload Another
          </button>
        </div>
      </div>

      {rawText && (
        <div className="raw-text-section">
          <h3>Raw OCR Text</h3>
          <pre>{rawText}</pre>
        </div>
      )}
    </>
  )
}
