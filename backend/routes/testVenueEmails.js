// backend/testVenueEmails.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables BEFORE importing other modules
dotenv.config();

// Dynamic import to ensure process.env is populated
const {
  sendEnquirySubmittedEmail,
  sendEnquiryRejectedEmail,
  sendEnquiryApprovedEmail,
  sendDirectBookingEmail,
  sendBookingExtendedEmail,
  sendBookingCancelledEmail,
} = await import('../emails/venueEmailService.js');

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URL);
console.log('✅ Connected to MongoDB');

// ===============================
// COMMON TEST EMAIL IDS (PHASE 1)
// ===============================
const TEST_GUEST_EMAIL = 'navjot.sharma@thapar.edu';   // you (safe inbox)
const TEST_SOCIETY_EMAIL = 'itmh@thapar.edu';           // example society

// ===============================
// Test data for DD Office Room
// ===============================
const testEnquiryDD = {
  _id: 'test-enquiry-dd',
  name: 'Test User',
  email: TEST_GUEST_EMAIL,
  contact: '9876543210',
  societyName: 'Creative Computing Society',
  societyEmail: TEST_SOCIETY_EMAIL,
  eventName: 'Tech Workshop',
  hall: 'Academic Block',
  roomNo: 'LT-201', // DD Office room
  checkInDate: '2024-03-15',
  checkInTime: '10:00',
  checkOutDate: '2024-03-15',
  checkOutTime: '12:00',
  description: 'Testing DD Office email flow',
  purpose: 'Workshop',
};

// ===============================
// Test data for DoSA Office Room
// ===============================
const testEnquiryDoSA = {
  ...testEnquiryDD,
  _id: 'test-enquiry-dosa',
  roomNo: 'LP-101', // DoSA Office room
  hall: 'Lecture Pavilion',
};

// ===============================
// Booking object (used in later tests)
// ===============================
const testBooking = {
  _id: 'test-booking-1',
  name: 'Test User',
  email: TEST_GUEST_EMAIL,
  societyName: 'Creative Computing Society',
  societyEmail: TEST_SOCIETY_EMAIL,
  eventName: 'Tech Workshop',
  hall: 'Academic Block',
  roomNo: 'LT-201',
  checkInDate: '2024-03-15',
  checkInTime: '10:00',
  checkOutDate: '2024-03-15',
  checkOutTime: '12:00',
  extensionHistory: [
    {
      originalCheckOutDate: '2024-03-15',
      originalCheckOutTime: '12:00',
      newCheckOutDate: '2024-03-15',
      newCheckOutTime: '14:00',
      remarks: 'Extended for setup',
    },
  ],
  cancellationRemarks: 'Event postponed',
};

// ===============================
// Run tests
// ===============================
async function runEmailTests() {
  console.log('\n🧪 Starting Venue Email Tests (PHASE 1)...\n');

  try {
    console.log('📨 Test 1: Enquiry Received (DD Office – LT-201)');
    await sendEnquirySubmittedEmail(testEnquiryDD);
    console.log('✅ Sent! Check your inbox for email from Queries_studentaffairs@thapar.edu\n');
    await sleep(3000);

    console.log('📨 Test 2: Enquiry Received (DoSA Office)');
    await sendEnquirySubmittedEmail(testEnquiryDoSA);
    console.log('✅ Sent! Check your inbox for email from shabnam.rani@thapar.edu\n');
    await sleep(3000);

    console.log('📨 Test 3: Enquiry Rejected (DD Office)');
    await sendEnquiryRejectedEmail({
      ...testEnquiryDD,
      rejectionReason: 'Room not available',
    });
    console.log('✅ Sent! Check your inbox for email from Queries_studentaffairs@thapar.edu\n');
    await sleep(3000);

    console.log('📨 Test 4: Enquiry Approved (DD Office)');
    await sendEnquiryApprovedEmail(testEnquiryDD, testBooking);
    console.log('✅ Sent! Check your inbox for email from Queries_studentaffairs@thapar.edu\n');
    await sleep(3000);

    console.log('📨 Test 5: Direct Booking (DD Office)');
    await sendDirectBookingEmail(testBooking);
    console.log('✅ Sent! Check your inbox for email from Queries_studentaffairs@thapar.edu\n');
    await sleep(3000);

    console.log('📨 Test 6: Booking Extended (DD Office)');
    await sendBookingExtendedEmail(testBooking);
    console.log('✅ Sent! Check your inbox for email from Queries_studentaffairs@thapar.edu\n');
    await sleep(3000);

    console.log('📨 Test 7: Booking Cancelled (DD Office)');
    await sendBookingCancelledEmail(testBooking);
    console.log('✅ Sent! Check your inbox for email from Queries_studentaffairs@thapar.edu\n');

    console.log('\n✅ All venue email tests completed');
    console.log('📬 Check navjot.sharma@thapar.edu inbox (and spam)\n');

  } catch (error) {
    console.error('❌ Venue email test failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runEmailTests();
