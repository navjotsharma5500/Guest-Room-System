import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set NODE_ENV to test BEFORE importing app to prevent server startup and cron jobs
process.env.NODE_ENV = 'test';

// Dynamic import to ensure env var is set first
const app = (await import('../index.js')).default;

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

describe('Integration Tests - Guest Room System', () => {

    let adminToken;
    let coWardenToken;
    let adosaToken;
    let bookingId;
    let extensionRequestId;

    // 1. Setup Roles & Users
    it('should register and login as admin', async () => {
        const User = (await import('../models/User.js')).default;
        await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
        });

        // Assuming register auto-logs in or we need to login
        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'admin@test.com',
            password: 'password123'
        });
        adminToken = loginRes.body.token;
        expect(loginRes.status).toBe(200);
    });

    it('should register and login as co_warden', async () => {
         // Create user directly via admin if register is restricted, or use register endpoint if open
         // For test simplicity assuming register endpoint works or we create via model
         const User = (await import('../models/User.js')).default;
         await User.create({
             name: 'Co Warden',
             email: 'cowarden@test.com',
             password: 'password123',
             role: 'co_warden'
         });

         const loginRes = await request(app).post('/api/auth/login').send({
            email: 'cowarden@test.com',
            password: 'password123'
        });
        coWardenToken = loginRes.body.token;
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.user.role).toBe('co_warden');
    });

    it('should register and login as adosa', async () => {
        const User = (await import('../models/User.js')).default;
         await User.create({
             name: 'ADOSA User',
             email: 'adosa@test.com',
             password: 'password123',
             role: 'adosa'
         });

         const loginRes = await request(app).post('/api/auth/login').send({
            email: 'adosa@test.com',
            password: 'password123'
        });
        adosaToken = loginRes.body.token;
        expect(loginRes.status).toBe(200);
    });

    // 1.5 Seed Hostels
    it('should seed hostels', async () => {
        const Hostel = (await import('../models/Hostel.js')).default;
        
        await Hostel.create({
            name: 'Hostel A',
            code: 'HA',
            caretakerEmail: 'caretaker@test.com',
            wardenEmail: 'warden@test.com',
            rooms: [{ roomNo: '101' }]
        });
        
        await Hostel.create({
            name: 'Hostel B',
            code: 'HB',
            caretakerEmail: 'caretaker@test.com',
            wardenEmail: 'warden@test.com',
            rooms: [{ roomNo: '202' }]
        });
        
        await Hostel.create({
            name: 'Hostel C',
            code: 'HC',
            caretakerEmail: 'caretaker@test.com',
            wardenEmail: 'warden@test.com',
            rooms: [{ roomNo: '303' }]
        });
    });

    // 2. Create Booking
    it('should create a booking', async () => {
        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                guest: 'Test Guest',
                email: 'guest@test.com',
                contact: '1234567890',
                hostel: 'Hostel A',
                roomNo: '101',
                from: new Date(),
                to: new Date(new Date().setDate(new Date().getDate() + 2)), // 2 days stay
                paymentType: 'Paid',
                totalAmount: 1000
            });
        
        expect(res.status).toBe(201);
        bookingId = res.body.booking._id;
    });

    // 3. Extension Request Logic (Co-Warden <= 2 days)
    it('should allow extension request <= 2 days', async () => {
        const oldCheckout = new Date(new Date().setDate(new Date().getDate() + 2));
        const newCheckout = new Date(new Date().setDate(new Date().getDate() + 4)); // +2 days

        const res = await request(app)
            .post('/api/extensions')
            .set('Authorization', `Bearer ${adminToken}`) // Any authorized user can request? Usually caretaker/admin
            .send({
                bookingId,
                requestedCheckout: newCheckout,
                remarks: 'Need more time'
            });

        expect(res.status).toBe(201);
        expect(res.body.extensionRequest.requiredApprovalLevel).toBe('co_warden');
        extensionRequestId = res.body.extensionRequest._id;
    });

    // 4. Co-Warden Approval
    it('should allow co_warden to approve <= 2 days extension', async () => {
        const res = await request(app)
            .put(`/api/extensions/${extensionRequestId}/approve`)
            .set('Authorization', `Bearer ${coWardenToken}`)
            .send({
                approvedCheckout: new Date(new Date().setDate(new Date().getDate() + 4)),
                approvedAmount: 500
            });

        expect(res.status).toBe(200);
        expect(res.body.request.status).toBe('approved');
    });

    // 5. Extension Request Logic (ADOSA > 2 days)
    it('should require ADOSA approval for > 2 days', async () => {
         // Create another booking or update existing one? Let's create new one to be clean
         const resBooking = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                guest: 'Long Stay Guest',
                email: 'long@test.com',
                contact: '9876543210',
                hostel: 'Hostel B',
                roomNo: '202',
                from: new Date(),
                to: new Date(new Date().setDate(new Date().getDate() + 2)),
                paymentType: 'Paid',
                totalAmount: 1000
            });
         const longBookingId = resBooking.body.booking._id;

         const newCheckout = new Date(new Date().setDate(new Date().getDate() + 10)); // +8 days

         const res = await request(app)
            .post('/api/extensions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                bookingId: longBookingId,
                requestedCheckout: newCheckout,
                remarks: 'Long extension'
            });

        expect(res.status).toBe(201);
        expect(res.body.extensionRequest.requiredApprovalLevel).toBe('adosa');
        
        // Co-Warden should NOT be able to approve
        const resFail = await request(app)
            .put(`/api/extensions/${res.body.extensionRequest._id}/approve`)
            .set('Authorization', `Bearer ${coWardenToken}`)
            .send({ approvedCheckout: newCheckout });
            
        expect(resFail.status).toBe(403);

        // ADOSA should be able to approve
        const resSuccess = await request(app)
            .put(`/api/extensions/${res.body.extensionRequest._id}/approve`)
            .set('Authorization', `Bearer ${adosaToken}`)
            .send({ approvedCheckout: newCheckout });
            
        expect(resSuccess.status).toBe(200);
    });

    // 6. Cancel Flow Logic
    it('should cancel booking and update bill status', async () => {
        // Create a booking with bill
        const resBooking = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                guest: 'Cancel Guest',
                email: 'cancel@test.com',
                contact: '5555555555',
                hostel: 'Hostel C',
                roomNo: '303',
                from: new Date(),
                to: new Date(),
                paymentType: 'Paid',
                totalAmount: 1000
            });
        const cancelBookingId = resBooking.body.booking._id;

        // Mock bill creation (usually happens on booking or checkout, ensure bill exists)
        const Bill = (await import('../models/Bill.js')).default;
        await Bill.create({
            bookingId: cancelBookingId,
            billNumber: 'BILL-TEST-001',
            totalAmount: 1000,
            paymentType: 'PARTIAL',
            balanceAfterPayment: 500
        });

        const resCancel = await request(app)
            .put(`/api/bookings/${cancelBookingId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                remarks: 'Cancelled by test',
                attachments: ['http://test.com/consent.pdf']
            });

        expect(resCancel.status).toBe(200);
        
        // Check Bill Status
        const updatedBill = await Bill.findOne({ bookingId: cancelBookingId });
        expect(updatedBill.status).toBe('cancelled');
        expect(updatedBill.paymentType).toBe('CANCELLED');
        expect(updatedBill.balanceAfterPayment).toBe(0);
    });

});
