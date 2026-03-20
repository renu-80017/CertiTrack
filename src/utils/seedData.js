import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { buildSeedDemoDocuments } from "./demoDocumentProfiles";

export async function seedDemoCertificates(userId) {
  const certs = buildSeedDemoDocuments();

  for (const cert of certs) {
    await addDoc(collection(db, "certificates"), { ...cert, userId, uid: userId });
  }
}
