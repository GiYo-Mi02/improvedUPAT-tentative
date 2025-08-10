import { http, extractErrorMessage } from '../httpClient';

export interface EventFilters {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  upcoming?: boolean | string;
  organizer?: string;
  from?: string; // ISO string
  to?: string;   // ISO string
}

export async function fetchEvents(filters: EventFilters = {}) {
  try {
    const res = await http.get('/events', { params: filters });
    return res.data;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function fetchEvent(id: string) {
  try {
    const res = await http.get(`/events/${id}`);
    return res.data;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function fetchFeatured() {
  try {
    const res = await http.get('/events/featured/list');
    return res.data.events;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function fetchEventSeats(eventId: string) {
  try {
    const res = await http.get(`/events/${eventId}/seats`);
    return res.data.seats;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function fetchCategories() {
  try {
    const res = await http.get('/events/meta/categories');
    return res.data.categories;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}
