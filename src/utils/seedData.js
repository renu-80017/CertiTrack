import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function seedDemoCertificates(userId) {
  const certs = [
    {
      title: "Cisco CCNA",
      provider: "Cisco",
      coreArea: "Networking",
      issueDate: "2024-05-10",
      expiryDate: "2027-05-10",
      status: "active",
      userId,
    },
    {
      title: "AWS Cloud Practitioner",
      provider: "AWS",
      coreArea: "Cloud",
      issueDate: "2023-08-01",
      expiryDate: "2026-08-01",
      status: "active",
      userId,
    },
    {
      title: "Google Data Analytics",
      provider: "Google",
      coreArea: "Data Science",
      issueDate: "2022-03-15",
      expiryDate: "2025-03-15",
      status: "expiring",
      userId,
    },
    {
      title: "Azure Fundamentals",
      provider: "Microsoft",
      coreArea: "Cloud",
      issueDate: "2021-01-01",
      expiryDate: "2024-01-01",
      status: "expired",
      userId,
    },
  ];

  for (const cert of certs) {
    await addDoc(collection(db, "certificates"), cert);
  }
}
