import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import BarChart from "../../components/BarChart";
import { db } from "../../firebase";
import { buildDemoDocumentRecord } from "../../utils/demoDocumentProfiles";

const DEMO_ADMIN_COUNT = 1;
const DEMO_CERT_TOTAL = 30;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const toIso = (date) => date.toISOString().slice(0, 10);

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const buildRandomUsers = (totalUsers) => {
  const users = [];

  for (let i = 0; i < totalUsers; i += 1) {
    const isAdmin = i < DEMO_ADMIN_COUNT;
    const idx = i + 1;
    users.push({
      id: `demo-user-${idx}`,
      name: `User ${idx}`,
      email: `user${idx}@certitrack.demo`,
      role: isAdmin ? "admin" : "user",
      createdAt: toIso(randomDateBetween(new Date(2024, 0, 1), new Date())),
    });
  }

  return users;
};

const buildRandomCerts = (totalCerts, users) => {
  const certs = [];

  for (let i = 0; i < totalCerts; i += 1) {
    const issueDateObj = randomDateBetween(new Date(2023, 0, 1), new Date());
    const expiryDateObj = randomDateBetween(new Date(2025, 0, 1), new Date(2027, 11, 31));
    const owner = users[randInt(0, users.length - 1)];
    const certNo = String(i + 1).padStart(3, "0");

    certs.push(
      buildDemoDocumentRecord({
        id: `demo-cert-${certNo}`,
        uid: owner.id,
        expiryDate: expiryDateObj,
        issueDateRangeStart: new Date(2023, 0, 1),
        issueDateRangeEnd: issueDateObj,
      })
    );
  }

  return certs;
};

const createRandomDataset = () => {
  const totalUsers = randInt(10, 18);
  const users = buildRandomUsers(totalUsers);
  const certs = buildRandomCerts(DEMO_CERT_TOTAL, users);
  return { users, certs };
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useDemoData, setUseDemoData] = useState(true);
  const [demoData, setDemoData] = useState(() => createRandomDataset());

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        const usersSnap = await getDocs(collection(db, "users"));
        const usersList = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(usersList);

        const certsSnap = await getDocs(collection(db, "certificates"));
        const certsList = certsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCerts(certsList);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const activeUsers = useMemo(() => (useDemoData ? demoData.users : users), [useDemoData, demoData, users]);
  const activeCerts = useMemo(() => (useDemoData ? demoData.certs : certs), [useDemoData, demoData, certs]);

  const userStats = useMemo(() => {
    const totalUsers = activeUsers.length;
    const admins = activeUsers.filter((u) => (u.role || "user") === "admin").length;
    const normal = totalUsers - admins;
    return { totalUsers, admins, normal };
  }, [activeUsers]);

  const certStats = useMemo(() => {
    const totalCerts = activeCerts.length;
    const verified = activeCerts.filter((c) => c.verified === true).length;
    const pending = totalCerts - verified;
    return { totalCerts, verified, pending };
  }, [activeCerts]);

  const issuerBarData = useMemo(() => {
    const map = {};
    activeCerts.forEach((c) => {
      const key = (c.issuer || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [activeCerts]);

  const usersRaw = useMemo(
    () =>
      activeUsers.slice(0, 10).map((u) => ({
        uid: u.id,
        email: u.email,
        name: u.name,
        role: u.role || "user",
        createdAt: u.createdAt || null,
      })),
    [activeUsers]
  );

  const certsRaw = useMemo(
    () =>
      activeCerts.slice(0, 10).map((c) => ({
        id: c.id,
        uid: c.uid || c.userId || null,
        title: c.title,
        issuer: c.issuer,
        category: c.category,
        issueDate: c.issueDate || null,
        expiryDate: c.expiryDate || null,
        verified: c.verified === true,
      })),
    [activeCerts]
  );

  return (
    <div className="glass-card">
      <h2>Admin Panel</h2>
      <p>Governance + visibility for users, roles, and certificate verification.</p>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button type="button" className="btn-secondary" onClick={() => setDemoData(createRandomDataset())}>
            Regenerate Random Data
          </button>
        )}
      </div>

      {useDemoData && (
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
          Demo mode is ON: Admins = 1 and total records = 30 with mixed certificate/document details.
        </p>
      )}

      {loading && <p>Loading admin metrics...</p>}

      <div className="grid-4" style={{ marginTop: 14 }}>
        <article className="glass-card kpi">
          <h4>Total Users</h4>
          <strong>{userStats.totalUsers}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Admins</h4>
          <strong>{userStats.admins}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Normal Users</h4>
          <strong>{userStats.normal}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Total Certificates</h4>
          <strong>{certStats.totalCerts}</strong>
        </article>
      </div>

      <div className="grid-4" style={{ marginTop: 12 }}>
        <article className="glass-card kpi">
          <h4>Verified</h4>
          <strong>{certStats.verified}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Pending Verification</h4>
          <strong>{certStats.pending}</strong>
        </article>

        <article className="glass-card kpi">
          <h4>Roles Location</h4>
          <strong style={{ fontSize: 12 }}>users/{`{uid}`}.role</strong>
        </article>

        <article className="glass-card kpi">
          <h4>Verification Flag</h4>
          <strong style={{ fontSize: 12 }}>certificates/{`{id}`}.verified</strong>
        </article>
      </div>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <h3>Certificates by Issuer</h3>
        <BarChart data={issuerBarData} />
      </section>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <h3>Admin Notes</h3>
        <ul>
          <li>Admin roles are managed in <code>users/{`{uid}`}.role</code>.</li>
          <li>Certificate verification can be tracked using <code>certificates/{`{id}`}.verified</code>.</li>
          <li>Recommended: Only admins can update verification status.</li>
        </ul>
      </section>

      <section className="glass-card raw-card" style={{ marginTop: 18 }}>
        <h3>Raw Snapshot (Users + Certificates)</h3>

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>View Raw Users (first 10)</summary>
          <pre style={{ maxHeight: 260, overflow: "auto" }}>{JSON.stringify(usersRaw, null, 2)}</pre>
        </details>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>View Raw Certificates (first 10)</summary>
          <pre style={{ maxHeight: 260, overflow: "auto" }}>{JSON.stringify(certsRaw, null, 2)}</pre>
        </details>
      </section>
    </div>
  );
}
