export default function TicketList({ tickets, onDelete }) {
  if (!tickets.length) {
    return (
      <div className="tickets-section">
        <h2>Saved Tickets</h2>
        <div className="empty-state">No tickets saved yet. Upload a load ticket above.</div>
      </div>
    )
  }

  return (
    <div className="tickets-section">
      <h2>Saved Tickets ({tickets.length})</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="tickets-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ticket No</th>
              <th>Vehicle</th>
              <th>Material</th>
              <th>Gross</th>
              <th>Tare</th>
              <th>Net</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.ticket_number || '-'}</td>
                <td>{t.vehicle_number || '-'}</td>
                <td>{t.material_type || '-'}</td>
                <td>{t.gross_weight ?? '-'}</td>
                <td>{t.tare_weight ?? '-'}</td>
                <td>{t.net_weight ?? '-'}</td>
                <td>{t.date_on_ticket || '-'}</td>
                <td>
                  <button className="btn btn-danger" onClick={() => onDelete(t.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
