import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase";
import { formatDate, getCertificateStatus } from "../../utils/certificateUtils";
import PieChart from "../../components/PieChart";
import BarChart from "../../components/BarChart";
import { buildDemoDocumentRecord } from "../../utils/demoDocumentProfiles";

const DEMO_CERT_TOTAL = 18;

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const buildDemoCertificates = (uid = "demo-user") => {
  const now = new Date();
  const certs = [];
  let idx = 1;

  const mkId = () => `demo-user-cert-${String(idx++).padStart(3, "0")}`;

  for (let i = 0; i < 2; i += 1) {
    const expiry = randomDateBetween(new Date(now.getFullYear() - 1, 0, 1), new Date(now.getTime() - 86400000));
    certs.push(
      buildDemoDocumentRecord({
        id: mkId(),
        uid,
        expiryDate: expiry,
        allowNoExpiryProfile: false,
      })
    );
  }

  for (let i = 0; i < 4; i += 1) {
    const expiry = randomDateBetween(new Date(now.getTime() + 86400000), new Date(now.getTime() + 30 * 86400000));
    certs.push(
      buildDemoDocumentRecord({
        id: mkId(),
        uid,
        expiryDate: expiry,
        allowNoExpiryProfile: false,
      })
    );
  }

  while (certs.length < DEMO_CERT_TOTAL) {
    const expiry = randomDateBetween(new Date(now.getTime() + 31 * 86400000), new Date(now.getTime() + 420 * 86400000));
    certs.push(
      buildDemoDocumentRecord({
        id: mkId(),
        uid,
        expiryDate: expiry,
      })
    );
  }

  return certs;
};

const daysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
};

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [liveCerts, setLiveCerts] = useState([]);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [useDemoData, setUseDemoData] = useState(false);
  const [demoCerts, setDemoCerts] = useState(() => buildDemoCertificates());

  useEffect(() => {
    if (!user?.uid) {
      setLiveCerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, "certificates"), where("userId", "==", user.uid)),
      (snap) => {
        setLiveCerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("UserDashboard load failed", err);
        setLiveCerts([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !useDemoData) return;
    setDemoCerts(buildDemoCertificates(user.uid));
  }, [user?.uid, useDemoData]);

  const certs = useMemo(() => (useDemoData ? demoCerts : liveCerts), [useDemoData, demoCerts, liveCerts]);

  const stats = useMemo(() => {
    const expired = certs.filter((c) => getCertificateStatus(c.expiryDate) === "Expired").length;
    const active = certs.filter((c) => getCertificateStatus(c.expiryDate) === "Active").length;
    const renewingSoon = certs.filter((c) => {
      const left = daysLeft(c.expiryDate);
      return left !== null && left >= 0 && left <= Number(range);
    }).length;
    return { total: certs.length, expired, active, renewingSoon };
  }, [certs, range]);

  const upcoming = useMemo(
    () =>
      certs
        .filter((c) => c.expiryDate)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
        .slice(0, 6),
    [certs]
  );

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
      .sort((a, b) => b.value - a.value);
  }, [certs]);

  return (
    <div className="dashboard-shell glass-card">
      <div className="section-head">
        <div>
          <h2>User Dashboard</h2>
          <p className="auth-hint">
            Welcome, {profile?.email || user?.email}. Track certificates, renewals, and reminders.
          </p>
        </div>

        <label className="range-control">
          Expiring Soon Range
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="30">Next 30 days</option>
            <option value="45">Next 45 days</option>
            <option value="60">Next 60 days</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setDemoCerts(buildDemoCertificates(user?.uid || "demo-user"))}
          >
            Regenerate Random Data
          </button>
        )}
      </div>

      {useDemoData && (
        <p style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Demo mode is ON with randomized dashboard data across certificates and personal/legal documents.
        </p>
      )}

      {loading && !useDemoData && <p>Loading dashboard...</p>}

      <div className="grid-4">
        <article className="glass-card kpi">
          <h4>Total Certificates</h4>
          <strong>{stats.total}</strong>
        </article>
        <article className="glass-card kpi">
          <h4>Active / Valid</h4>
          <strong>{stats.active}</strong>
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

      <div className="actions-row">
        <Link to="/certificates" className="btn-primary">
          + Add New Certificate
        </Link>
        <Link to="/certificates" className="btn-secondary">
          View All Certificates
        </Link>
        <Link to="/renewals" className="btn-secondary">
          Set Reminder
        </Link>
        <Link to="/certificates" className="btn-secondary">
          Upload PDF / Image
        </Link>
      </div>

      <div className="split-two">
        <section className="glass-card">
          <h3>Notifications / Alerts</h3>
          <ul>
            {upcoming.slice(0, 3).map((item) => (
              <li key={item.id}>
                {item.title} from {item.issuer}{" "}
                {daysLeft(item.expiryDate) < 0 ? "has expired" : `expires in ${daysLeft(item.expiryDate)} days`}
              </li>
            ))}
            {upcoming.length === 0 && <li>No alerts yet.</li>}
          </ul>
        </section>

        <section className="glass-card">
          <h3>Recent Activity</h3>
          <ul>
            {certs.slice(0, 3).map((item) => (
              <li key={item.id}>
                Added/updated {item.title} ({item.issuer})
              </li>
            ))}
            {certs.length === 0 && <li>No activity yet.</li>}
          </ul>
        </section>
      </div>

      <section className="glass-card table-wrap">
        <h3>Upcoming Renewals</h3>
        <table>
          <thead>
            <tr>
              <th>Certificate</th>
              <th>Issuer</th>
              <th>Expiry Date</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.issuer}</td>
                <td>{formatDate(item.expiryDate)}</td>
                <td>{daysLeft(item.expiryDate)}</td>
                <td>{getCertificateStatus(item.expiryDate)}</td>
                <td>
                  <Link to="/renewals" className="btn-secondary">
                    Renew / View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {upcoming.length === 0 && <p>No certificates found.</p>}
      </section>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <h3>Analytics</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="glass-card" style={{ padding: 14 }}>
            <h4>Valid vs Expired vs Renewing</h4>
            <PieChart data={pieData} />
          </div>

          <div className="glass-card" style={{ padding: 14 }}>
            <h4>Certificates by Issuer</h4>
            <BarChart data={issuerBarData} />
          </div>
        </div>
      </section>

      <section className="glass-card raw-card" style={{ marginTop: 18 }}>
        <h3>Raw Information Snapshot</h3>
        <p>Quick audit: showing first 2 certificate objects.</p>
        <pre>{JSON.stringify(certs.slice(0, 2), null, 2)}</pre>
      </section>
    </div>
  );
}
