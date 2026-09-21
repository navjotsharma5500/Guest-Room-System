import { jest } from '@jest/globals';
const ddSend = jest.fn(async () => ({}));
const dosaSend = jest.fn(async () => ({}));
jest.unstable_mockModule('../emails/venue/transport/ddTransport.js', () => ({ default: { sendMail: ddSend } }));
jest.unstable_mockModule('../emails/venue/transport/dosaTransport.js', () => ({ default: { sendMail: dosaSend } }));
jest.unstable_mockModule('../emails/venue/venueEmailLogger.js', () => ({ logEmail: jest.fn() }));
const { getEmailAuthorityByRoom } = await import('../emails/venue/venueEmailDispatcher.js');
const { sendVenueEmail } = await import('../emails/venue/index.js');
const { VENUE_MANDATORY_BCC } = await import('../utils/venueAccessPolicy.js');
const { templates } = await import('../emails/venue/templates/dosa/index.js');
const types = Object.keys(templates);
beforeEach(() => { jest.clearAllMocks(); });
const dataFor = roomNo => ({ roomNo, name: 'Test Guest', extensionHistory: [{}] });
test.each(types)('TAN %s uses DoSA and preserves conditional recipients', async type => {
  expect(getEmailAuthorityByRoom('TAN Auditorium')).toMatchObject({ key: 'DOSA', officeName: 'DoSA Office' });
  await sendVenueEmail({ type, roomNo: 'TAN Auditorium', guestEmail: 'guest@test.com', societyEmail: 'society@test.com', data: dataFor('TAN Auditorium') });
  expect(ddSend).not.toHaveBeenCalled();
  expect(dosaSend).toHaveBeenCalledTimes(1);
  const mail = dosaSend.mock.calls[0][0];
  expect(mail.html).toContain('DoSA Office');
  expect(mail.html).not.toMatch(/ProVC Office|DD Office/);
  expect(mail.cc).toEqual(expect.arrayContaining(['adminofficer@thapar.edu', 'sukhdevsingh@thapar.edu', 'society@test.com']));
  expect(mail.bcc).toEqual(process.env.VENUE_EMAIL_BCC === 'false' ? [] : VENUE_MANDATORY_BCC);
});
test.each(['LT-201', 'LT-202'])('%s retains DD templates for every lifecycle email', async roomNo => {
  expect(getEmailAuthorityByRoom(roomNo).key).toBe('DD');
  for (const type of types) {
    await sendVenueEmail({ type, roomNo, guestEmail: 'guest@test.com', data: dataFor(roomNo) });
    expect(ddSend.mock.lastCall[0].html).toContain('ProVC Office');
  }
  expect(dosaSend).not.toHaveBeenCalled();
});
