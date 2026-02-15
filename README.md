Guest Room & Institute Venue Management System
Architecture & Deployment Documentation
1. Project Overview

The Guest Room & Institute Venue Management System (GRIVMS) is a large-scale, production-grade full-stack web application designed for institutional accommodation and venue management (Thapar University context).

The project contains multiple independent systems deployed together but strictly isolated by architecture, routing, and data models.

Systems included in this project

Guest Room Management System (Production locked & stable)

Institute Venue Booking System (Active, isolated module)

Dashboard Selector (Consolidated Web Entry Point)

Email Automation System (3 Nodemailer pipelines)

Image & Document Management (ImageKit CDN)

The system supports:

Guest enquiries & approvals

Direct and consolidated bookings

Venue enquiries & bookings

Role-based dashboards

Room & venue availability enforcement

Payments (paid / partial / free)

Document uploads and approvals

Booking extensions & cancellations

Public event calendar

Real-time dashboard updates

The architecture prioritizes:

Security

Isolation between subsystems

Data integrity

Real-time consistency

Production stability

2. High-Level Architecture
Browser (React / Vercel)
        |
        | HTTPS + HttpOnly Cookies
        |
Nginx (Reverse Proxy)
        |
Node.js + Express (EC2, PM2)
        |
MongoDB Atlas


Real-time layer: Socket.IO (WebSocket with fallback)

File storage: ImageKit CDN
Email system: Nodemailer (multi-pipeline)

3. Frontend Architecture
3.1 Technology Stack

React (Create React App)

Hosted on Vercel

State managed via React hooks & context

Role-based routing

Real-time updates via Socket.IO client

3.2 Environment Configuration

Frontend uses Vercel Environment Variables (no committed .env files).

REACT_APP_BACKEND_URL=https://api.guestapp.in


All API and socket connections are routed through a single centralized config:

src/utils/apiConfig.js


This prevents:

Hardcoded URLs

Environment drift

Accidental localhost references

3.3 API Communication

REST APIs via axios

Base URL imported from apiConfig.js

Cookies sent automatically

axios.defaults.withCredentials = true;

3.4 Authentication Model (Frontend)

JWT stored in HttpOnly cookies

No tokens stored in:

LocalStorage

SessionStorage

Frontend never reads JWT

Authentication validated server-side only

This design:

Prevents XSS token theft

Matches production security standards

3.5 Dashboard Selector (Consolidated Entry Page)

After login, users are routed based on role:

Role	Landing
Admin	Dashboard Selector
Caretaker / Manager / Warden	Guest Room Dashboard
Assistant / DD Assistant	Venue Dashboard

Admin selector allows switching between:

Guest Room Dashboard

Institute Venue Dashboard

Dashboards are never mixed.

3.6 Real-Time Updates (Socket.IO)

Frontend:

Single Socket.IO client

Joins logical rooms (e.g. dashboard-room)

Backend:

const io = req.app.get("io");
io.to("dashboard-room").emit(...)


Used for:

Booking updates

Room status changes

Calendar refresh

Dashboard sync without reload

3.7 File Uploads (ImageKit)

Frontend uses ImageKit public key only

Backend handles metadata & authorization

No private keys exposed

Uploads include:

Guest documents

Approval documents

Payment proofs

Extension attachments

EC2 never stores files locally.

4. Backend Architecture
4.1 Technology Stack

Node.js

Express.js

MongoDB Atlas

Mongoose

Socket.IO

Nodemailer

ImageKit

PM2

Nginx

4.2 Deployment Environment

Hosted on AWS EC2 (Ubuntu 22.04)

Internal app port:

10000


HTTPS terminated by Nginx

SSL via Let’s Encrypt

Public backend URL:

https://api.guestapp.in

4.3 Backend Responsibilities

Authentication & authorization

Role enforcement

Guest Room booking lifecycle

Venue booking lifecycle

Availability & overlap validation

Payment state management

Document metadata persistence

Email routing & logging

Socket event emission

Data integrity enforcement

5. Guest Room Management System (LOCKED)
5.1 Core Features

Guest enquiries

Direct bookings

Consolidated bookings

Guest profile auto-generation

Room allocation

Check-in / check-out

Payment handling (paid / partial / free)

Booking extension & cancellation

Feedback system

Automated emails

5.2 Guest Room Roles & Permissions
Role	Permissions
Admin	Full access
Manager	Allocation, approvals, reports
Caretaker	Day-to-day booking handling
Warden	Approval & oversight
Guest	Enquiry & feedback

This module is feature-frozen for stability.

6. Institute Venue Booking System (Isolated Module)
6.1 Venue Booking Flows

Public Enquiry → Approval → Booking

Direct Booking (internal roles)

Extension

Cancellation

Public Event Calendar

6.2 Venue Roles & Permissions
Role	Access
Admin	All venues
Assistant	All venues
DD Assistant	Limited venues only
Public	Enquiry & calendar
6.3 DD Assistant Restrictions

Allowed venues only:

LT-201

LT-202

TAN Auditorium

Restrictions enforced on:

Sidebar

Calendar

Enquiries

Bookings

Extensions

Cancellations

Backend-enforced (not UI hiding).

7. Email Automation System

The project uses three Nodemailer pipelines sharing infrastructure but separated by logic.

Email Pipelines

Guest Room Emails

Venue – DD Office Emails

Venue – DoSA Office Emails

Routing Rules
Venue	Flow
LT-201 / LT-202 / TAN Auditorium	DD Office
All other venues	DoSA Office
Mandatory BCC

dosa@thapar.edu

itmh@thapar.edu

All emails:

Logged in database

Environment-driven credentials

No hardcoded addresses

8. Database Design (MongoDB Atlas)

Collections include:

Hostels

Rooms

GuestProfiles

Bookings

VenueBuildings

VenueRooms

VenueEnquiries

VenueBookings

EmailLogs

Feedback

All date-time validation handled server-side.

9. API Overview
9.1 Guest Room APIs

/api/bookings

/api/consolidated-bookings

/api/guest-profile

/api/extensions

/api/cancellations

/api/feedback

9.2 Venue APIs

/api/venue/enquiry

/api/venue/booking

/api/venue/direct-booking

/api/venue/extension

/api/venue/cancellation

/api/venue/calendar

10. Full Project Structure
Backend
backend/
├── controllers/
├── models/
├── routes/
├── emails/
│   ├── sendEmail.js
│   ├── guestRoom/
│   └── venue/
├── middleware/
├── utils/
├── index.js
└── package.json

Frontend
frontend/
├── src/
│   ├── dashboards/
│   │   ├── GuestRoomDashboard/
│   │   ├── VenueDashboard/
│   │   └── DashboardSelector/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── routes/
│   └── utils/
├── public/
└── package.json

11. Deployment Workflow
Frontend (Vercel)

Auto-deploy from main

npm run build

CI warnings non-blocking

Backend (EC2)
git pull origin main
pm2 restart guestroom-backend


Manual, predictable deployments only.

12. Security Considerations

✔ HttpOnly cookies
✔ HTTPS enforced
✔ No frontend secrets
✔ Role-based backend enforcement
✔ No token exposure in JS
✔ Environment isolation

13. Production Readiness Status
Area	Status
Guest Room System	✅
Venue System	✅
Security	✅
Email Automation	✅
Image Uploads	✅
Real-time Sync	✅
Deployment Hygiene	✅
14. Next Phase (Planned)

Warden / ADoSA approval workflow

Mobile application (React Native)

API documentation

Automated testing

Push notifications

Final Note

This system is actively deployed, stable, and production-grade.
Design decisions prioritize correctness, isolation, and institutional reliability, not experimental development.
