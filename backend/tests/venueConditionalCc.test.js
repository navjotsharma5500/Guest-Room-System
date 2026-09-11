import { jest } from '@jest/globals';
const sendMail = jest.fn(async () => ({}));
jest.unstable_mockModule('../emails/venue/venueEmailDispatcher.js', () => ({ getEmailAuthorityByRoom: () => ({ key: 'DD', transporter: { sendMail } }) }));
jest.unstable_mockModule('../emails/venue/venueEmailContext.js', () => ({ buildEmailContext: ({ societyEmail }) => ({ to: ['guest@test.com'], cc: ['someone@thapar.edu', ...(societyEmail ? [societyEmail] : [])] }) }));
jest.unstable_mockModule('../emails/venue/templates/index.js', () => ({ default: () => ({ subject: 'Booking', html: '<p>Booking</p>' }) }));
jest.unstable_mockModule('../emails/venue/venueEmailLogger.js', () => ({ logEmail: jest.fn() }));
const { sendVenueEmail } = await import('../emails/venue/index.js');
const extra = 'sukhdevsingh@thapar.edu';
beforeEach(() => sendMail.mockClear());
test.each(['venueName', 'hall', 'roomNo'])('conditional CC through %s', async field => {
 for (const venue of ['Main Auditorium', 'TAN Auditorium', 'C-Hall', ' C Hall ', 'CHall', '  tAn   Auditorium ']) {
  await sendVenueEmail({ type: 'approved', roomNo: venue, data: { [field]: venue } });
  expect(sendMail.mock.lastCall[0].cc).toContain(extra);
  expect(sendMail.mock.lastCall[0].to).toEqual(['guest@test.com']);
  expect(sendMail.mock.lastCall[0].cc).toContain('someone@thapar.edu');
 }
});
test.each(["Dean's Auditorium", 'Other Auditorium', 'LT-101', 'LP-101', 'T-105', 'CR-1', 'OAT'])('%s excludes extra CC', async venue => {
 await sendVenueEmail({ data: { roomNo: venue } });
 expect(sendMail.mock.lastCall[0].cc).not.toContain(extra);
});
test.each(['Main Auditorium', 'TAN Auditorium', "Dean's Auditorium", 'C-Hall'])('%s preserves Admin Officer', async venue => {
 await sendVenueEmail({ data: { roomNo: venue } });
 expect(sendMail.mock.lastCall[0].cc).toContain('adminofficer@thapar.edu');
});
test.each(['approved', 'enquiry_received', 'cancelled'])('%s deduplicates CC', async type => {
 await sendVenueEmail({ type, societyEmail: extra, data: { roomNo: 'C-Hall' } });
 expect(sendMail.mock.lastCall[0].cc.filter(x => x === extra)).toHaveLength(1);
});
test('parent hall label still selects C-Hall and keeps existing CC once', async () => {
 await sendVenueEmail({ societyEmail: 'adminofficer@thapar.edu', data: { roomNo: 'C-Hall', hall: 'Auditorium / Halls' } });
 expect(sendMail.mock.lastCall[0].cc).toEqual(['someone@thapar.edu', 'adminofficer@thapar.edu', extra]);
});
test('deduplicates case variants', async () => {
 await sendVenueEmail({ societyEmail: extra.toUpperCase(), data: { roomNo: 'C-Hall' } });
 expect(sendMail.mock.lastCall[0].cc.filter(x => x.toLowerCase() === extra)).toHaveLength(1);
});
