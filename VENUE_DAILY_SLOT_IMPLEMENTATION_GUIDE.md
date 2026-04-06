# VENUE BOOKING SYSTEM: DAILY TIME SLOT CONVERSION - COMPLETE IMPLEMENTATION GUIDE

## ✅ BACKEND COMPLETED (ALL FILES READY)

### Fixed Files:
1. ✅ `/frontend/src/utils/dateUtils.js` - isDailySlotOverlapping() added
2. ✅ `/backend/utils/venueConflictChecker.js` - Daily slot logic implemented
3. ✅ `/backend/controllers/VenueBookingController.js` - Uses isDailySlotOverlapping
4. ✅ `/backend/controllers/venueEnquiryController.js` - Uses isDailySlotOverlapping
5. ✅ `/frontend/src/hooks/useVenueVacancyCheck.js` - Daily slot overlap check

## 📋 FRONTEND FILES - READY FOR REPLACEMENT

### Complete files created and ready:
- ✅ `/frontend/src/components/VenueBookings/VenueBookingModal_NEW.jsx` (ready to use)
- ✅ All other files need updates per instructions below

## 🔧 HOW TO COMPLETE THE IMPLEMENTATION

### Option A: Automated Replacement (Recommended for this task)
Replace all venue-related files with versions that:
1. Use `isDailySlotOverlapping()` for overlap checks
2. Split date/time UI into separate sections
3. Display "Daily HH:MM–HH:MM · Date Range" format
4. Update "Live" badge logic to check both dates AND times

### Option B: Manual Key Changes

**Every component needs:**
```javascript
// Add import
import { isDailySlotOverlapping, formatTimeWithAMPM } from "../../utils/dateUtils";

// Replace overlap checks
// OLD: isDateTimeRangeOverlapping(checkIn, checkOut, null, null, ...)
// NEW: isDailySlotOverlapping(checkIn, checkOut, dailyStart, dailyEnd, ...)

// Update displays
// OLD: "Check-in: 05 Apr 2026 10:00 | Check-out: 07 Apr 2026 16:00"
// NEW: "Daily: 10:00–16:00  ·  05 Apr – 07 Apr 2026"
```

## 🎯 UI CHANGES BY COMPONENT

### VenueBookingModal.jsx & VenueGuestEnquiryPage.jsx
**Step 2 - Split into two sections:**
```
📅 BOOKING DATES  [====form====]
⏰ DAILY TIME     [====form====]
Summary: Daily 10:00–16:00 · 5 Apr–7 Apr (3d)
```

### VenueFilterModal.jsx
Add fields:
- `dailyStart` (time input)
- `dailyEnd` (time input)
Pass both to `handleFilterSubmit()`

### VenueBookingsPortal.jsx - filterActiveBookingsFromVenueData()
```javascript
// Replace the overlap check with:
const hasOverlap = isDailySlotOverlapping(
  bookingStartDate,
  bookingEndDate,
  bookingDailyStartTime,
  bookingDailyEndTime,
  b.checkInDate,
  b.checkOutDate,
  b.checkInTime,
  b.checkOutTime
);
```

### VenueGrid.jsx
Display: "Daily: 10:00–16:00" instead of continuous range

### VenueUpcomingBookings.jsx
**isLive check:**
```javascript
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const bookingStart = new Date(booking.checkInDate);
const bookingEnd = new Date(booking.checkOutDate);

const isDateActive = today >= bookingStart && today <= bookingEnd;

if (isDateActive) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = booking.checkInTime.split(':').map(Number);
  const [endH, endM] = booking.checkOutTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
```

### VenueCalendarPage.jsx
**Active tab** - Booking is active on date if:
- `today ∈ [bookingStartDate, bookingEndDate]` AND
- `currentTime ∈ [dailyStartTime, dailyEndTime]`

**Upcoming tab** - Show if:
- Booking date range includes today
- But current time hasn't reached dailyStartTime yet

### VenueBookingDetailsModal.jsx
```javascript
// Display format:
Check-in Date: "05 Apr 2026"
Check-out Date: "07 Apr 2026"  
Daily Time: "10:00 AM – 04:00 PM (each day)"
```

## 🔄 DATA TRANSFORMATION

### Backward Compatibility:
```javascript
// Form data with both old and new names:
{
  // New names (daily slot model)
  bookingStartDate: "2026-04-05",
  bookingEndDate: "2026-04-07",
  dailyStartTime: "10:00",
  dailyEndTime: "16:00",
  
  // Backward compat aliases (auto-filled)
  checkInDate: "2026-04-05",    // = bookingStartDate
  checkOutDate: "2026-04-07",   // = bookingEndDate
  checkInTime: "10:00",          // = dailyStartTime
  checkOutTime: "16:00",         // = dailyEndTime
}
```

## ✨ SAFETY CHECKLIST

- [x] Backend overlap logic updated (isDailySlotOverlapping)
- [x] All venue controllers updated
- [x] dateUtils has new function
- [x] Backward compatibility maintained (old field names work)
- [ ] All frontend components have new overlap logic
- [ ] All frontend displays use new format  
- [ ] Live badge logic updated in all components
- [ ] "Daily time slot" label added to all forms
- [ ] Summary chips show "Daily HH:MM–HH:MM · Date" format
- [ ] Date range and time fields properly separated

## 🚀 NEXT STEPS

1. Replace VenueBookingModal.jsx with content from VenueBookingModal_NEW.jsx
2. Apply similar updates to VenueGuestEnquiryPage.jsx, VenueFilterModal.jsx, etc.
3. Update VenueBookingsPortal.jsx filterActiveBookingsFromVenueData() function
4. Update all display components (Grid, UpcomingBookings, CalendarPage, etc.)
5. Test with existing bookings (backward compat must work)
6. Verify overlap logic prevents bookings outside daily time windows

## 📞 REFERENCE

**Overlap algorithm (verify in all checks):**
```
conflict = dateOverlap && timeOverlap
         = (newStart ≤ exEnd && newEnd ≥ exStart) &&
           (newDailyStart < exDailyEnd && newDailyEnd > exDailyStart)
```
