# Admin bill standalone recovery

Create New Bill retains withTransaction on replica sets/mongos. Standalone Mongo uses AdminBillOperation; existing incomplete operations continue through recovery even after a topology upgrade.

The operation stores an immutable normalized request hash (booking, admin, amount, trimmed remarks, ordered proof URLs), original booking snapshot, conditional financial predicate, exact financial update, bill snapshot and completed response. Unique idempotencyKey and Bill.adminBillOperationId (sparse) indexes are explicitly ensured before standalone payment writes, including deployments with autoIndex disabled. Writes use majority acknowledgement and journaling. An index creation failure fails safely before payment application.

Recovery states are PENDING -> BOOKING_UPDATED -> BILL_CREATED -> COMPLETED. The critical duplicate barrier is Booking.adminBillOperations: the operation ID is added atomically with the financial update, conditioned on the original financial/metadata snapshot. This permanent marker closes the crash window BEFORE BOOKING_UPDATED is persisted. Never prune operation records or booking markers without an archival/idempotency design.

If the conditional update loses a race, recovery checks the marker. Present means continue without another payment. Absent means 409 BOOKING_CHANGED and no payment from this operation; refresh and intentionally start a new operation. The old key never recalculates a payment against new totals. This also prevents stale pending operations from overwriting intervening payments/waivers.

Bills use the original snapshot, deterministic ADM-<operation ID> numbers and a unique operation link. Duplicate insert races reuse the winning bill. Existing saveBillPDF handles rendering, ImageKit and local fallback; an unfinished PDF retries on the same bill. A completed replay returns the stored original response, even after later payments. Legacy scoped bill IDs remain replayable.

Completion is conditional: one request emits the audit/socket notifications. Like the existing transaction path, a process crash after completion and before notification can omit that notification; financial recovery does not depend on delivery. No background retry worker is introduced: recovery is driven by the same Idempotency-Key request.

Validation: actual MongoMemoryServer standalone suite plus MongoMemoryReplSet transaction suite. Covers crashes before booking write, after booking write before status, after BOOKING_UPDATED before bill insert, after bill insert before status, before completion, and PDF interruption; duplicate/parallel requests, changed payloads, stale snapshots, discount, statuses, authorization and original-response replay.
