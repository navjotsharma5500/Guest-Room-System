import User from "../models/User.js";
import { sendEmail, sendEmailAdvanced } from "../emails/sendEmail.js";
import { getEmailConfigForTemplate, getSystemSettings } from "./systemSettings.js";

const EMAIL_ROLE_FIELDS = {
  guest: ({ booking, enquiry }) => [booking?.email, enquiry?.email],
  caretaker: ({ booking, hostel }) => [
    booking?.caretakerEmail,
    hostel?.caretakerEmail,
  ],
  warden: ({ booking, hostel }) => [booking?.wardenEmail, hostel?.wardenEmail],
};

const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

const collectMappedEmails = (values = []) =>
  values
    .flat()
    .map(normalizeEmail)
    .filter(Boolean);

const collectUserEmailsByRole = async (roles = []) => {
  if (!Array.isArray(roles) || roles.length === 0) return [];

  const normalizedRoles = [...new Set(roles.map((role) => String(role || "").trim().toLowerCase()))];
  const users = await User.find({
    role: { $in: normalizedRoles },
    $or: [{ isActive: { $exists: false } }, { isActive: true }],
  })
    .select("email")
    .lean();

  return users.map((user) => normalizeEmail(user.email)).filter(Boolean);
};

export const getEmailRecipients = async (templateName, context = {}, settings = null) => {
  const resolvedSettings = settings || (await getSystemSettings());
  const config = getEmailConfigForTemplate(resolvedSettings, templateName);

  if (!config.enabled) {
    return { disabled: true, to: [], cc: [], bcc: [], config };
  }

  const explicitTo = [];
  for (const role of config.sendToRoles || []) {
    const resolver = EMAIL_ROLE_FIELDS[role];
    if (resolver) {
      explicitTo.push(...collectMappedEmails(resolver(context)));
    }
  }

  const explicitCc = [];
  for (const role of config.ccRoles || []) {
    const resolver = EMAIL_ROLE_FIELDS[role];
    if (resolver) {
      explicitCc.push(...collectMappedEmails(resolver(context)));
    }
  }

  const explicitBcc = [];
  for (const role of config.bccRoles || []) {
    const resolver = EMAIL_ROLE_FIELDS[role];
    if (resolver) {
      explicitBcc.push(...collectMappedEmails(resolver(context)));
    }
  }

  const dynamicRoleKeys = new Set([
    ...(config.sendToRoles || []),
    ...(config.ccRoles || []),
    ...(config.bccRoles || []),
  ]);

  const userBackedRoles = [...dynamicRoleKeys].filter((role) => !EMAIL_ROLE_FIELDS[role]);
  const userEmails = await collectUserEmailsByRole(userBackedRoles);

  const to = [...new Set([...explicitTo])];
  const cc = [...new Set([...explicitCc])];
  const bcc = [
    ...new Set([
      ...explicitBcc,
      ...userEmails,
      ...collectMappedEmails(config.customEmails || []),
    ]),
  ];

  return { disabled: false, to, cc, bcc, config };
};

export const sendConfiguredEmail = async ({
  templateName,
  context = {},
  settings = null,
  subject,
  html,
  attachments = [],
  advanced = false,
  extra = {},
}) => {
  const recipients = await getEmailRecipients(templateName, context, settings);

  if (recipients.disabled || recipients.to.length === 0) {
    return { skipped: true, reason: "disabled_or_no_recipients", recipients };
  }

  const payload = {
    to: recipients.to,
    cc: recipients.cc,
    bcc: recipients.bcc,
    subject,
    html,
    attachments,
    ...extra,
  };

  if (advanced) {
    await sendEmailAdvanced(payload);
  } else {
    await sendEmail(payload);
  }

  return { skipped: false, recipients };
};
