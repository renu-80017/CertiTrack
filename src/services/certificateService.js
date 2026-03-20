import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import { buildSeedDemoDocuments } from '../utils/demoDocumentProfiles';

export const fetchCertificates = async (uid, role = 'user') => {
  const base = collection(db, 'certificates');
  try {
    const q = role === 'admin'
      ? query(base, orderBy('createdAt', 'desc'))
      : query(base, where('userId', '==', uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (err) {
    console.warn('Ordered fetch failed, falling back to safe query', err?.message || err);
    try {
      const fallbackQ = role === 'admin' ? query(base) : query(base, where('userId', '==', uid));
      const snap2 = await getDocs(fallbackQ);
      return snap2.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (err2) {
      console.error('fetchCertificates fallback failed', err2);
      return [];
    }
  }
};

// Convenience helper to fetch all certificates (admin view)
export const fetchAllCertificates = async () => {
  try {
    return await fetchCertificates(null, 'admin');
  } catch (err) {
    console.error('fetchAllCertificates failed', err);
    return [];
  }
};

export const seedDemoCertificates = async (uid) => {
  if (!uid) {
    return { inserted: 0, message: 'Missing uid for demo seed.' };
  }

  const demoCertificates = buildSeedDemoDocuments();

  try {
    let inserted = 0;

    for (const item of demoCertificates) {
      await addDoc(collection(db, 'certificates'), {
        uid,
        userId: uid,
        title: item.title,
        issuer: item.issuer,
        category: item.category,
        issueDate: item.issueDate,
        expiryDate: item.expiryDate,
        credentialId: item.credentialId,
        credentialUrl: item.credentialUrl,
        notes: item.notes,
        verified: item.verified,
        createdAt: serverTimestamp(),
      });
      inserted += 1;
    }

    return { inserted, message: `Inserted ${inserted} demo documents/certificates.` };
  } catch (error) {
    console.error('seedDemoCertificates Firebase error:', error);
    return { inserted: 0, message: error?.message || String(error) };
  }
};

export const createCertificate = async (payload, file) => {
  let proofUrl = '';
  let proofPath = '';
  if (file) {
    proofPath = `certificates/${payload.uid}/${Date.now()}-${file.name}`;
    const snapshot = await uploadBytes(ref(storage, proofPath), file);
    proofUrl = await getDownloadURL(snapshot.ref);
  }

  await addDoc(collection(db, 'certificates'), {
    ...payload,
    proofUrl,
    proofPath,
    verified: false,
    createdAt: serverTimestamp(),
  });
};

export const updateCertificate = async (id, values, file) => {
  const updatePayload = { ...values };
  if (file) {
    const proofPath = `certificates/${values.uid}/${Date.now()}-${file.name}`;
    const snapshot = await uploadBytes(ref(storage, proofPath), file);
    updatePayload.proofUrl = await getDownloadURL(snapshot.ref);
    updatePayload.proofPath = proofPath;
  }
  await updateDoc(doc(db, 'certificates', id), updatePayload);
};

export const removeCertificate = async ({ id, proofPath }) => {
  await deleteDoc(doc(db, 'certificates', id));
  if (proofPath) {
    try {
      await deleteObject(ref(storage, proofPath));
    } catch {
      // ignore deletion mismatch
    }
  }
};
