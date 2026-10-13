import { apiFetch } from './authApi';

/**
 * Gửi yêu cầu hỗ trợ / khiếu nại từ form liên hệ
 * @param {Object} ticketData { name, email, phone, subject, message }
 */
export async function submitContactTicket(ticketData) {
    return apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
            name: (ticketData.name || '').trim(),
            email: (ticketData.email || '').trim(),
            phone: (ticketData.phone || '').trim() || null,
            subject: (ticketData.subject || '').trim(),
            message: (ticketData.message || '').trim(),
            honeypotTrap: ticketData.honeypotTrap ? ticketData.honeypotTrap.trim() : null,
        }),
    });
}
