# Society Portal final-approval booking API v1

Venue Booking owns the venue catalog and booking calendar. Society Portal owns
societies, events, and approval state. Only Society Portal's server may call this
endpoint, after final DoSA approval. The write credential authenticates that
trusted caller; Venue Booking does not query or independently verify Society
Portal's approval workflow. No booking is created by earlier approval stages.

## Authentication and deployment

`POST /api/integration/society-events/book`

Required header: `x-society-portal-venue-key`, matching the server environment
variable `VENUE_SOCIETY_PORTAL_WRITE_API_KEY`. Configure a separate secret in
both backends. It must differ from `VENUE_API_KEY` and every `VENUE_API_KEYS`
value. Missing header returns 401; wrong key returns 403; an absent or reused
configured secret disables writes with 503. Secrets are never logged by this
integration. No real credential is shipped in the repository.

MongoDB must support transactions (replica set or sharded cluster). The endpoint
checks topology and ensures the batch idempotency index exists before booking.
It fails closed with `503 TRANSACTIONS_REQUIRED` and zero booking/batch/lock
writes on standalone MongoDB. There is deliberately no non-atomic insert/cleanup
fallback: process termination during such a fallback could leave partial days
visible on the existing calendar. The configured deployment's topology was not
verifiable locally; tests use an isolated replica set and standalone server.

## Request

```json
{
  "sourceSystem": "SOCIETY_PORTAL",
  "eventId": "event-internal-904",
  "eventPublicId": "EA904",
  "idempotencyKey": "society-portal:event:EA904:final-approval",
  "eventName": "Annual Theatre Night",
  "society": { "societyId": "society-1", "name": "Music and Dramatic Society" },
  "requester": { "name": "Event Requester", "email": "requester@thapar.edu" },
  "venue": {
    "venueKey": "rooms:lecture-theatre:lt-202",
    "mainTabId": "rooms",
    "sectionId": "lecture-theatre",
    "roomId": "lt-202"
  },
  "schedule": [
    { "date": "2026-10-15", "startTime": "10:00", "endTime": "16:00" },
    { "date": "2026-10-16", "startTime": "10:00", "endTime": "14:00" }
  ]
}
```

All shown fields are required; unknown fields are rejected. IDs use ASCII
letters, digits, `.`, `_`, `:`, or `-`, beginning with a letter/digit. Individual
venue IDs cannot contain `:`. IDs and names are limited to 200 characters,
idempotency keys to 256, email to 254. Requester email must be at `thapar.edu`,
matching the existing booking model. Text is trimmed; email is lowercased.

Supply 1–366 schedule days, each with a distinct date. Dates must be valid
`YYYY-MM-DD`; times must be `HH:MM` in 24-hour format with `endTime > startTime`.
Overnight slots and multiple entries for the same day are rejected. Days are
sorted before hashing, so input order does not change the logical request.
Malformed requests return `400 INVALID_REQUEST` before writes.

## Resolution and conflicts

All four venue identity fields must agree. The selected tab, its section, and
that section's room must exist in stored VenueConfig. Effective enabled state
requires all three levels enabled. Unknown venues return `404 VENUE_NOT_FOUND`;
disabled venues return `409 VENUE_DISABLED`. Display names come exclusively
from current VenueConfig. The read API's default-config fallback cannot create
a booking when no stored venue config exists.

Immediately before insertion, all days are checked against potentially
overlapping `booked` and `checked_in` records, using the same alias-aware
matching and daily-slot overlap helper as the read integration. Legacy old
room names and section labels still block after renames. Cancelled, checked-out,
and completed bookings do not block. Any conflict aborts the whole transaction:

```json
{
  "success": false,
  "code": "VENUE_NO_LONGER_AVAILABLE",
  "message": "The selected venue is no longer available for the Event schedule."
}
```

Conflict responses contain no details of the conflicting booking.

## Atomicity, concurrency, and retries

One VenueBooking is inserted per exact schedule day, with `status: booked` and
`bookingFor: student_calendar`. All documents are validated before insertion.
Bookings and their result ledger commit in one majority-write transaction;
validation failures, partial inserts, batch-record failures, and process failure
before commit cannot leave committed partial bookings.

The batch document `_id` is SHA-256 of `[sourceSystem, eventId]`, enforced by
MongoDB's unique `_id` index. A second unique index prevents idempotency-key
reuse across events. A hash of the normalized complete request detects changes.
The ledger is permanent: even after manual cancellation or completion, replay
returns the original creation receipt and does not create a replacement batch.
Changes to an existing event/key return `409 IDEMPOTENCY_MISMATCH`; this endpoint
does not edit or cancel bookings. The receipt describes the originally committed
slots, not any subsequent manual booking edits.

A transaction writes a persistent per-venue lock row before reading config or
bookings. Concurrent integration requests for that venue encounter a write
conflict and retry against the committed calendar. Event/key uniqueness also
protects concurrent requests choosing different venues. Lock rows have no
lease or in-memory ownership and cannot become stuck after process restart.

This serialization covers this integration endpoint. Existing manual booking
and enquiry writers do not take this lock; their existing check-then-write race
semantics have not been changed. Global exclusion against simultaneous manual
writes would require a separate change across those writers.

HTTP 201 means a new batch committed. Exact replay returns HTTP 200 with the
same persisted receipt and `idempotentReplay: true`, even after venue rename or
disable. Network loss after commit is recovered by retrying the same request.
Unexpected database failures return a safe retryable 503; retry with identical
event identity, idempotency key, and payload. Never invent a new event ID to retry.

```json
{
  "success": true,
  "sourceSystem": "SOCIETY_PORTAL",
  "eventId": "event-internal-904",
  "eventPublicId": "EA904",
  "venueKey": "rooms:lecture-theatre:lt-202",
  "integrationBatchId": "<deterministic batch hash>",
  "bookings": [
    { "bookingId": "<booking id 1>", "date": "2026-10-15", "startTime": "10:00", "endTime": "16:00" },
    { "bookingId": "<booking id 2>", "date": "2026-10-16", "startTime": "10:00", "endTime": "14:00" }
  ],
  "idempotentReplay": false
}
```

## Dashboard and side effects

Records use normal authoritative hall/room labels, requester, event, society,
dates, times, stable venue IDs, and existing student-calendar classification.
Optional provenance fields are `sourceSystem`, `sourceEventId`,
`sourceEventPublicId`, `sourceSocietyId`, `integrationBatchId`, and
`integrationIdempotencyKey`. Historical/manual records need none of these.

The manual booking controller sends an email per booking; this integration does
not call that controller or email utilities and sends no new email. No fake
attachments or requester user accounts are created. After a new commit, one
existing `venueBookingCreated` event is emitted with safe batch/booking receipt
fields. Existing dashboard and calendar listeners refetch. Socket failure does
not fail the booking; normal polling remains available. Replays emit nothing.

Existing read auth and responses remain unchanged:

- `GET /api/integration/venue-catalog`
- `GET /api/integration/venues`
- `POST /api/integration/book-room` still returns 410 with valid read auth.

The read key grants no booking write authority. No Society Portal or Night
Portal files, manual booking/enquiry semantics, or VenueConfig CRUD changed.

## Verification

Run from `backend`:

```text
npm test -- --runInBand --roots tests --runTestsByPath tests/societyEventBooking.test.js tests/venueIntegration.test.js tests/venueSectionRenameSafety.test.js tests/venueRoomRenameSafety.test.js --silent
```

Verified: 106 tests pass across these four suites, including concurrent duplicate
requests, competing events, cross-venue event identity races, partial-insert
rollback, batch-ledger rollback, standalone rejection, real rename handlers,
legacy conflicts, read compatibility, and the retired endpoint's 410 response.
