# Dynamic Public Forms API

Public Forms are MongoDB metadata records; documents remain on their external
hosts. No PDF binaries are stored in the repository or database. This phase
adds no frontend screen or Campus Connect layout changes. A future frontend
can populate its list from this API and manage it at `/admin/public-forms`.

## Public reads

- `GET /api/public-forms` → `{ success: true, forms: [...] }`
- `GET /api/public-forms/:id` → `{ success: true, form: {...} }`
- `GET /api/public-forms/:id/download` → streamed attachment

These routes require no login and only expose enabled records. Lists sort by
`order`, then `title` ascending (MongoDB's default binary string ordering).
Optional `category` matches an exact category; `search` performs a case-insensitive
literal substring match against title, code, description and keywords.
Public JSON includes `_id`, title, code, slug, description, category, fileUrl,
originalFileName, fileType, keywords, featured and order. It excludes user
references, timestamps, enabled and MongoDB's version key. IDs are MongoDB IDs,
not slugs. Missing/disabled records return 404; malformed IDs return 400.

## Admin management

Use the existing authenticated `token` cookie or `Authorization: Bearer <JWT>`.
The existing `protect` and `authorizeRoles("admin")` middleware verifies the
user against MongoDB. Inactive admins are also rejected. Unauthenticated
requests return 401; authenticated non-admins/inactive admins return 403.

| Method | Endpoint | Body / result |
| --- | --- | --- |
| GET | `/api/public-forms/admin/all` | All records, including disabled forms and audit fields |
| POST | `/api/public-forms/admin` | Editable fields; returns 201 and `{ success, form }` |
| PUT | `/api/public-forms/admin/:id` | Only fields to change; returns `{ success, form }` |
| PATCH | `/api/public-forms/admin/:id/status` | `{ "enabled": false }` or true |
| PATCH | `/api/public-forms/admin/reorder` | `{ "items": [{ "id": "<MongoDB ID>", "order": 1 }] }` |
| DELETE | `/api/public-forms/admin/:id` | Deletes the metadata record; does not delete the external document |

Reorder accepts up to 500 distinct IDs, validates every entry and confirms all
IDs exist before writing. Unlisted records keep their order. Equal orders are
allowed and use the title tie-breaker. The bulk operation does not require a
replica set; it is not transactional against concurrent edits/deletes.

Required on creation: `title`, `slug`, `category`, `fileUrl`. Slugs are unique,
lowercase words/numbers separated by hyphens. Duplicate slugs return 409.
Categories are arbitrary nonempty strings, not a fixed enum.

Other editable fields: `code`, `description`, `originalFileName`, `fileType`
(default `PDF`), `keywords` (up to 50 strings), `enabled` (default true),
`featured` (default false), `order` (non-negative safe integer, default 0).
Unknown fields and incorrectly typed values return 400. HTTP and HTTPS URLs
are accepted without rewriting; URL credentials are rejected. Admin identity
sets `createdBy`/`updatedBy` User references; timestamps are maintained by
Mongoose. Audit identity/timestamps cannot be supplied by callers.

Example create payload:

```json
{
  "title": "New Public Form",
  "slug": "new-public-form",
  "category": "New Category",
  "fileUrl": "https://ik.imagekit.io/your-account/form.pdf",
  "order": 9,
  "enabled": true
}
```

## Seed command

From `backend`, with the intended `MONGO_URL` environment configured:

```sh
npm run seed:public-forms
```

The CLI loads `.env` via the project's existing dotenv convention. It is never
called during server startup. `backend/data/publicForms.js` contains the exact
eight supplied records and unchanged URLs, ordered 1–8:

1. Event Approval Form (EA1)
2. Annexure – Event Flow (AE1)
3. Common Booking Form for All Halls (blank code)
4. Sponsor Approval Form (SA1)
5. Memorandum of Understanding (MU1)
6. Travel Grant Form (TG1)
7. Event Report (ER1)
8. Forwarding Memo for Bills & Adjustment of Temporary Advance (blank code)

The seed validates each record and upserts by unique slug using `$setOnInsert`.
Existing records, including their timestamps, are untouched. Additional admin
records are never deleted. A changed/deleted seed slug is considered missing
and will be inserted if the command is explicitly rerun. Disable a seed form
to hide it while retaining its seed identity. Tests only seed an isolated
MongoDB instance; deployment seeding is a separate explicit command.

## Download policy

Set this optional server environment variable (the shown value is the default):

```dotenv
PUBLIC_FORM_ALLOWED_HOSTS=ik.imagekit.io
```

Additional trusted hostnames may be comma-separated. Matching is exact; no
wildcards or arbitrary URL query parameters are accepted. Downloads resolve
only the enabled database record's stored URL. The proxy blocks IP-literal
hosts, credentials, fragments, nonstandard ports, redirects, private/reserved
IPv4 DNS results, and compressed responses. DNS resolution is IPv4-only and
pins the validated address to the socket, preventing DNS rebinding. IPv6-only
hosts are not supported. The original URL is passed unchanged to the fetcher.

Streaming has a 15-second total timeout and a 20 MiB byte cap, including when
Content-Length is absent. Client disconnects cancel the request. Files are
streamed without writing to disk, with a sanitized attachment filename,
upstream Content-Type (or application/octet-stream), `nosniff` and `no-store`.
Unsupported hosts return 422; upstream errors/redirects/oversized declared
files return 502; timeouts before streaming return 504. Errors after streaming
starts terminate the download connection instead of emitting a partial JSON
response. A valid metadata URL on a non-allowlisted host can still be opened
directly by a future frontend but cannot be proxied.

## Verification

```sh
npm test -- --runInBand tests/publicForms.test.js
```

Integration tests use MongoMemoryServer and the real application route mount,
auth middleware and models. Download tests use controlled streams and DNS
results; they do not fetch the supplied PDFs or contact a live database.
