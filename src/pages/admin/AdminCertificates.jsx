import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { fetchCertificates, removeCertificate } from "../../services/certificateService";
import { formatDate, getCertificateStatus } from "../../utils/certificateUtils";
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

const openInNewTab = (url) => {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
};
const googleCourseUrl = (text) => `https://www.google.com/search?q=${encodeURIComponent(`${text} certification`)}`;
const googleLoginUrl = "https://accounts.google.com/signin";
const courseraLoginUrl = "https://www.coursera.org/?authMode=login";
const courseraSearchUrl = (text) => `https://www.coursera.org/search?query=${encodeURIComponent(text)}`;

const buildDemoUsers = () => {
  const totalUsers = randInt(10, 18);
  return Array.from({ length: totalUsers }, (_, i) => `demo-user-${i + 1}`);
};

const buildDemoCertificates = () => {
  const users = buildDemoUsers();
  const now = new Date();

  return Array.from({ length: DEMO_CERT_TOTAL }, (_, i) => {
    const certNo = String(i + 1).padStart(3, "0");
    const uid = users[randInt(0, users.length - 1)];
    const issueDate = randomDateBetween(new Date(2023, 0, 1), new Date(2025, 6, 1));
    const expiryDate = randomDateBetween(
      new Date(now.getTime() - 120 * 86400000),
      new Date(now.getTime() + 420 * 86400000)
    );
    return {
      id: `demo-cert-${certNo}`,
      uid,
      userId: uid,
      title: `${pick(TITLES)} ${certNo}`,
      issuer: pick(ISSUERS),
      category: pick(CATEGORIES),
      issueDate: toIso(issueDate),
      expiryDate: toIso(expiryDate),
      verified: Math.random() < 0.7,
      credentialId: "",
      credentialUrl: "",
      notes: "",
    };
  });
};

const daysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
};

export default function AdminCertificates() {
  const [liveItems, setLiveItems] = useState([]);
  const [query, setQuery] = useState("");
  const [filterIssuer, setFilterIssuer] = useState("all");
  const [useDemoData, setUseDemoData] = useState(true);
  const [demoItems, setDemoItems] = useState(() => buildDemoCertificates());
  const [loading, setLoading] = useState(true);
  const [courseQuery, setCourseQuery] = useState("");
  const [targetUid, setTargetUid] = useState("");

  const load = async (mounted = { v: true }) => {
    try {
      setLoading(true);
      const data = await fetchCertificates(null, true);
      if (mounted.v) setLiveItems(data || []);
    } catch (err) {
      console.error("AdminCertificates load failed", err);
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

  const issuers = useMemo(
    () => ["all", ...new Set(items.map((i) => i.issuer).filter(Boolean))],
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const ownerId = i.uid || i.userId || "";
      const text = `${i.title || ""} ${i.issuer || ""} ${i.category || ""} ${ownerId}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const issuerOk = filterIssuer === "all" || i.issuer === filterIssuer;
      return text && issuerOk;
    });
  }, [items, query, filterIssuer]);

  const issuerBarData = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const key = (c.issuer || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const rawSnapshot = useMemo(() => {
    return filtered.slice(0, 10).map((c) => ({
      id: c.id,
      uid: c.uid || c.userId || null,
      title: c.title,
      issuer: c.issuer,
      category: c.category,
      issueDate: c.issueDate || null,
      expiryDate: c.expiryDate || null,
      status: getCertificateStatus(c.expiryDate),
      daysLeft: daysLeft(c.expiryDate),
    }));
  }, [filtered]);

  const onDelete = async (item) => {
    if (useDemoData) {
      setDemoItems((prev) => prev.filter((x) => x.id !== item.id));
      return;
    }
    await removeCertificate(item);
    await load();
  };

  const addFromSource = async (source, ownerIdOverride = null) => {
    const ownerId = ownerIdOverride || source.userId || source.uid || targetUid.trim();
    if (!ownerId) {
      alert("Enter target User UID first.");
      return;
    }

    const payload = {
      title: source.title || "New Certificate",
      issuer: source.issuer || "Unknown",
      category: source.category || "General",
      issueDate: source.issueDate || toIso(new Date()),
      expiryDate: source.expiryDate || toIso(new Date(Date.now() + 365 * 86400000)),
      credentialId: source.credentialId || "",
      credentialUrl: source.credentialUrl || "",
      notes: source.notes || "",
      proofUrl: source.proofUrl || "",
      userId: ownerId,
      uid: ownerId,
      verified: source.verified === true,
    };

    if (useDemoData) {
      const demoCert = {
        ...payload,
        id: `demo-cert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      setDemoItems((prev) => [demoCert, ...prev]);
      return;
    }

    await addDoc(collection(db, "certificates"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await load();
  };

  const addFromCourseSearch = async () => {
    const text = courseQuery.trim();
    if (!text) {
      alert("Type a course name first.");
      return;
    }

    const issuerGuess = text.toLowerCase().includes("coursera") ? "Coursera" : "Unknown";

    await addFromSource({
      title: text,
      issuer: issuerGuess,
      category: "Online Course",
      issueDate: toIso(new Date()),
      expiryDate: toIso(new Date(Date.now() + 365 * 86400000)),
      credentialUrl: text.toLowerCase().includes("coursera") ? courseraSearchUrl(text) : googleCourseUrl(text),
      notes: "Added from admin course search.",
      verified: false,
    });
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

  return (
    <div>
      <div className="section-head">
        <h2>Admin - Certificates (All Users)</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button type="button" className="btn-secondary" onClick={() => setDemoItems(buildDemoCertificates())}>
            Regenerate Random Data
          </button>
        )}
      </div>

      {useDemoData && (
        <p style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Demo mode is ON with random certificates data.
        </p>
      )}

      {loading && !useDemoData && <p>Loading certificates...</p>}

      <section className="glass-card" style={{ marginBottom: 12 }}>
        <h3>Course Search and Quick Add</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Type course/provider name (example: Coursera Data Analytics)"
            value={courseQuery}
            onChange={(e) => setCourseQuery(e.target.value)}
          />
          <input
            placeholder="Target User UID (required for add)"
            value={targetUid}
            onChange={(e) => setTargetUid(e.target.value)}
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
            <button type="button" className="btn-primary" onClick={addFromCourseSearch}>
              Add Certificate
            </button>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          External websites cannot auto-sync course details. After search/login, use Add Certificate or Add Copy.
        </p>
      </section>

      <div className="glass-card filters-row">
        <input
          placeholder="Search title / issuer / category / uid"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={filterIssuer} onChange={(e) => setFilterIssuer(e.target.value)}>
          {issuers.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      <section className="glass-card" style={{ marginTop: 16 }}>
        <h3>Issuer Analytics</h3>
        <BarChart data={issuerBarData} />
      </section>

      <div className="glass-card table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>User UID</th>
              <th>Title</th>
              <th>Issuer</th>
              <th>Category</th>
              <th>Issue</th>
              <th>Expiry</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Add Certificate</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => {
              const status = getCertificateStatus(item.expiryDate);
              return (
                <tr key={item.id}>
                  <td style={{ fontSize: 12 }}>{item.uid || item.userId || "-"}</td>
                  <td>{item.title}</td>
                  <td>{item.issuer}</td>
                  <td>{item.category || "-"}</td>
                  <td>{formatDate(item.issueDate)}</td>
                  <td>{formatDate(item.expiryDate)}</td>
                  <td>{daysLeft(item.expiryDate) ?? "-"}</td>
                  <td>
                    <span className={`status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
                  </td>
                  <td>
                    <button type="button" onClick={() => addFromSource({ ...item, title: `${item.title} Copy` })}>
                      Add Copy
                    </button>
                  </td>
                  <td>
                    <button onClick={() => onDelete(item)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && <p>No certificates found.</p>}
      </div>

      <section className="glass-card raw-card" style={{ marginTop: 16 }}>
        <h3>Raw Snapshot (first 10 filtered)</h3>
        <pre style={{ maxHeight: 280, overflow: "auto" }}>{JSON.stringify(rawSnapshot, null, 2)}</pre>
      </section>
    </div>
  );
}
