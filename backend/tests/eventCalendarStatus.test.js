import { bookingToCalendarEvent } from '../controllers/eventCalendarController.js';
const booking = { status: 'booked', checkInDate: '2026-09-11', checkOutDate: '2026-09-11', checkInTime: '11:00', checkOutTime: '13:00', roomNo: 'C-Hall', hall: 'Auditorium / Halls' };
test.each([
 ['2026-09-11T10:59:00+05:30', 'upcoming'], ['2026-09-11T12:00:00+05:30', 'ongoing'],
 ['2026-09-11T13:01:00+05:30', 'completed'], ['2026-09-11T23:31:00+05:30', 'completed'],
 ['2026-09-12T00:01:00+05:30', 'completed'], ['2026-09-10T12:00:00+05:30', 'upcoming'],
])('%s derives %s in campus time', (time, status) => {
 const event = bookingToCalendarEvent(booking, new Date(time));
 expect(event.status).toBe(status);
 expect(event.eventHall).toEqual({ roomNo: 'C-Hall', hall: 'Auditorium / Halls' });
});
test('multi-day is ongoing before final end', () => expect(bookingToCalendarEvent({ ...booking, checkOutDate: '2026-09-13' }, new Date('2026-09-12T23:31:00+05:30')).status).toBe('ongoing'));
test.each(['cancelled', 'no_show', 'checked_out'])('preserves terminal %s', status => expect(bookingToCalendarEvent({ ...booking, status }, new Date('2026-09-10T12:00:00+05:30')).status).toBe(status === 'checked_out' ? 'completed' : 'cancelled'));
