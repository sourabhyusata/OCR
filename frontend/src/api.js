import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export async function uploadForOCR(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function saveTicket(ticket) {
  const res = await api.post('/tickets', ticket)
  return res.data
}

export async function getTickets() {
  const res = await api.get('/tickets')
  return res.data
}

export async function deleteTicket(id) {
  await api.delete(`/tickets/${id}`)
}
