import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchCertificates, updateCertificate } from "../../services/certificateService";
import BarChart from "../../components/BarChart";

const DEMO_CERT_TOTAL = 20;
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

const openInNewTab = (url) => {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
};
const googleCourseUrl = (text) => `https://www.google.com/search?q=${encodeURIComponent(`${text} certification`)}`;
const googleLoginUrl = "https://accounts.google.com/signin";
const courseraLoginUrl = "https://www.coursera.org/?authMode=login";
const courseraSearchUrl = (text) => `https://www.coursera.org/search?query=${encodeURIComponent(text)}`;

const daysLeft = (expiryDate) =>
  expiryDate ? Math.ceil((new Date(expiryDate) - new Date()) / 86400000) : null;

const buildDemoRenewalData = (uid = "demo-user") => {
  const certs = [];
  const now = new Date();
  let idx = 1;
  const mkId = () => `demo-user-renew-${String(idx++).padStart(3, "0")}`;

  for (let i = 0; i < 4; i += 1) {
    const expiry = randomDateBetween(new Date(now.getFullYear() - 1, 0, 1), new Date(now.getTime() - 86400000));
    certs.push({
      id: mkId(),
      uid,
      userId: uid,
      title: `${pick(TITLES)} E${i + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  for (let i = 0; i < 6; i += 1) {
    const expiry = randomDateBetween(new Date(now.getTime() + 86400000), new Date(now.getTime() + 30 * 86400000));
    certs.push({
      id: mkId(),
      uid,
      userId: uid,
      title: `${pick(TITLES)} U${i + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  while (certs.length < DEMO_CERT_TOTAL) {
    const noExpiry = Math.random() < 0.18;
    const expiry = randomDateBetween(new Date(now.getTime() + 31 * 86400000), new Date(now.getTime() + 420 * 86400000));
    certs.push({
      id: mkId(),
      uid,
      userId: uid,
      title: `${pick(TITLES)} N${certs.length + 1}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(randomDateBetween(new Date(2023, 0, 1), new Date(2025, 5, 1))),
      expiryDate: noExpiry ? null : toIso(expiry),
      verified: Math.random() < 0.7,
    });
  }

  return certs;
};

export default function RenewalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveItems, setLiveItems] = useState([]);
  const [demoItems, setDemoItems] = useState(() => buildDemoRenewalData());
  const [useDemoData, setUseDemoData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newExpiry, setNewExpiry] = useState("");
  const [courseQuery, setCourseQuery] = useState("");

  const load = async (mounted = { v: true }) => {
    try {
      setLoading(true);
      const data = await fetchCertificates(user.uid);
      if (mounted.v) setLiveItems(data || []);
    } catch (err) {
      console.error("RenewalsPage load failed", err);
      if (mounted.v) setLiveItems([]);
    } finally {
      if (mounted.v) setLoading(false);
    }
  };

  useEffect(() => {
    const mounted = { v: true };
    if (user?.uid) load(mounted);
    return () => {
      mounted.v = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !useDemoData) return;
    setDemoItems(buildDemoRenewalData(user.uid));
  }, [user?.uid, useDemoData]);

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
    if (!selected || !user?.uid || !newExpiry) return;
    try {
      if (useDemoData) {
        setDemoItems((prev) =>
          prev.map((item) => (item.id === selected.id ? { ...item, expiryDate: newExpiry } : item))
        );
      } else {
        await updateCertificate(selected.id, { ...selected, uid: user.uid, expiryDate: newExpiry });
        const data = await fetchCertificates(user.uid);
        setLiveItems(data || []);
      }

      setSelected(null);
      setNewExpiry("");
    } catch (err) {
      console.error("Renew now failed", err);
      alert(`Failed to update renewal: ${err?.message || err}`);
    }
  };

  const openGoogleSearch = () => {
    const text = courseQuery.trim();
    openInNewTab(googleCourseUrl(text || "best online certification courses"));
  };

  const openGoogleLogin = () => {
    openInNewTab(googleLoginUrl);
  };

  const openCourseraLogin = () => {
    openInNewTab(courseraLoginUrl);
  };

  const openCourseraSearch = () => {
    const text = courseQuery.trim();
    if (!text) {
      alert("Type a course name first.");
      return;
    }
    openInNewTab(courseraSearchUrl(text));
  };

  const goToCertificatesWithQuery = () => {
    const text = courseQuery.trim();
    if (!text) {
      alert("Type a course name first.");
      return;
    }
    navigate(`/certificates?course=${encodeURIComponent(text)}`);
  };

  const issuerBarData = useMemo(() => {
    const map = {};
    items.forEach((c) => {
      const key = (c.issuer || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const rawIssuerSummary = useMemo(() => {
    const map = {};
    items.forEach((c) => {
      const key = c.issuer || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([issuer, count]) => ({ issuer, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const rawStatusSummary = useMemo(() => {
    return [
      { status: "Urgent (0-30)", count: groups.urgent.length },
      { status: "Upcoming (31-60)", count: groups.upcoming.length },
      { status: "Expired", count: groups.expired.length },
      { status: "No Expiry", count: groups.noExpiry.length },
    ];
  }, [groups]);

  const rawSnapshot = useMemo(() => {
    return items.slice(0, 10).map((c) => ({
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      expiryDate: c.expiryDate || null,
      daysLeft: daysLeft(c.expiryDate),
    }));
  }, [items]);

  return (
    <div>
      <h2>Renewals</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setDemoItems(buildDemoRenewalData(user?.uid || "demo-user"))}
          >
            Regenerate Random Data
          </button>
        )}
      </div>

      {useDemoData && (
        <p style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Demo mode is ON with random renewals data.
        </p>
      )}

      {loading && !useDemoData && <p>Loading renewals...</p>}

      <section className="glass-card" style={{ marginBottom: 12 }}>
        <h3>Course Search and Add</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Type course/provider name (example: Coursera)"
            value={courseQuery}
            onChange={(e) => setCourseQuery(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={openGoogleSearch}>
              Search Google
            </button>
            <button type="button" className="btn-secondary" onClick={openGoogleLogin}>
              Open Google Login
            </button>
            <button type="button" className="btn-secondary" onClick={openCourseraLogin}>
              Open Coursera Login
            </button>
            <button type="button" className="btn-secondary" onClick={openCourseraSearch}>
              Search Coursera
            </button>
            <button type="button" className="btn-primary" onClick={goToCertificatesWithQuery}>
              Add to Certificates Page
            </button>
          </div>
        </div>
      </section>

      <div className="chip-row">
        <span>Expiring Soon: {groups.urgent.length}</span>
        <span>Upcoming: {groups.upcoming.length}</span>
        <span>Expired: {groups.expired.length}</span>
      </div>

      {["urgent", "upcoming", "expired", "noExpiry"].map((key) => (
        <div key={key} className="glass-card">
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
                {item.title} - {item.issuer}
              </span>
              <button onClick={() => setSelected(item)}>{key === "upcoming" ? "Set Reminder" : "Renew Now"}</button>
            </div>
          ))}

          {groups[key].length === 0 && <p>No records.</p>}
        </div>
      ))}

      {selected && (
        <div className="glass-card modal-like">
          <h3>Renew: {selected.title}</h3>
          <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
          <button className="btn-primary" onClick={renewNow}>
            Update Renewal
          </button>
        </div>
      )}

      <section className="glass-card" style={{ marginTop: 18 }}>
        <h3>Issuer Analytics</h3>
        <BarChart data={issuerBarData} />
      </section>

      <section className="glass-card raw-card" style={{ marginTop: 16 }}>
        <h3>Raw Analytics Snapshot</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h4>Issuer Summary</h4>
            <ul>
              {rawIssuerSummary.map((r) => (
                <li key={r.issuer}>
                  {r.issuer} - <strong>{r.count}</strong>
                </li>
              ))}
              {rawIssuerSummary.length === 0 && <li>No data</li>}
            </ul>
          </div>

          <div>
            <h4>Status Summary</h4>
            <ul>
              {rawStatusSummary.map((r) => (
                <li key={r.status}>
                  {r.status} - <strong>{r.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr style={{ margin: "14px 0" }} />

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>View Raw JSON (first 10)</summary>
          <pre style={{ maxHeight: 280, overflow: "auto" }}>{JSON.stringify(rawSnapshot, null, 2)}</pre>
        </details>
      </section>
    </div>
  );
}
