import { http, extractErrorMessage } from '../httpClient';

export async function getDashboard() { try { const r = await http.get('/admin/dashboard'); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }

export async function adminCreateEvent(data: any) {
	try {
		const isFD = typeof FormData !== 'undefined' && data instanceof FormData;
		const r = await http.post('/admin/events', data, isFD ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
		return r.data;
	} catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function adminGetEvents(params: any = {}) { try { const r = await http.get('/admin/events', { params }); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminUpdateEvent(id: string, data: any) {
	try {
		const isFD = typeof FormData !== 'undefined' && data instanceof FormData;
		const r = await http.put(`/admin/events/${id}`, data, isFD ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
		return r.data;
	} catch (e) { throw new Error(extractErrorMessage(e)); }
}
export async function adminDeleteEvent(id: string) { try { const r = await http.delete(`/admin/events/${id}`); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminPublishEvent(id: string, data: FormData) { try { const r = await http.put(`/admin/events/${id}/publish`, data, { headers: { 'Content-Type': 'multipart/form-data' } }); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }

export async function adminGetUsers(params: any = {}) { try { const r = await http.get('/admin/users', { params }); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminUpdateUserStatus(id: string, isActive: boolean) { try { const r = await http.put(`/admin/users/${id}/status`, { isActive }); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }

export async function adminGetReservations(params: any = {}) { try { const r = await http.get('/admin/reservations', { params }); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminApproveReservation(id: string) { try { const r = await http.put(`/admin/reservations/${id}/approve`); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminRejectReservation(id: string) { try { const r = await http.put(`/admin/reservations/${id}/reject`); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminGetEvent(id: string) { try { const r = await http.get(`/events/${id}`); return r.data; } catch (e) { throw new Error(extractErrorMessage(e)); } }
export async function adminBulkApproveReservations(eventId: string, limit: number = 1000) {
	try {
		const r = await http.put('/admin/reservations/bulk-approve', { eventId, limit });
		return r.data;
	} catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function adminMandatoryInvite(eventId: string, payload: { emails?: string[]; message?: string; sendTickets?: boolean; limit?: number; background?: boolean; concurrency?: number }) {
	try {
		const r = await http.post(`/admin/events/${eventId}/mandatory-invite`, payload);
		return r.data;
	} catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function adminGetBulkJob(jobId: string) {
	try {
		const r = await http.get(`/admin/bulk-jobs/${jobId}`);
		return r.data as { id: string; status: string; total: number; notified: number; ticketed: number; failed: number; errors: any[] };
	} catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function adminGetEventAnalytics(params: { range?: 'all' | 'upcoming' | 'past'; limit?: number } = {}) {
	try {
		const r = await http.get('/admin/events/analytics', { params });
		return r.data as { analytics: Array<any> };
	} catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function adminGetEventTrends(params: { rangeDays?: number; range?: 'all' | 'upcoming' | 'past'; limit?: number; eventIds?: string }) {
	try { const r = await http.get('/admin/events/trends', { params }); return r.data as { rangeDays: number; labels: string[]; trends: any[] }; }
	catch (e) { throw new Error(extractErrorMessage(e)); }
}
