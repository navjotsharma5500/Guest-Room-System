import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set NODE_ENV to test BEFORE importing app to prevent server startup and cron jobs
process.env.NODE_ENV = 'test';

// Dynamic import to ensure env var is set first
const app = (await import('../index.js')).default;
const Enquiry = (await import('../models/Enquiry.js')).default;
const Booking = (await import('../models/Booking.js')).default;
const Hostel = (await import('../models/Hostel.js')).default;
const User = (await import('../models/User.js')).default;

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const IMAGEKIT_URL = 'https://ik.imagekit.io/7khjnlfow/GuestPicture/9876543210_google_profile.jpg';

describe('Guest profile photo persistence (Enquiry -> Booking)', () => {
  let adminToken;

  it('should register and login as admin', async () => {
    await User.create({
      name: 'Admin User',
      email: 'photo-admin@test.com',
      password: 'password123',
      role: 'admin',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'photo-admin@test.com',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
  });

  it('should seed a hostel for approval', async () => {
    await Hostel.create({
      name: 'Photo Test Hostel',
      code: 'PTH',
      caretakerEmail: 'caretaker@test.com',
      wardenEmail: 'warden@test.com',
      rooms: [{ roomNo: '501' }, { roomNo: '502' }],
    });
  });

  // 1. Enquiry schema accepts profilePicture
  it('Enquiry schema accepts and persists profilePicture', async () => {
    const enquiry = await Enquiry.create({
      name: 'Schema Test Guest',
      email: 'schema-guest@test.com',
      contact: '9000000000',
      from: new Date(),
      to: new Date(Date.now() + 86400000),
      profilePicture: IMAGEKIT_URL,
    });

    const saved = await Enquiry.findById(enquiry._id).lean();
    expect(saved.profilePicture).toBe(IMAGEKIT_URL);
  });

  // 4 (part). Empty profilePicture remains valid/backward-compatible
  it('Enquiry remains valid when profilePicture is omitted', async () => {
    const enquiry = await Enquiry.create({
      name: 'No Photo Guest',
      email: 'nophoto-guest@test.com',
      contact: '9000000001',
      from: new Date(),
      to: new Date(Date.now() + 86400000),
    });

    expect(enquiry.profilePicture).toBe('');
  });

  // 2. createEnquiry persists incoming profilePicture
  it('POST /api/enquiry/create persists the submitted profilePicture', async () => {
    const res = await request(app)
      .post('/api/enquiry/create')
      .send({
        guestName: 'Create Route Guest',
        guestEmail: 'create-route-guest@test.com',
        guestPhone: '9876543210',
        message: 'Business visit',
        fullData: {
          rollno: '',
          department: '',
          gender: 'Male',
          from: new Date().toISOString(),
          to: new Date(Date.now() + 86400000).toISOString(),
          checkInTime: '10:00',
          checkOutTime: '10:00',
          guests: 1,
          females: 0,
          males: 1,
          state: 'Punjab',
          city: 'Patiala',
          reference: '',
          files: [],
          profilePicture: IMAGEKIT_URL,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.enquiry.profilePicture).toBe(IMAGEKIT_URL);

    const saved = await Enquiry.findById(res.body.enquiry._id).lean();
    expect(saved.profilePicture).toBe(IMAGEKIT_URL);
  });

  // 4 (part). createEnquiry backward-compatible when profilePicture is absent
  it('POST /api/enquiry/create defaults profilePicture to empty string when absent', async () => {
    const res = await request(app)
      .post('/api/enquiry/create')
      .send({
        guestName: 'No Photo Route Guest',
        guestEmail: 'nophoto-route-guest@test.com',
        guestPhone: '9876500000',
        message: 'Business visit',
        fullData: {
          from: new Date().toISOString(),
          to: new Date(Date.now() + 86400000).toISOString(),
          checkInTime: '10:00',
          checkOutTime: '10:00',
          guests: 1,
          females: 0,
          males: 1,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.enquiry.profilePicture).toBe('');
  });

  // 3. approveEnquiry copies Enquiry.profilePicture -> Booking.profilePicture
  it('PUT /api/enquiry/:id/approved copies profilePicture onto the created booking', async () => {
    const enquiry = await Enquiry.create({
      name: 'Approve Flow Guest',
      email: 'approve-guest@test.com',
      contact: '9111111111',
      from: new Date(),
      to: new Date(Date.now() + 86400000),
      profilePicture: IMAGEKIT_URL,
    });

    const res = await request(app)
      .put(`/api/enquiry/${enquiry._id}/approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostel: 'Photo Test Hostel',
        roomNo: '501',
        paymentType: 'Free',
        freeRemarks: 'Test approval',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.profilePicture).toBe(IMAGEKIT_URL);

    const savedBooking = await Booking.findById(res.body.booking._id).lean();
    expect(savedBooking.profilePicture).toBe(IMAGEKIT_URL);
  });

  // 4. Empty profilePicture stays backward-compatible through the approval flow too
  it('PUT /api/enquiry/:id/approved leaves booking.profilePicture empty when the enquiry has none', async () => {
    const enquiry = await Enquiry.create({
      name: 'Approve No Photo Guest',
      email: 'approve-nophoto-guest@test.com',
      contact: '9222222222',
      from: new Date(),
      to: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .put(`/api/enquiry/${enquiry._id}/approved`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostel: 'Photo Test Hostel',
        roomNo: '502',
        paymentType: 'Free',
        freeRemarks: 'Test approval',
      });

    expect(res.status).toBe(200);
    expect(res.body.booking.profilePicture).toBe('');
  });
});
