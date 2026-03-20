const DEMO_DOCUMENT_PROFILES = [
  {
    code: "PASS",
    title: "Passport",
    issuer: "Passport Authority",
    category: "Personal Documents",
    validity: { unit: "year", min: 5, max: 10 },
    credentialUrl: "https://passportindia.gov.in/",
    notes: "Passport renewal is usually required every 5 to 10 years.",
  },
  {
    code: "DL",
    title: "Driving License",
    issuer: "RTO",
    category: "Personal Documents",
    validity: { unit: "year", min: 5, max: 10 },
    credentialUrl: "https://parivahan.gov.in/",
    notes: "Driving license renewal is required after a fixed validity period.",
  },
  {
    code: "AADHAAR",
    title: "Aadhaar Card",
    issuer: "UIDAI",
    category: "Personal Documents",
    validity: { unit: "none" },
    credentialUrl: "https://uidai.gov.in/",
    notes: "No fixed expiry; periodic demographic and biometric updates are recommended.",
  },
  {
    code: "VOTER",
    title: "Voter ID",
    issuer: "Election Commission",
    category: "Personal Documents",
    validity: { unit: "none" },
    credentialUrl: "https://voters.eci.gov.in/",
    notes: "Generally no expiry unless reissue or correction is needed.",
  },
  {
    code: "AWS",
    title: "AWS Certified Solutions Architect - Associate",
    issuer: "AWS",
    category: "Educational & Professional Certifications",
    validity: { unit: "year", min: 2, max: 3 },
    credentialUrl: "https://aws.amazon.com/certification/",
    notes: "Professional IT certification with 2 to 3 year validity.",
  },
  {
    code: "CISCO",
    title: "Cisco Certified Network Associate (CCNA)",
    issuer: "Cisco",
    category: "Educational & Professional Certifications",
    validity: { unit: "year", min: 2, max: 3 },
    credentialUrl: "https://www.cisco.com/",
    notes: "Professional IT certification with periodic renewal requirements.",
  },
  {
    code: "AZURE",
    title: "Microsoft Azure Administrator Associate",
    issuer: "Microsoft",
    category: "Educational & Professional Certifications",
    validity: { unit: "year", min: 2, max: 3 },
    credentialUrl: "https://learn.microsoft.com/certifications/",
    notes: "Professional IT certification with periodic renewal.",
  },
  {
    code: "MED",
    title: "Medical License Registration",
    issuer: "Medical Council",
    category: "Educational & Professional Certifications",
    validity: { unit: "year", min: 1, max: 3 },
    credentialUrl: "",
    notes: "Medical and nursing registrations require periodic renewal.",
  },
  {
    code: "CA",
    title: "Chartered Accountant Membership",
    issuer: "Professional Council",
    category: "Educational & Professional Certifications",
    validity: { unit: "year", min: 1, max: 2 },
    credentialUrl: "",
    notes: "Professional memberships require ongoing compliance and periodic validation.",
  },
  {
    code: "BGV",
    title: "Background Verification Certificate",
    issuer: "Verification Agency",
    category: "Employment & Compliance Certificates",
    validity: { unit: "month", min: 6, max: 12 },
    credentialUrl: "",
    notes: "Background verification is generally valid for a limited period.",
  },
  {
    code: "PCC",
    title: "Police Clearance Certificate",
    issuer: "Police Department",
    category: "Employment & Compliance Certificates",
    validity: { unit: "month", min: 3, max: 6 },
    credentialUrl: "",
    notes: "Police clearance usually has short-term validity.",
  },
  {
    code: "FAID",
    title: "First Aid Safety Training Certificate",
    issuer: "Safety Training Board",
    category: "Business & Legal Certificates",
    validity: { unit: "year", min: 1, max: 2 },
    credentialUrl: "",
    notes: "Safety training certificates require periodic renewal.",
  },
  {
    code: "FIRE",
    title: "Fire Safety Compliance Certificate",
    issuer: "Fire Department",
    category: "Business & Legal Certificates",
    validity: { unit: "year", min: 1, max: 2 },
    credentialUrl: "",
    notes: "Fire safety compliance requires scheduled renewal and audits.",
  },
  {
    code: "GST",
    title: "GST Registration",
    issuer: "Tax Department",
    category: "Business & Legal Certificates",
    validity: { unit: "none" },
    credentialUrl: "https://www.gst.gov.in/",
    notes: "GST registration stays active with periodic compliance filings.",
  },
  {
    code: "TRADE",
    title: "Trade License",
    issuer: "Municipal Authority",
    category: "Business & Legal Certificates",
    validity: { unit: "year", min: 1, max: 3 },
    credentialUrl: "",
    notes: "Trade licenses generally require periodic renewal.",
  },
  {
    code: "FSSAI",
    title: "FSSAI License",
    issuer: "FSSAI",
    category: "Business & Legal Certificates",
    validity: { unit: "year", min: 1, max: 5 },
    credentialUrl: "https://foscos.fssai.gov.in/",
    notes: "FSSAI license validity can range from 1 to 5 years.",
  },
  {
    code: "SHOP",
    title: "Shop & Establishment License",
    issuer: "Labour Department",
    category: "Business & Legal Certificates",
    validity: { unit: "year", min: 1, max: 3 },
    credentialUrl: "",
    notes: "Shop and establishment registrations require renewal as per state rules.",
  },
  {
    code: "ISO",
    title: "ISO 9001 Certification",
    issuer: "Accredited Certification Body",
    category: "Business & Legal Certificates",
    validity: { unit: "year", min: 3, max: 3 },
    credentialUrl: "",
    notes: "ISO certifications follow surveillance audits and a renewal cycle.",
  },
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (items) => items[randInt(0, items.length - 1)];
const toIso = (date) => date.toISOString().slice(0, 10);

export const randomDateBetween = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const minDate = startDate <= endDate ? startDate : endDate;
  const maxDate = startDate <= endDate ? endDate : startDate;
  return new Date(minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime()));
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

const getCredentialId = (profile, id) => {
  const fromId = String(id || "").replace(/\D/g, "").slice(-6);
  const suffix = fromId || String(randInt(100000, 999999));
  return `${profile.code}-${suffix}`;
};

const getComputedExpiryDate = (profile, issueDate) => {
  if (profile.validity.unit === "none") return null;
  if (profile.validity.unit === "month") {
    const months = randInt(profile.validity.min, profile.validity.max);
    return toIso(addMonths(issueDate, months));
  }
  const years = randInt(profile.validity.min, profile.validity.max);
  return toIso(addYears(issueDate, years));
};

export const buildDemoDocumentRecord = ({
  id,
  uid = "demo-user",
  expiryDate,
  allowNoExpiryProfile = true,
  issueDateRangeStart = new Date(2023, 0, 1),
  issueDateRangeEnd = new Date(),
  titleSuffix = "",
} = {}) => {
  const profiles = allowNoExpiryProfile
    ? DEMO_DOCUMENT_PROFILES
    : DEMO_DOCUMENT_PROFILES.filter((p) => p.validity.unit !== "none");
  const profile = pick(profiles.length ? profiles : DEMO_DOCUMENT_PROFILES);
  let issueDateObj = randomDateBetween(issueDateRangeStart, issueDateRangeEnd);
  if (expiryDate !== undefined && expiryDate !== null) {
    const forcedExpiry = new Date(expiryDate);
    if (!Number.isNaN(forcedExpiry.getTime()) && issueDateObj > forcedExpiry) {
      const issueStart = new Date(issueDateRangeStart);
      issueDateObj = forcedExpiry <= issueStart ? forcedExpiry : randomDateBetween(issueStart, forcedExpiry);
    }
  }
  const resolvedExpiry =
    expiryDate === undefined
      ? getComputedExpiryDate(profile, issueDateObj)
      : expiryDate === null
      ? null
      : toIso(new Date(expiryDate));

  return {
    id: id || `demo-doc-${Date.now()}-${randInt(100, 999)}`,
    uid,
    userId: uid,
    title: `${profile.title}${titleSuffix ? ` ${titleSuffix}` : ""}`,
    issuer: profile.issuer,
    category: profile.category,
    issueDate: toIso(issueDateObj),
    expiryDate: resolvedExpiry,
    credentialId: getCredentialId(profile, id),
    credentialUrl: profile.credentialUrl || "",
    notes: profile.notes,
    verified: Math.random() < 0.7,
  };
};

export const buildSeedDemoDocuments = () => [
  {
    title: "Passport",
    issuer: "Passport Authority",
    category: "Personal Documents",
    issueDate: "2021-04-15",
    expiryDate: "2031-04-15",
    credentialId: "PASS-210415",
    credentialUrl: "https://passportindia.gov.in/",
    notes: "Passport renewal is usually required every 5 to 10 years.",
    verified: true,
  },
  {
    title: "Driving License",
    issuer: "RTO",
    category: "Personal Documents",
    issueDate: "2022-09-01",
    expiryDate: "2032-09-01",
    credentialId: "DL-220901",
    credentialUrl: "https://parivahan.gov.in/",
    notes: "Driving license renewal is required after a fixed validity period.",
    verified: true,
  },
  {
    title: "Aadhaar Card",
    issuer: "UIDAI",
    category: "Personal Documents",
    issueDate: "2020-01-20",
    expiryDate: null,
    credentialId: "AADHAAR-200120",
    credentialUrl: "https://uidai.gov.in/",
    notes: "No fixed expiry; periodic demographic and biometric updates are recommended.",
    verified: true,
  },
  {
    title: "AWS Certified Solutions Architect - Associate",
    issuer: "AWS",
    category: "Educational & Professional Certifications",
    issueDate: "2024-02-10",
    expiryDate: "2027-02-10",
    credentialId: "AWS-240210",
    credentialUrl: "https://aws.amazon.com/certification/",
    notes: "Professional IT certification with 2 to 3 year validity.",
    verified: true,
  },
  {
    title: "Medical License Registration",
    issuer: "Medical Council",
    category: "Educational & Professional Certifications",
    issueDate: "2025-01-15",
    expiryDate: "2027-01-15",
    credentialId: "MED-250115",
    credentialUrl: "",
    notes: "Medical and nursing registrations require periodic renewal.",
    verified: true,
  },
  {
    title: "Background Verification Certificate",
    issuer: "Verification Agency",
    category: "Employment & Compliance Certificates",
    issueDate: "2025-10-01",
    expiryDate: "2026-04-01",
    credentialId: "BGV-251001",
    credentialUrl: "",
    notes: "Background verification is generally valid for a limited period.",
    verified: false,
  },
  {
    title: "Police Clearance Certificate",
    issuer: "Police Department",
    category: "Employment & Compliance Certificates",
    issueDate: "2025-11-20",
    expiryDate: "2026-05-20",
    credentialId: "PCC-251120",
    credentialUrl: "",
    notes: "Police clearance usually has short-term validity.",
    verified: false,
  },
  {
    title: "GST Registration",
    issuer: "Tax Department",
    category: "Business & Legal Certificates",
    issueDate: "2022-06-12",
    expiryDate: null,
    credentialId: "GST-220612",
    credentialUrl: "https://www.gst.gov.in/",
    notes: "GST registration stays active with periodic compliance filings.",
    verified: true,
  },
  {
    title: "FSSAI License",
    issuer: "FSSAI",
    category: "Business & Legal Certificates",
    issueDate: "2024-07-01",
    expiryDate: "2027-07-01",
    credentialId: "FSSAI-240701",
    credentialUrl: "https://foscos.fssai.gov.in/",
    notes: "FSSAI license validity can range from 1 to 5 years.",
    verified: true,
  },
  {
    title: "ISO 9001 Certification",
    issuer: "Accredited Certification Body",
    category: "Business & Legal Certificates",
    issueDate: "2024-03-01",
    expiryDate: "2027-03-01",
    credentialId: "ISO-240301",
    credentialUrl: "",
    notes: "ISO certifications follow surveillance audits and a renewal cycle.",
    verified: true,
  },
];
