import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
const record = { _id: 'tan-booking', hall: 'Auditorium / Halls', roomNo: 'TAN Auditorium', status: 'booked' };
const query = value => ({ populate: () => query(value), sort: async () => value, then: resolve => Promise.resolve(value).then(resolve) });
const find = jest.fn(() => query([]));
const findById = jest.fn(() => query(record));
jest.unstable_mockModule('../models/VenueBooking.js', () => ({ default: { find, findById } }));
jest.unstable_mockModule('../models/VenueEnquiry.js', () => ({ default: { find, findById } }));
jest.unstable_mockModule('../models/SocietyNameSuggestion.js', () => ({ default: { findOneAndUpdate: jest.fn() }, DEFAULT_SOCIETY_NAMES: [], getDefaultSocietyEmail: () => '' }));
jest.unstable_mockModule('../models/EventNameSuggestion.js', () => ({ default: { findOneAndUpdate: jest.fn() }, DEFAULT_EVENT_NAMES: [] }));
jest.unstable_mockModule('../middleware/auth.js', () => ({ protect: (req, res, next) => { req.user = { role: 'dd_assistant' }; next(); } }));
const { default: bookings } = await import('../routes/VenueBookingRoutes.js');
const { default: enquiries } = await import('../routes/venueEnquiryRoutes.js');
const { getVenueRoomFilterForRole } = await import('../utils/venueAccessPolicy.js');
const app = express();
app.use(express.json());
app.use('/bookings', bookings);
app.use('/enquiries', enquiries);
beforeEach(() => jest.clearAllMocks());
test.each([
 ['get', '/bookings/tan-booking'], ['patch', '/bookings/tan-booking'],
 ['patch', '/bookings/tan-booking/extend'], ['patch', '/bookings/tan-booking/cancel'],
 ['patch', '/bookings/tan-booking/status'], ['delete', '/bookings/tan-booking'],
 ['get', '/enquiries/tan-booking'], ['post', '/enquiries/tan-booking/check-conflict'],
 ['put', '/enquiries/tan-booking/approved'], ['put', '/enquiries/tan-booking/rejected'],
])('%s %s denies DD Assistant access to TAN', async (method, path) => {
 const res = await request(app)[method](path).send({ status: 'cancelled' });
 expect(res.status).toBe(403);
});
test('direct TAN booking is denied', async () => {
 const res = await request(app).post('/bookings').send({
  rooms: [record], name: 'Test', eventName: 'Event', email: 'test@thapar.edu',
  checkInDate: '2030-01-01', checkOutDate: '2030-01-01', checkInTime: '10:00', checkOutTime: '12:00',
  attachments: ['consent.pdf'], bookingFor: 'institute_calendar',
 });
 expect(res.status).toBe(403);
});
test.each(['/bookings', '/enquiries/all'])('%s applies restricted database query', async path => {
 expect((await request(app).get(path)).status).toBe(200);
 expect(find).toHaveBeenCalledWith(getVenueRoomFilterForRole('dd_assistant'));
});
test('hall filtering cannot bypass DD restrictions', async () => {
 expect((await request(app).get('/bookings/venue/Auditorium')).status).toBe(200);
 expect(find).toHaveBeenCalledWith({ $and: [{ hall: 'Auditorium' }, getVenueRoomFilterForRole('dd_assistant')] });
});

test('date-range queries retain DD room restrictions', async () => {
 expect((await request(app).get('/bookings/date-range?startDate=2030-01-01&endDate=2030-01-02')).status).toBe(200);
 expect(find).toHaveBeenCalledWith({ $and: [
  { checkInDate: { $lte: '2030-01-02' }, checkOutDate: { $gte: '2030-01-01' } },
  getVenueRoomFilterForRole('dd_assistant'),
 ] });
});
