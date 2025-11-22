// src/data/defaultUsers.js
// Default local users (for local-run authentication).
// Later you will migrate to server-side users with hashed passwords.

const MASTER_PIN = "5233"; // Master PIN (admin override)

const DEFAULT_PASSWORD_CARETAKER = "Test@12345";
const DEFAULT_PASSWORD_MANAGER = "Manager@12345";
const DEFAULT_PASSWORD_ADMIN = "Admin@12345";

/**
 * defaultUsers: keyed by email for easy lookup
 * fields: email, displayName, role ('admin'|'manager'|'caretaker'), hostel (nullable), password (plain for now)
 */
const defaultUsers = {
  // Admin (you)
  "navjot.sharma@thapar.edu": {
    email: "navjot.sharma@thapar.edu",
    displayName: "Navjot Sharma (Admin)",
    role: "admin",
    hostel: null,
    password: DEFAULT_PASSWORD_ADMIN,
  },

  // Manager
  "harpreet.virdi@thapar.edu": {
    email: "harpreet.virdi@thapar.edu",
    displayName: "Harpreet Virdi (Manager)",
    role: "manager",
    hostel: "All Hostels",
    password: DEFAULT_PASSWORD_MANAGER,
  },

  // Caretakers (from CSV + additional list you provided)
  "caretaker.agira@thapar.edu": {
    email: "caretaker.agira@thapar.edu",
    displayName: "Agira Caretaker",
    role: "caretaker",
    hostel: "Agira Hall (A)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.amritam@thapar.edu": {
    email: "caretaker.amritam@thapar.edu",
    displayName: "Amritam Caretaker",
    role: "caretaker",
    hostel: "Amritam Hall (B)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.prithvi@thapar.edu": {
    email: "caretaker.prithvi@thapar.edu",
    displayName: "Prithvi Caretaker",
    role: "caretaker",
    hostel: "Prithvi Hall (C)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.neeram@thapar.edu": {
    email: "caretaker.neeram@thapar.edu",
    displayName: "Neeram Caretaker",
    role: "caretaker",
    hostel: "Neeram Hall (D)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.vyan@thapar.edu": {
    email: "caretaker.vyan@thapar.edu",
    displayName: "Vyan Caretaker",
    role: "caretaker",
    hostel: "Vyan Hall (H)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },

  // Additional caretakers you posted
  "caretaker.ira@thapar.edu": {
    email: "caretaker.ira@thapar.edu",
    displayName: "Ira Caretaker",
    role: "caretaker",
    hostel: "Ira Hall (I)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.tejas@thapar.edu": {
    email: "caretaker.tejas@thapar.edu",
    displayName: "Tejas Caretaker",
    role: "caretaker",
    hostel: "Tejas Hall (J)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.ambaram@thapar.edu": {
    email: "caretaker.ambaram@thapar.edu",
    displayName: "Ambaram Caretaker",
    role: "caretaker",
    hostel: "Ambaram Hall (K)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.viyat@thapar.edu": {
    email: "caretaker.viyat@thapar.edu",
    displayName: "Viyat Caretaker",
    role: "caretaker",
    hostel: "Viyat Hall (L)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.anantam@thapar.edu": {
    email: "caretaker.anantam@thapar.edu",
    displayName: "Anantam Caretaker",
    role: "caretaker",
    hostel: "Anantam Hall (M)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.ananta@thapar.edu": {
    email: "caretaker.ananta@thapar.edu",
    displayName: "Ananta Caretaker",
    role: "caretaker",
    hostel: "Ananta Hall (N)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.vyom@thapar.edu": {
    email: "caretaker.vyom@thapar.edu",
    displayName: "Vyom Caretaker",
    role: "caretaker",
    hostel: "Vyom Hall (O)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.dhriti@thapar.edu": {
    email: "caretaker.dhriti@thapar.edu",
    displayName: "Dhriti (PG) Caretaker",
    role: "caretaker",
    hostel: "Dhriti Hall (PG)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
  "caretaker.vahni@thapar.edu": {
    email: "caretaker.vahni@thapar.edu",
    displayName: "Vahni Caretaker",
    role: "caretaker",
    hostel: "Vahni Hall (Q)",
    password: DEFAULT_PASSWORD_CARETAKER,
  },
};

export { defaultUsers, MASTER_PIN };
export default defaultUsers;
