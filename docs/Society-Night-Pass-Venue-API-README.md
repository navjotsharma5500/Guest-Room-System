# Society Night Pass — Private Venue Integration API

## Purpose

This private API lets the Society Night Pass backend check venue availability and submit a venue booking request to Campus Connect. Its only purpose is to prevent venue double-booking while preserving the existing Venue Booking Dashboard approval process.

`POST /api/integration/book-room` creates a **pending Venue Enquiry**. It does not create or confirm a Venue Booking. A Venue Booking is created only if an authorized Venue Booking Dashboard user approves the enquiry through the existing workflow.

## Base URL

```text
https://campusconnect.thapar.edu
```

All requests must use HTTPS.

## Architecture

```text
Society Night Pass frontend
→ Society Night Pass backend
→ x-venue-api-key
→ Venue Booking backend
```

The Society Night Pass frontend must call its own backend. It must never call these integration APIs directly from React or any other browser code.

## Authentication

Include the private API key in every request:

```http
x-venue-api-key: <secret>
```

The credential is shared privately between the two backends and stored in backend environment variables only.

Society Night Pass backend `.env`:

```dotenv
VENUE_API_BASE_URL=https://campusconnect.thapar.edu
VENUE_API_KEY=<secret-shared-securely>
```

Never:

- Put the real key in React source or frontend environment variables.
- Prefix it with `REACT_APP_`, `VITE_`, or another frontend-exposed prefix.
- Commit it to Git or include it in documentation.
- Send it in a URL or query parameter.
- Print it in application logs, screenshots, analytics, or error reports.
- Return it to a browser in an API response.

If the key may have been exposed, replace it in both backends immediately. The Venue Booking backend also supports comma-separated active keys through `VENUE_API_KEYS` for controlled key rotation.

## Date and time conventions

| Value | Format | Example |
|---|---|---|
| Date | `YYYY-MM-DD` | `2026-08-05` |
| Time | `HH:mm` (24-hour) | `18:00` |
| Timezone | `Asia/Kolkata` | IST |

`fromDate` and `toDate` are inclusive. For a multi-day request, `startTime` to `endTime` represents the daily venue slot on every included date. The end time must be later than the start time; overnight slots are not accepted.

## 1. Check venue availability

```http
GET /api/integration/venues
```

### Query parameters

| Parameter | Required | Description |
|---|---:|---|
| `fromDate` | Yes | First requested date in `YYYY-MM-DD` format |
| `toDate` | Yes | Last requested date in `YYYY-MM-DD` format |
| `startTime` | Yes | Daily start time in `HH:mm` format |
| `endTime` | Yes | Daily end time in `HH:mm` format |

The response includes every configured venue. A disabled venue or a venue conflicting with an active booking is returned with `available: false`.

### Available response

```json
[
  {
    "venueName": "COS Hall",
    "available": true
  },
  {
    "venueName": "Main Auditorium",
    "available": false
  }
]
```

### Node.js `fetch` example

This code belongs in the Society Night Pass backend:

```js
export async function getVenueAvailability({ fromDate, toDate, startTime, endTime }) {
  const query = new URLSearchParams({ fromDate, toDate, startTime, endTime });

  const response = await fetch(
    `${process.env.VENUE_API_BASE_URL}/api/integration/venues?${query}`,
    {
      headers: {
        "x-venue-api-key": process.env.VENUE_API_KEY,
        Accept: "application/json"
      }
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Venue API failed with ${response.status}`);
  }
  return data;
}
```

Equivalent explicit URL construction:

```js
const response = await fetch(
  `${process.env.VENUE_API_BASE_URL}/api/integration/venues?fromDate=${fromDate}&toDate=${toDate}&startTime=${startTime}&endTime=${endTime}`,
  {
    headers: {
      "x-venue-api-key": process.env.VENUE_API_KEY,
      Accept: "application/json"
    }
  }
);
```

Use `URLSearchParams` in production when values are not already URL-safe.

### Axios backend example

```js
import axios from "axios";

export async function getVenueAvailability(params) {
  const response = await axios.get(
    `${process.env.VENUE_API_BASE_URL}/api/integration/venues`,
    {
      params,
      headers: {
        "x-venue-api-key": process.env.VENUE_API_KEY,
        Accept: "application/json"
      }
    }
  );
  return response.data;
}
```

### cURL example

Set the key locally before running the command; do not paste a production key into shell history:

```bash
curl --get "https://campusconnect.thapar.edu/api/integration/venues" \
  --header "x-venue-api-key: $VENUE_API_KEY" \
  --header "Accept: application/json" \
  --data-urlencode "fromDate=2026-08-05" \
  --data-urlencode "toDate=2026-08-05" \
  --data-urlencode "startTime=18:00" \
  --data-urlencode "endTime=22:00"
```

## 2. Create a venue booking request

```http
POST /api/integration/book-room
Content-Type: application/json
```

### Full request body

```json
{
  "venueName": "COS Hall",
  "fromDate": "2026-08-05",
  "toDate": "2026-08-05",
  "startTime": "18:00",
  "endTime": "22:00",
  "societyName": "Creative Computing Society",
  "eventName": "Night Coding Session",
  "studentName": "Student Name",
  "studentEmail": "student@thapar.edu",
  "contactNumber": "9876543210"
}
```

All fields are required. `contactNumber` must contain exactly 10 digits, and `studentEmail` must be a valid email address.

The backend checks the venue again before creating the enquiry. A previous availability response does not reserve the venue.

### Success response

```http
201 Created
```

```json
{
  "success": true,
  "message": "Venue enquiry submitted successfully",
  "enquiryId": "66b0f31b8f9d2d0012345678",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

This response means the request reached the Venue Booking Dashboard. It is **not booking confirmation**. The existing dashboard approval process performs the final conflict check and creates the confirmed Venue Booking only after approval.

`requestId` is generated by the Venue Booking backend for this integration-created enquiry. It prevents integration enquiries from sharing the schema's `null` request identifier; existing MongoDB `_id` relationships and dashboard workflows are unchanged.

### Conflict response

```http
409 Conflict
```

```json
{
  "success": false,
  "message": "Venue is unavailable for the requested slot"
}
```

### Validation error

```http
400 Bad Request
```

```json
{
  "success": false,
  "message": "Missing required fields: studentEmail, contactNumber"
}
```

Other validation messages may identify invalid dates, times, email addresses, or contact numbers.

### Node.js `fetch` example

```js
export async function submitVenueRequest(bookingRequest) {
  const response = await fetch(
    `${process.env.VENUE_API_BASE_URL}/api/integration/book-room`,
    {
      method: "POST",
      headers: {
        "x-venue-api-key": process.env.VENUE_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(bookingRequest)
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Venue API failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
```

### Axios backend example

```js
import axios from "axios";

export async function submitVenueRequest(bookingRequest) {
  const response = await axios.post(
    `${process.env.VENUE_API_BASE_URL}/api/integration/book-room`,
    bookingRequest,
    {
      headers: {
        "x-venue-api-key": process.env.VENUE_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );
  return response.data;
}
```

### cURL example

```bash
curl --request POST "https://campusconnect.thapar.edu/api/integration/book-room" \
  --header "x-venue-api-key: $VENUE_API_KEY" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  --data '{
    "venueName": "COS Hall",
    "fromDate": "2026-08-05",
    "toDate": "2026-08-05",
    "startTime": "18:00",
    "endTime": "22:00",
    "societyName": "Creative Computing Society",
    "eventName": "Night Coding Session",
    "studentName": "Student Name",
    "studentEmail": "student@thapar.edu",
    "contactNumber": "9876543210"
  }'
```

## Error codes

| Status | Meaning | Recommended handling |
|---:|---|---|
| `400` | Missing or invalid request data | Correct the request; do not retry unchanged |
| `401` | `x-venue-api-key` is missing | Fix backend credential configuration |
| `403` | API key is invalid | Verify or rotate the privately shared key |
| `409` | Venue conflict or ambiguous venue name | Ask the student to choose another venue or time |
| `422` | Request understood but cannot be processed | Correct the indicated business-rule violation |
| `429` | Too many requests | Retry later with exponential backoff |
| `500` | Unexpected Venue Booking backend error | Log the status safely and retry later; never log the key |

Error responses use this general shape:

```json
{
  "success": false,
  "message": "Description of the error"
}
```

## Recommended integration flow

1. Society Night Pass React sends the requested slot to the Society Night Pass backend.
2. The Society Night Pass backend calls `GET /api/integration/venues` using its private API key.
3. React displays the returned availability without receiving the key.
4. The student selects an available venue and submits the request to the Society Night Pass backend.
5. The Society Night Pass backend calls `POST /api/integration/book-room`.
6. The Venue Booking backend rechecks availability and creates a pending Venue Enquiry.
7. The existing Venue Booking Dashboard displays the enquiry for approval.
8. Approval creates the final Venue Booking through the existing workflow.

## Production checklist

- Keep both backend clocks synchronized.
- Set the base URL and key through the deployment secret manager or backend `.env`.
- Send all requests over HTTPS.
- Set reasonable request timeouts in Society Night Pass.
- Treat availability as advisory until the enquiry is approved.
- Handle every non-2xx status explicitly.
- Never expose secrets or private Venue Booking details to the browser.
