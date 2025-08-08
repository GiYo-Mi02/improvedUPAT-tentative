import { http, extractErrorMessage } from '../httpClient';

export async function holdSeat(seatId: string) {
  try { const res = await http.post(`/seats/${seatId}/hold`); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function releaseSeat(seatId: string) {
  try { const res = await http.post(`/seats/${seatId}/release`); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function getAvailability(eventId: string) {
  try { const res = await http.get(`/seats/availability/${eventId}`); return res.data; } catch (e) { throw new Error(extractErrorMessage(e)); }
}
