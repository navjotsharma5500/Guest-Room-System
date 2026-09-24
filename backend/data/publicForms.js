// Seed metadata only. URLs are intentionally preserved exactly as supplied.
export const INITIAL_PUBLIC_FORMS = [
  {
    order: 1, title: "Event Approval Form", code: "EA1", slug: "event-approval-form-ea1",
    category: "Event & Society",
    description: "Official DoSA event approval form for student societies and event organisers.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/EVENT%20APPROVAL%20FORM.pdf",
  },
  {
    order: 2, title: "Annexure – Event Flow", code: "AE1", slug: "annexure-event-flow-ae1",
    category: "Event & Society",
    description: "Supporting annexure for event concept, speakers, target audience, expected outcomes and event flow.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/Annexure%20Event%20Flow%20(AE1).pdf",
  },
  {
    order: 3, title: "Common Booking Form for All Halls", code: "", slug: "common-booking-form-all-halls",
    category: "Venue & Logistics",
    description: "Requisition form for booking specified halls and auditoriums.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/COMMON%20BOOKING%20FORM%20FOR%20ALL%20HALLS.pdf",
  },
  {
    order: 4, title: "Sponsor Approval Form", code: "SA1", slug: "sponsor-approval-form-sa1",
    category: "Sponsorship & Agreements",
    description: "Official approval form for event sponsorship details and proposed sponsorship amount.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/SPONSOR%20APPROVAL%20FORM%20(SA1).pdf",
  },
  {
    order: 5, title: "Memorandum of Understanding", code: "MU1", slug: "memorandum-of-understanding-mu1",
    category: "Sponsorship & Agreements",
    description: "Template for documenting a student society sponsorship or partnership arrangement.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/MEMORANDUM%20OF%20UNDERSTANDING%20(MoU).docx.pdf",
  },
  {
    order: 6, title: "Travel Grant Form", code: "TG1", slug: "travel-grant-form-tg1",
    category: "Finance & Travel",
    description: "Application form for eligible UG/PG students seeking travel support for approved student activities.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/Travel%20Grant%20Form.docx.pdf",
  },
  {
    order: 7, title: "Event Report", code: "ER1", slug: "event-report-er1",
    category: "Post-Event & Finance",
    description: "Post-event reporting format for society activities, participation, outcomes and supporting records.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/EVENT%20REPORT%20(1).pdf",
  },
  {
    order: 8, title: "Forwarding Memo for Bills & Adjustment of Temporary Advance", code: "", slug: "forwarding-memo-bills-temporary-advance",
    category: "Post-Event & Finance",
    description: "Form for forwarding bills and adjustment of temporary advances.",
    fileUrl: "https://ik.imagekit.io/7khjnlfow/Public%20Forms/FORWARDING%20MEMO%20FOR%20BILLS%20&%20ADJUSTMENT%20OF%20TEMPORARY%20ADVANCE.pdf",
  },
].map((form) => ({
  ...form, originalFileName: decodeURIComponent(form.fileUrl.split("/").pop()),
  fileType: "PDF", keywords: [], enabled: true, featured: false,
}));
