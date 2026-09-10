# Guest Room sharing — backend implementation and verification

## Existing constraints discovered

Direct creation had an exact duplicate-guest guard, but no general server-side room overlap guard. Reporting occupancy was checked by a separate frontend-facing endpoint, not by `markReported`. The legacy extension route used date-only exclusive conflicts, while controller extension paths lacked equivalent availability checks. Checkout always requested cleaning, regardless of remaining occupants.

Bookings, bills, feedback, attachments, balances, guest flags, and audits are already booking-specific. Sharing reuses these structures without combining records. Direct duration, continuous-stay review, blocked-guest protection, ID allocation, and email generation still execute through the existing creation flow.

The approval controller also referenced an obsolete checkout field and wrote an uppercase status rejected by the ExtensionRequest schema. It now reads `requestedCheckout` (with the existing legacy fallback) and writes `approved` so the tested approval path can complete.

## Data model

Booking adds four optional fields; old documents need no migration:

| Field | Type | Purpose |
| --- | --- | --- |
| `sharingGroupId` | indexed ObjectId | Current room-sharing membership |
| `sharedFromBookingId` | ObjectId, Booking reference | Creation history only |
| `sharingCreatedAt` | Date | Sharing creation timestamp |
| `sharingCreatedBy` | ObjectId, User reference | Actor |

Transfer history adds an optional `sharingGroupId` snapshot. A transfer clears current group membership while retaining historical context.

## APIs and authorization

- `POST /api/bookings/:sourceBookingId/share-room`: creates a new independent booking through the direct creation pipeline. The server derives room and group from the source; mismatching supplied room/hostel is rejected. Source must be booked/checked-in and approved. New guest dates, counts, financial input, and documents come from the new request. Source enquiry and bill references are not inherited.
- `GET /api/bookings/:id/sharing-group`: returns `success`, `sharingGroupId`, safe current `booking`, `roomCapacity`, and `members`. Member fields are `_id`, `bookingId`, `guest`, dates/times, status, reporting status, guest count, hostel, and room. No contact data, attachments, or financial details are returned. Terminal members remain visible as history.
- Both endpoints allow the existing operational roles: admin, manager, ADOSA, co-warden, caretaker, and warden. Caretakers/wardens must match the assigned hostel. Role comparison handles the persisted `Warden` spelling.
- Normal `POST /api/bookings` does not trust client sharing metadata or overlap flags. Unrelated overlap is rejected; the existing duplicate response remains idempotent.

## Capacity and interval rules

Use India date/time helpers and current transfer segments, with half-open intervals `[check-in, checkout)`. Only booked and checked-in documents reserve capacity, including booked documents awaiting review. Terminal bookings are excluded.

Reject every overlap outside the authorized group. Shared creation must overlap the selected source or another active group member for a positive duration. Extra days before/after a source stay are permitted only when the full interval remains clear of unrelated reservations and maintenance.

A sweep aggregates guest arrivals/departures at each boundary and checks every positive-duration segment. The test is `occupiedGuests + requestedGuests <= guestCapacity`, not booking count or the sum of non-simultaneous stays. Capacity errors expose `ROOM_SHARING_CAPACITY_EXCEEDED`, capacity, occupied/requested guests, and the conflicting interval. Changes to an existing shared booking's guest count are also checked.

## Operational behavior

- Reporting validates the requested actual interval and physical occupants before changing reporting or early-check-in payment fields. Same-group occupants are allowed only with compatible intervals and capacity. Unrelated occupants still block reporting. Successful reporting marks the room occupied.
- `check-room-occupancy` retains `occupied` and `occupant` conflict fields and adds `sharingAllowed`, `occupants`, `capacity`, `occupiedGuests`, and `requestedGuests`. It derives group permission from the stored `excludeBookingId`, validates its room, and never trusts a client group ID. `occupied: false` means no blocking occupant; `occupants` can still contain permitted shared guests.
- The central cleaning helper checks for any non-terminal checked-in/reported occupant in the room. It returns without creating cleaning work while someone remains. The last departure runs the original cleaning workflow. Manual, early, and automatic checkout all use this helper.
- Extension request, direct extension, approval, and legacy extension paths validate full intervals against maintenance, unrelated bookings, and sharing capacity. Only the selected booking changes. An extension never joins another sharing group.
- Transfer retains ordinary destination exclusivity and transfer history, clears current sharing membership, and requests source cleaning only when the transfer removed an actual occupant. The cleaning helper suppresses cleaning if another occupant remains.
- Cancellation/no-show, balances, defaulter status, bills, feedback, and attachments remain independent. Existing automatic no-show behavior records `cancelled` plus `not_reported`; manual no-show records `no_show`. This existing distinction is preserved.

## Persistence, audit, and email

Creation saves the new booking before conditionally assigning sharing metadata to an ungrouped source. If source assignment fails, the child is deleted and any metadata from that attempted assignment is conditionally removed. Failure before child persistence never converts the source. Existing groups retain their identity after any member leaves.

An auxiliary `RoomBookingLock` collection uses unique room keys to serialize the covered creation, reporting, extension, manual checkout, detail-update, and transfer routes. Responses are released after unlocking. Busy rooms return `409 ROOM_UPDATE_IN_PROGRESS`; callers may retry. The lock intentionally has no automatic expiry: a crashed process must not allow a second writer to bypass capacity checks. After a process crash or lock-release database failure, an operator must verify the writer has stopped and recover the affected stale lock. This is application rollback, not a MongoDB transaction; process-crash recovery and legacy writers outside these wrapped routes are not a distributed transaction guarantee.

Successful sharing writes one `ROOM_SHARED_BOOKING_CREATED` business event with source/new internal and public IDs, group, room, dates, counts, capacity, and actor context. Existing failed-request tracing handles rejections without duplicate business events. No attachment URLs or request bodies are included. Normal booking email templates use the new booking's public ID and its own data; review emails are queued only after successful persistence.

## Files changed by this task

- `controllers/bookingController.js`
- `models/Booking.js`
- `routes/bookingRoutes.js`
- `utils/roomCleaningState.js`
- `utils/roomSharing.js` (new)
- `middleware/roomBookingLock.js` (new)
- `tests/roomSharing.test.js` (new)
- `tests/helpers/noEmail.js` (new; prevents SMTP delivery in regression runs)
- `tests/guestAddressProof.test.js` (valid room fixture and isolated occupancy)
- `tests/roomBlockBooking.test.js` (isolated duration fixture)
- `docs/share-room-backend.md` (this report)

## Verification

Final combined Jest run: **150 passed, 1 failed, 151 total** across **12 passed suites and 1 failed suite**. The new sharing suite has **52 passing tests**, covering creation, independence, rollback, concurrency, capacity, reporting, checkout/cleaning, automatic paths, extension and approval, maintenance, duration/rebooking, flags, IDs, authorization, read responses, audit, emails, transfer, and guest-count edits.

Regression suites: booking transfer/controller, duration, IDs, maintenance/direct booking, address-proof/reporting, audit, billing dates, system settings, integration, guest feedback, and profile-picture persistence.

The sole failure is pre-existing and unrelated: `tests/billingDates.test.js`, “keeps the original stay window when the booking balance is not yet extension-only,” expects `booking` but receives `extension`. Both that test file and `utils/billingDates.js` are unchanged from HEAD. No billing-date fix was made.

Run command (from `backend`):

```powershell
npm test -- --runInBand --silent --setupFilesAfterEnv ./tests/helpers/noEmail.js --runTestsByPath tests/roomSharing.test.js tests/bookingTransferController.test.js tests/bookingTransfer.test.js tests/bookingDuration.test.js tests/bookingId.test.js tests/roomBlockBooking.test.js tests/guestAddressProof.test.js tests/auditLogs.test.js tests/billingDates.test.js tests/systemSettings.test.js tests/integration.test.js tests/guestFeedback.test.js tests/guestProfilePicturePersistence.test.js
```

All 10 changed/new backend JavaScript files pass `node --check`. `git diff --check` passes. No commit or push was performed. Existing and concurrently appearing work outside this task, including frontend changes, was preserved.
