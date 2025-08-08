import { http, extractErrorMessage } from '../httpClient';

export interface CreateReservationPayload { eventId: string; seatId: string; paymentMethod: string; paymentReference?: string; }

export async function createReservation(payload: CreateReservationPayload) {
  try { const res = await http.post('/reservations', payload); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function fetchReservations(params: any = {}) {
  try { const res = await http.get('/reservations', { params }); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function fetchReservation(id: string) {
  try { const res = await http.get(`/reservations/${id}`); return res.data.reservation; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function cancelReservation(id: string) {
  try { const res = await http.put(`/reservations/${id}/cancel`); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function fetchQR(id: string) {
  try { const res = await http.get(`/reservations/${id}/qr`); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function resendEmail(id: string) {
  try { const res = await http.post(`/reservations/${id}/resend-email`); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
