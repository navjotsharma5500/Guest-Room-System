# Guest Room Dashboard Project

**Comprehensive System Overview, Current Logic, and Future Roadmap**

---

## 1. Project Overview

The **Guest Room Dashboard Project** is a **centralized hostel guest room management system** designed to manage:

* Guest enquiries
* Direct bookings
* Multi-hostel room allocation
* Booking extensions & cancellations
* Role-based approval workflows
* Audit logs & traceability

The system is built to replace **manual booking registers**, eliminate conflicts, and introduce **policy-driven approvals** across all hostels.

---

## 2. High-Level Architecture

### Frontend

* **React (Vite / CRA)**
* TailwindCSS for UI
* Framer Motion for UX transitions
* Centralized state via React Context
* Modular components (RoomCard, GuestDetails, Modals)

### Backend

* **Node.js + Express**
* **MongoDB (Primary datastore)**
* JWT-based authentication
* Role-based authorization middleware

### Deployment (New)

* **Backend → AWS (EC2 / Elastic Beanstalk)**
* **MongoDB → MongoDB Atlas**
* **Frontend → S3 + CloudFront (recommended)**

---

## 3. Core Functional Modules

---

## 3.1 Hostels & Rooms Management

### Data Model

```js
Hostel {
  name,
  block,
  type,
  rooms: [
    {
      roomNo,
      roomType,
      bookings: []
    }
  ]
}
```

### Logic

* Each hostel contains multiple rooms
* Each room maintains its **own booking timeline**
* Conflict detection uses:

  * Date overlap
  * Time overlap (check-in / check-out)

---

## 3.2 Booking Lifecycle

### Booking Types

1. **Enquiry-based Booking**
2. **Direct Booking**
3. **Consolidated Booking (Multiple rooms)**

### Booking States

* `pending`
* `approved`
* `rejected`
* `cancelled`
* `completed`

### Key Rules

* Bookings are stored **locally first** (UX responsiveness)
* Synced to **MongoDB immediately**
* MongoDB `_id` becomes the **source of truth**

---

## 3.3 Direct Booking Logic (Current)

* Admin selects room → DirectBookingModal opens
* Booking saved to MongoDB
* Booking reflected instantly on UI
* Extensions & cancellations synced back to MongoDB

---

## 3.4 Booking Extension Logic

### Current Behavior

* Extension allowed only if:

  * Booking has MongoDB `_id`
  * No overlap with future bookings
* Backend validates:

  * Hostel
  * Room
  * New end date
* Frontend updates state immediately after success

---

## 3.5 Guest Details Panel

### Purpose

* Single source for:

  * Guest identity
  * Stay duration
  * Attachments
  * Payment status
  * Audit trail

### Logic

* Fetches booking from MongoDB if `_id` exists
* Falls back to local data if not
* Retry logic for network issues
* Prevents UI flicker / auto close bug

---

## 3.6 Room Card Logic (Critical Component)

### Responsibilities

* Show:

  * Active booking
  * Upcoming booking
  * Availability
* Correct date & time formatting
* Handle click routing:

  * Single booking → Details
  * Multiple bookings → List modal
  * Empty room → Direct booking

### Recent Fixes

* Removed timezone parsing bugs
* Removed duplicate click triggers
* Unified date parsing (`YYYY-MM-DD + HH:mm`)

---

## 4. User Roles (Current & Planned)

### Current Roles

* `admin`

### Planned Role Hierarchy (NEW)

```text
Admin
│
├── Warden (Hostel-specific)
│
├── Co-Warden (Multiple hostels)
│
├── Associate Dean (DoSA)
│
└── Dean (DoSA)
```

---

## 5. Approval-Based Booking System (NEW DESIGN)

### Rule-Based Approval Engine

| Booking Duration | Approval Authority           |
| ---------------- | ---------------------------- |
| ≤ 3 days         | Hostel Warden                |
| 4 days           | Co-Warden                    |
| ≥ 5 days         | Associate Dean / Dean (DoSA) |

---

### Approval Flow

1. **Booking Created**

   * Status: `pending`
2. **System determines approver**
3. **Approval Request generated**
4. **Approver dashboard notification**
5. **Approve / Reject**
6. **Booking state updated**
7. **Audit log stored**

---

### Booking Status Transition

```text
pending → approved → active → completed
        ↘ rejected
```

---

## 6. Approval Data Model (Proposed)

```js
Approval {
  bookingId,
  requiredRole,
  approverId,
  status,        // pending | approved | rejected
  remarks,
  decidedAt
}
```

---

## 7. Role-Based Dashboards (Planned)

### Warden Dashboard

* View bookings for **assigned hostel only**
* Approve bookings ≤ 3 days
* See occupancy & reports

### Co-Warden Dashboard

* View multiple hostels
* Approve 4-day bookings
* Override warden decisions

### DoSA / Associate Dean

* Global view
* Approve ≥ 5 day bookings
* Policy enforcement
* Analytics & trends

---

## 8. Audit & Logging System

Every action generates logs:

```text
booking_created
booking_approved
booking_rejected
booking_extended
booking_cancelled
```

Each log contains:

* Actor
* Role
* Timestamp
* Old → New state
* Remarks

This ensures:

* Accountability
* Compliance
* Traceability

---

## 9. AWS Migration Plan (Backend)

### Step 1: Backend

* Deploy Node.js backend on **EC2**
* Use **PM2**
* Secure with **Nginx**
* HTTPS via **Certbot**

### Step 2: Database

* MongoDB Atlas
* IP whitelisting
* Backup policies

### Step 3: Frontend

* Build React app
* Host on S3
* Serve via CloudFront

---

## 10. Future Enhancements (Roadmap)

### Phase 1 (Immediate)

* Approval workflow
* Role-based login
* Notification system

### Phase 2

* Email alerts
* PDF booking letters
* QR-based guest verification

### Phase 3

* Analytics dashboard
* Occupancy forecasting
* Automated policy engine

---

## 11. Summary (Executive View)

The **Guest Room Dashboard Project** is evolving from:

> **A booking UI → A policy-driven, auditable hostel management system**

With:

* Strong backend authority
* Clear approval chains
* Institutional governance alignment
* AWS-grade scalability

---
