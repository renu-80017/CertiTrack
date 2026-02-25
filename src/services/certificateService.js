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

  const demoCertificates = [
    {
      title: 'Cisco Certified Network Associate (CCNA)',
      issuer: 'Cisco',
      category: 'Networking',
      issueDate: '2024-03-10',
      expiryDate: '2027-03-10',
      credentialId: 'CISCO-CCNA-240310',
      credentialUrl: 'https://www.cisco.com/',
      notes: 'Demo certificate for dashboard testing.',
      verified: true,
    },
    {
      title: 'Google IT Support Professional Certificate',
      issuer: 'Coursera',
      category: 'IT Support',
      issueDate: '2023-11-21',
      expiryDate: '2026-11-21',
      credentialId: 'COURSERA-GITSP-231121',
      credentialUrl: 'https://www.coursera.org/',
      notes: 'Demo certificate for dashboard testing.',
      verified: true,
    },
    {
      title: 'AWS Certified Solutions Architect - Associate',
      issuer: 'AWS',
      category: 'Cloud',
      issueDate: '2024-01-15',
      expiryDate: '2027-01-15',
      credentialId: 'AWS-SAA-240115',
      credentialUrl: 'https://aws.amazon.com/certification/',
      notes: 'Demo certificate for dashboard testing.',
      verified: true,
    },
    {
      title: 'ServiceNow Certified System Administrator',
      issuer: 'ServiceNow',
      category: 'ITSM',
      issueDate: '2024-05-08',
      expiryDate: '2027-05-08',
      credentialId: 'SNOW-CSA-240508',
      credentialUrl: 'https://www.servicenow.com/services/training-and-certification.html',
      notes: 'Demo certificate for dashboard testing.',
      verified: true,
    },
  ];

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

    return { inserted, message: `Inserted ${inserted} demo certificates.` };
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
