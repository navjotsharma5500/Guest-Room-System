const heroImage =
  "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744";

export const DEFAULT_WEBSITE_CONTENT = {
  theme: {
    backgroundStyle: "resortWarm",
    primaryColor: "#a8323e",
    accentColor: "#14385f",
    headingFontStyle: "serif",
    bodyFontStyle: "sans",
    buttonRoundness: "pill",
  },
  home: {
    hero: {
      title: "Welcome to Thapar Hostel Guest Rooms",
      subtitle:
        "Comfortable, secure and institute-managed accommodation for official guests, parents and visitors.",
      image: heroImage,
      primaryButton: "Book Your Stay",
      secondaryButton: "Explore Rooms",
    },
    intro: {
      title: "Hospitality Inside the Thapar Campus",
      text:
        "Hostel Guest Rooms provide safe, comfortable and convenient accommodation within the TIET campus for parents, official guests, faculty visitors and approved institutional guests.",
    },
    stats: [
      { label: "Guest Rooms", value: "31" },
      { label: "Campus Support", value: "24x7" },
      { label: "Secure Campus Stay", value: "Safe" },
      { label: "Booking Request", value: "Online" },
    ],
    roomCards: [
      {
        title: "Campus Guest Room",
        hostel: "Institute Hostels",
        capacity: "1-2 Guests",
        amenities: ["WiFi", "Attached washroom", "Housekeeping"],
        image: "",
      },
      {
        title: "AC Guest Room",
        hostel: "Selected Hostels",
        capacity: "2 Guests",
        amenities: ["AC", "Hot water", "Campus support"],
        image: "",
      },
      {
        title: "Family Visitor Stay",
        hostel: "Subject to availability",
        capacity: "Parents / Guardians",
        amenities: ["Secure campus", "Digital support", "Online payment"],
        image: "",
      },
    ],
    facilities: [
      "WiFi",
      "Hot & Cold Water",
      "Housekeeping",
      "Medical Support",
      "Dining",
      "Online Payments",
      "Guest Support QR",
      "SOS Support",
    ],
    notice:
      "Cash payment is not accepted. Payments are non-refundable. Booking requests are subject to hostel administration approval and system-defined maximum request days.",
  },
  about: {
    hero: { title: "About Hostel Guest Rooms", subtitle: "Institute-managed visitor accommodation inside TIET campus.", image: "" },
    sections: [
      {
        title: "About Guest Rooms",
        text:
          "Thapar Hostel Guest Rooms are managed for institute-approved visitors, parents, guests and official invitees requiring short stay accommodation inside the campus.",
      },
      {
        title: "About DoSA Office",
        text:
          "The Office of Dean Student Affairs coordinates hostel services, guest accommodation workflows and student welfare support.",
      },
    ],
    cards: ["Campus Security", "Managed by Institute", "Easy Approval Workflow", "Hostel-Based Support", "Digital Guest Services"],
    mission: "To provide safe, transparent and well-managed guest accommodation services within the campus.",
  },
  rooms: {
    hero: { title: "Comfortable Rooms Inside Campus", subtitle: "Room allotment is subject to approval and availability.", image: "" },
    cards: [
      { title: "Single Occupancy", capacity: "1 Guest", description: "Compact rooms for approved short stay guests.", amenities: ["WiFi", "Bed", "Study table"], image: "" },
      { title: "Double Occupancy", capacity: "2 Guests", description: "Comfortable stay for parents and approved visitors.", amenities: ["Two beds", "Washroom", "Support"], image: "" },
      { title: "AC Rooms", capacity: "1-2 Guests", description: "Air-conditioned rooms subject to hostel availability.", amenities: ["AC", "WiFi", "Hot water"], image: "" },
      { title: "Non-AC Rooms", capacity: "1-2 Guests", description: "Standard campus guest accommodation.", amenities: ["Fan", "Clean linen", "Support"], image: "" },
    ],
    notes: ["Availability subject to approval", "Room allotment depends on availability", "Room capacity rules apply", "Guest must carry valid ID/address proof"],
  },
  tariff: {
    hero: { title: "Tariff & Payment Information", subtitle: "Transparent tariff and payment rules for guest accommodation.", image: "" },
    rows: [
      ["Thapar Students / Parents", "Rs. 850 per day"],
      ["Thapar Department Guest", "As approved / department pay"],
      ["External / Other Guests", "Rs. 1000 per day"],
      ["Official / Free Stay", "Subject to DoSA approval"],
    ],
    terms: [
      "Minimum one day charge is applicable after check-in.",
      "Even short stay after check-in is counted as one day.",
      "Payments are non-refundable.",
      "Early checkout does not create refund entitlement.",
      "Pending payment after checkout may mark guest as defaulter.",
    ],
    noCashPolicy:
      "Cash payment is not accepted for hostel guest room accommodation. Guests are advised to use official online/bank payment methods only.",
  },
  dining: {
    hero: { title: "Dining & Campus Food Facilities", subtitle: "Campus dining options for approved guests.", image: "" },
    text: "Guests may avail hostel mess/dining facilities as per applicable hostel rules and availability.",
    cards: [
      { title: "Breakfast", timing: "07:30 AM - 09:30 AM", price: "As applicable", description: "Morning meal subject to hostel mess rules.", image: "" },
      { title: "Lunch", timing: "12:30 PM - 02:30 PM", price: "As applicable", description: "Lunch facility as per availability.", image: "" },
      { title: "Dinner", timing: "07:30 PM - 09:30 PM", price: "As applicable", description: "Dinner facility as per hostel schedule.", image: "" },
    ],
  },
  facilities: {
    hero: { title: "Facilities & Guest Support", subtitle: "Safe stay with digital support services.", image: "" },
    facilities: [
      "31 Elegantly appointed non-smoking rooms",
      "24 hrs room service / support",
      "Elevator",
      "Running hot & cold water",
      "Treated and purified drinking water",
      "Round-the-clock health services at Health Centre",
      "Free WiFi",
      "Daily housekeeping",
      "Canteen, food court and Nescafe kiosks",
      "No cash policy",
      "Online payment support",
      "Digital guest support",
    ],
  },
  gallery: {
    hero: { title: "Gallery", subtitle: "Guest rooms, dining, hostel and campus views.", image: "" },
    images: [],
  },
  booking: {
    hero: { title: "Request Hostel Guest Room Accommodation", subtitle: "Submit your guest room enquiry for review by hostel administration.", image: "" },
    policies: [
      "Address proof mandatory",
      "Approval required",
      "Report within 23 hours after approval",
      "Payment is non-refundable",
      "No cash policy",
      "Room capacity rules apply",
      "Hostel rules must be followed",
    ],
  },
  contact: {
    hero: { title: "Contact Us", subtitle: "Hostel Guest Room support and institute contact details.", image: "" },
    location: "Thapar Institute of Engineering & Technology, Patiala, Punjab",
    office: "Office of Dean Student Affairs",
    emails: ["dosa.office@thapar.edu", "Queries_studentaffairs@thapar.edu", "itmh@thapar.edu"],
    hours: "9:00 AM to 5:30 PM, Monday to Friday",
    mapUrl: "https://www.google.com/maps?q=Thapar+Institute+of+Engineering+and+Technology+Patiala&output=embed",
  },
  footer: {
    description:
      "Official public portal for hostel guest room accommodation requests at Thapar Institute of Engineering & Technology.",
    quickLinks: [
      { label: "Home", href: "/guest-room" },
      { label: "Rooms", href: "/guest-room/rooms" },
      { label: "Tariff", href: "/guest-room/tariff" },
      { label: "Facilities", href: "/guest-room/facilities" },
      { label: "Booking", href: "/guest-room/booking" },
      { label: "Contact", href: "/guest-room/contact" },
      { label: "Policies", href: "/policies" },
      { label: "Terms", href: "/terms" },
    ],
  },
  quicklinks: { links: [] },
  bankdetails: {
    accountName: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    instructions: "Please make payment only after approval / check-in instruction.",
  },
};

export const WEBSITE_SECTIONS = Object.keys(DEFAULT_WEBSITE_CONTENT);
