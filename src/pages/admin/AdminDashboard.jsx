import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase";
import PieChart from "../../components/PieChart";
import BarChart from "../../components/BarChart";
import { buildDemoDocumentRecord } from "../../utils/demoDocumentProfiles";

const DEMO_CERT_TOTAL = 30;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const buildDemoUsers = () => {
  const totalUsers = randInt(10, 18);
  return Array.from({ length: totalUsers }, (_, i) => ({
    id: `demo-user-${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@certitrack.demo`,
  }));
};

const buildDemoCert = (id, ownerId, expiryDate) =>
  buildDemoDocumentRecord({
    id,
    uid: ownerId,
    expiryDate,
    allowNoExpiryProfile: false,
  });

const createDemoDataset = () => {
  const users = buildDemoUsers();
  const certs = [];
  const now = new Date();
  let idx = 1;

  const mkId = () => `demo-cert-${String(idx++).padStart(3, "0")}`;
  const owner = () => users[randInt(0, users.length - 1)].id;

  // Guaranteed 2 expired certificates
  for (let i = 0; i < 2; i += 1) {
    const expiry = randomDateBetween(new Date(now.getFullYear() - 1, 0, 1), new Date(now.getTime() - 86400000));
    certs.push(buildDemoCert(mkId(), owner(), expiry));
  }

  // Guaranteed 2 renewal certificates (upcoming)
  for (let i = 0; i < 2; i += 1) {
    const expiry = randomDateBetween(new Date(now.getTime() + 86400000), new Date(now.getTime() + 20 * 86400000));
    certs.push(buildDemoCert(mkId(), owner(), expiry));
  }

  // Remaining certificates are mostly valid
  while (certs.length < DEMO_CERT_TOTAL) {
    const expiry = randomDateBetween(new Date(now.getTime() + 40 * 86400000), new Date(now.getTime() + 420 * 86400000));
    certs.push(buildDemoCert(mkId(), owner(), expiry));
  }

  return { users, certs };
};

const daysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
};

const statusOf = (expiryDate) => {
  if (!expiryDate) return "No Expiry";
  const d = daysLeft(expiryDate);
  if (d < 0) return "Expired";
  if (d <= 30) return "Renewing";
  return "Valid";
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [liveCerts, setLiveCerts] = useState([]);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [useDemoData, setUseDemoData] = useState(false);
  const [demoData, setDemoData] = useState(() => createDemoDataset());

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "certificates"),
      (snap) => {
        setLiveCerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed loading all certificates", err);
        setLiveCerts([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const certs = useMemo(() => (useDemoData ? demoData.certs : liveCerts), [useDemoData, demoData, liveCerts]);

  const stats = useMemo(() => {
    const expiredCerts = certs.filter((c) => statusOf(c.expiryDate) === "Expired");
    const active = certs.filter((c) => statusOf(c.expiryDate) === "Valid").length;
    const renewingSoonCerts = certs.filter((c) => {
      const left = daysLeft(c.expiryDate);
      return left !== null && left >= 0 && left <= Number(range);
    });
    const expiringIn2Days = certs.filter((c) => {
      const left = daysLeft(c.expiryDate);
      return left !== null && left >= 0 && left <= 2;
    });

    const totalUsers = useDemoData
      ? demoData.users.length
      : new Set(certs.map((c) => c.userId || c.uid).filter(Boolean)).size;

    return {
      total: certs.length,
      totalUsers,
      expired: expiredCerts.length,
      active,
      renewingSoon: renewingSoonCerts.length,
      expiringIn2Days: expiringIn2Days.length,
      expiredSample: expiredCerts.slice(0, 2),
      renewalSample: renewingSoonCerts.slice(0, 2),
    };
  }, [certs, range, useDemoData, demoData.users.length]);

  const pieData = useMemo(
    () => [
      { label: "Valid", value: stats.active },
      { label: "Expired", value: stats.expired },
      { label: "Renewing", value: stats.renewingSoon },
    ],
    [stats]
  );

  const issuerBarData = useMemo(() => {
    const map = {};
    certs.forEach((c) => {
      const key = (c.issuer || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [certs]);

  const categoryBarData = useMemo(() => {
    const map = {};
    certs.forEach((c) => {
      const key = (c.category || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [certs]);

  return (
    <div className="dashboard-shell glass-card">
      <div className="section-head">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="auth-hint">Welcome Admin: {profile?.email}. Global view of all users.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button type="button" className="btn-secondary" onClick={() => setDemoData(createDemoDataset())}>
            Regenerate Random Data
          </button>
        )}

        <label className="range-control">
          Renewal Range
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="30">Next 30 days</option>
            <option value="45">Next 45 days</option>
            <option value="60">Next 60 days</option>
          </select>
        </label>
      </div>

      {useDemoData && (
        <p style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Demo mode includes random analytics with guaranteed expired and renewal records across all document types.
        </p>
      )}

      {loading && !useDemoData && <p>Loading admin dashboard...</p>}

      <div className="grid-4">
        <article className="glass-card kpi">
          <h4>Total Users</h4>
          <strong>{stats.totalUsers}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Total Certificates</h4>
          <strong>{stats.total}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Expired</h4>
          <strong>{stats.expired}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Renewing Soon</h4>
          <strong>{stats.renewingSoon}</strong>
        </article>
      </div>

      <div className="grid-4" style={{ marginTop: 12 }}>
        <article className="glass-card kpi">
          <h4>Expiring in 2 Days</h4>
          <strong>{stats.expiringIn2Days}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Valid Certificates</h4>
          <strong>{stats.active}</strong>
        </article>
      </div>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <h3>Analytics</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="glass-card" style={{ padding: 14 }}>
            <h4>Valid vs Expired vs Renewing (Pie)</h4>
            <PieChart data={pieData} />
          </div>

          <div className="glass-card" style={{ padding: 14 }}>
            <h4>Certificates by Issuer (Graph)</h4>
            <BarChart data={issuerBarData} />
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="glass-card">
          <h4>Certificates by Category (Graph)</h4>
          <BarChart data={categoryBarData} />
        </div>
      </section>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <h3>Expiry and Renewal Samples</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <h4>Any 2 Expired Certificates</h4>
            <ul>
              {stats.expiredSample.map((c) => (
                <li key={c.id}>
                  {c.title} ({c.expiryDate})
                </li>
              ))}
              {stats.expiredSample.length === 0 && <li>No expired certificates</li>}
            </ul>
          </div>

          <div>
            <h4>Any 2 Renewal Certificates</h4>
            <ul>
              {stats.renewalSample.map((c) => (
                <li key={c.id}>
                  {c.title} ({c.expiryDate})
                </li>
              ))}
              {stats.renewalSample.length === 0 && <li>No renewal certificates</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="glass-card raw-card" style={{ marginTop: 18 }}>
        <h3>Raw Snapshot (first 4)</h3>
        <pre>{JSON.stringify(certs.slice(0, 4), null, 2)}</pre>
      </section>
    </div>
  );
}
