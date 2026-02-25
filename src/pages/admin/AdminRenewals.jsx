import { useEffect, useMemo, useState } from "react";
import { fetchCertificates, updateCertificate } from "../../services/certificateService";
import BarChart from "../../components/BarChart";

const DEMO_CERT_TOTAL = 30;
const ISSUERS = ["AWS", "Cisco", "Google", "Microsoft", "Oracle", "Coursera", "ServiceNow"];
const CATEGORIES = ["Cloud", "Networking", "Security", "Data", "DevOps", "IT Support"];
const TITLES = [
  "Solutions Architect",
  "Cloud Practitioner",
  "Security Analyst",
  "Network Associate",
  "Data Engineer",
  "DevOps Engineer",
  "System Administrator",
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (items) => items[randInt(0, items.length - 1)];
const toIso = (date) => date.toISOString().slice(0, 10);

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const buildDemoUsers = () => {
  const totalUsers = randInt(10, 18);
  return Array.from({ length: totalUsers }, (_, i) => `demo-user-${i + 1}`);
};

const buildDemoRenewalData = () => {
  const users = buildDemoUsers();
  const certs = [];
  const now = new Date();
  let idx = 1;

  const mkId = () => `demo-renew-${String(idx++).padStart(3, "0")}`;
  const owner = () => users[randInt(0, users.length - 1)];

  for (let i = 0; i < 5; i += 1) {
    const expiry = randomDateBetween(new Date(now.getFullYear() - 1, 0, 1), new Date(now.getTime() - 86400000));
    certs.push({
      id: mkId(),
      uid: owner(),
      title: `${pick(TITLES)} E${i + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  for (let i = 0; i < 8; i += 1) {
    const expiry = randomDateBetween(new Date(now.getTime() + 86400000), new Date(now.getTime() + 30 * 86400000));
    certs.push({
      id: mkId(),
      uid: owner(),
      title: `${pick(TITLES)} U${i + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  for (let i = 0; i < 7; i += 1) {
    const expiry = randomDateBetween(new Date(now.getTime() + 31 * 86400000), new Date(now.getTime() + 60 * 86400000));
    certs.push({
      id: mkId(),
      uid: owner(),
      title: `${pick(TITLES)} N${i + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  for (let i = certs.length; i < DEMO_CERT_TOTAL; i += 1) {
    const noExpiry = Math.random() < 0.15;
    const expiry = randomDateBetween(new Date(now.getTime() + 61 * 86400000), new Date(now.getTime() + 420 * 86400000));
    certs.push({
      id: mkId(),
      uid: owner(),
      title: `${pick(TITLES)} V${i + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: noExpiry ? null : toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  return certs;
};

const daysLeft = (expiryDate) =>
  expiryDate ? Math.ceil((new Date(expiryDate) - new Date()) / 86400000) : null;

export default function AdminRenewals() {
  const [liveItems, setLiveItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newExpiry, setNewExpiry] = useState("");
  const [loading, setLoading] = useState(true);
  const [useDemoData, setUseDemoData] = useState(true);
  const [demoItems, setDemoItems] = useState(() => buildDemoRenewalData());

  const load = async (mounted = { v: true }) => {
    try {
      setLoading(true);
      const data = await fetchCertificates(null, true);
      if (mounted.v) setLiveItems(data || []);
    } catch (err) {
      console.error("AdminRenewals load failed", err);
      if (mounted.v) setLiveItems([]);
    } finally {
      if (mounted.v) setLoading(false);
    }
  };

  useEffect(() => {
    const mounted = { v: true };
    load(mounted);
    return () => {
      mounted.v = false;
    };
  }, []);

  const items = useMemo(() => (useDemoData ? demoItems : liveItems), [useDemoData, demoItems, liveItems]);

  const groups = useMemo(() => {
    const g = { urgent: [], upcoming: [], expired: [], noExpiry: [] };
    items.forEach((item) => {
      const d = daysLeft(item.expiryDate);
      if (d === null) g.noExpiry.push(item);
      else if (d < 0) g.expired.push(item);
      else if (d <= 30) g.urgent.push(item);
      else if (d <= 60) g.upcoming.push(item);
    });
    return g;
  }, [items]);

  const renewNow = async () => {
    if (!selected || !newExpiry) return;
    try {
      if (useDemoData) {
        setDemoItems((prev) =>
          prev.map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  expiryDate: newExpiry,
                }
              : item
          )
        );
      } else {
        await updateCertificate(selected.id, { ...selected, expiryDate: newExpiry });
        const data = await fetchCertificates(null, true);
        setLiveItems(data || []);
      }

      setSelected(null);
      setNewExpiry("");
    } catch (err) {
      console.error("Admin renew failed", err);
      alert(`Failed to update renewal: ${err?.message || err}`);
    }
  };

  const issuerBarData = useMemo(() => {
    const map = {};
    items.forEach((c) => {
      const key = (c.issuer || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  const rawSnapshot = useMemo(() => {
    return items.slice(0, 10).map((c) => ({
      id: c.id,
      uid: c.uid || c.userId || null,
      title: c.title,
      issuer: c.issuer,
      expiryDate: c.expiryDate || null,
      daysLeft: daysLeft(c.expiryDate),
    }));
  }, [items]);

  useEffect(() => {
    setSelected(null);
    setNewExpiry("");
  }, [useDemoData]);

  return (
    <div>
      <h2>Admin - Renewals (All Users)</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setDemoItems(buildDemoRenewalData());
              setSelected(null);
              setNewExpiry("");
            }}
          >
            Regenerate Random Data
          </button>
        )}
      </div>

      {useDemoData && (
        <p style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Demo mode is ON with random renewal data (expired, urgent, upcoming, and no-expiry).
        </p>
      )}

      {loading && !useDemoData && <p>Loading renewals...</p>}

      <div className="chip-row">
        <span>Expiring Soon: {groups.urgent.length}</span>
        <span>Upcoming: {groups.upcoming.length}</span>
        <span>Expired: {groups.expired.length}</span>
        <span>No Expiry: {groups.noExpiry.length}</span>
      </div>

      <section className="glass-card" style={{ marginTop: 16 }}>
        <h3>Issuer Analytics</h3>
        <BarChart data={issuerBarData} />
      </section>

      {["urgent", "upcoming", "expired", "noExpiry"].map((key) => (
        <div key={key} className="glass-card" style={{ marginTop: 12 }}>
          <h3>
            {key === "urgent"
              ? "Urgent (0-30 days)"
              : key === "upcoming"
              ? "Upcoming (31-60 days)"
              : key === "expired"
              ? "Expired"
              : "No Expiry"}
          </h3>

          {groups[key].map((item) => (
            <div className="list-row" key={item.id}>
              <span>
                {item.title} - {item.issuer} - <b style={{ fontSize: 12 }}>{item.uid || item.userId || "uid?"}</b>
              </span>
              <button onClick={() => setSelected(item)}>Renew / Update</button>
            </div>
          ))}

          {groups[key].length === 0 && <p>No records.</p>}
        </div>
      ))}

      {selected && (
        <div className="glass-card modal-like" style={{ marginTop: 12 }}>
          <h3>Renew: {selected.title}</h3>
          <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
          <button className="btn-primary" onClick={renewNow}>
            Update Renewal
          </button>
        </div>
      )}

      <section className="glass-card raw-card" style={{ marginTop: 16 }}>
        <h3>Raw Snapshot (first 10)</h3>
        <pre style={{ maxHeight: 280, overflow: "auto" }}>{JSON.stringify(rawSnapshot, null, 2)}</pre>
      </section>
    </div>
  );
}
