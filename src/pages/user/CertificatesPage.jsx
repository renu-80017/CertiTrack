import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import BarChart from "../../components/BarChart";
import { useAuth } from "../../contexts/AuthContext";
import { db, storage } from "../../firebase";
import { removeCertificate } from "../../services/certificateService";
import { formatDate, getCertificateStatus, isAllowedFile } from "../../utils/certificateUtils";
import { buildDemoDocumentRecord } from "../../utils/demoDocumentProfiles";

const DEMO_CERT_TOTAL = 20;

const emptyForm = {
  title: "",
  issuer: "",
  category: "",
  issueDate: "",
  expiryDate: "",
  credentialId: "",
  credentialUrl: "",
  notes: "",
  file: null,
};

const buildDemoCertificates = (uid = "demo-user") => {
  return Array.from({ length: DEMO_CERT_TOTAL }, (_, i) =>
    buildDemoDocumentRecord({
      id: `demo-user-cert-${String(i + 1).padStart(3, "0")}`,
      uid,
    })
  );
};

const daysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
};

const shortText = (text, max = 40) => {
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const openInNewTab = (url) => {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
};
const googleCourseUrl = (text) => `https://www.google.com/search?q=${encodeURIComponent(`${text} certification`)}`;
const googleLoginUrl = "https://accounts.google.com/signin";
const courseraLoginUrl = "https://www.coursera.org/?authMode=login";
const courseraSearchUrl = (text) => `https://www.coursera.org/search?query=${encodeURIComponent(text)}`;

export default function CertificatesPage() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [liveCertificates, setLiveCertificates] = useState([]);
  const [demoCertificates, setDemoCertificates] = useState(() => buildDemoCertificates());
  const [useDemoData, setUseDemoData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [courseQuery, setCourseQuery] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickProofFile, setQuickProofFile] = useState(null);
  const [quickProofInputKey, setQuickProofInputKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIssuer, setFilterIssuer] = useState("all");

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "certificates"), where("userId", "==", currentUser.uid)),
      (snap) => {
        setLiveCertificates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !useDemoData) return;
    setDemoCertificates(buildDemoCertificates(currentUser.uid));
  }, [currentUser?.uid, useDemoData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const course = (params.get("course") || "").trim();
    if (!course) return;

    setCourseQuery(course);
    setOpen(true);
    setForm((prev) => ({
      ...prev,
      title: prev.title || course,
      issuer: prev.issuer || (course.toLowerCase().includes("coursera") ? "Coursera" : ""),
      category: prev.category || "Online Course",
      credentialUrl:
        prev.credentialUrl || (course.toLowerCase().includes("coursera") ? courseraSearchUrl(course) : ""),
    }));
  }, [location.search]);

  const certificates = useMemo(
    () => (useDemoData ? demoCertificates : liveCertificates),
    [useDemoData, demoCertificates, liveCertificates]
  );

  const issuers = useMemo(
    () => ["all", ...new Set(certificates.map((i) => i.issuer).filter(Boolean))],
    [certificates]
  );

  const filtered = useMemo(() => {
    return certificates.filter((i) => {
      const text = `${i.title || ""} ${i.issuer || ""} ${i.category || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const issuerOk = filterIssuer === "all" || i.issuer === filterIssuer;
      return text && issuerOk;
    });
  }, [certificates, searchQuery, filterIssuer]);

  const getProofLink = (item) =>
    item.proofUrl || item.fileUrl || item.fileURL || item.attachmentUrl || null;

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

  const useCourseInForm = () => {
    const text = courseQuery.trim();
    const titleText = quickTitle.trim();
    const resolvedTitle = titleText || text;
    if (!resolvedTitle) {
      alert("Type certificate title or course name first.");
      return;
    }
    if (quickProofFile && !isAllowedFile(quickProofFile)) {
      alert("Invalid file. Use PDF/PNG/JPG up to 5MB.");
      return;
    }

    setOpen(true);
    setForm((prev) => ({
      ...prev,
      title: prev.title || resolvedTitle,
      issuer: prev.issuer || (text.toLowerCase().includes("coursera") ? "Coursera" : prev.issuer),
      category: prev.category || "Online Course",
      credentialUrl:
        prev.credentialUrl ||
        (text.toLowerCase().includes("coursera") ? courseraSearchUrl(text) : googleCourseUrl(text || resolvedTitle)),
      file: prev.file || quickProofFile,
    }));
    setQuickProofInputKey((k) => k + 1);
    setQuickProofFile(null);
    setQuickTitle("");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      console.log("SAVE CLICKED", form);

      if (!currentUser?.uid) throw new Error("User not logged in");
      if (!form.title || !form.issuer || !form.category) throw new Error("Fill required fields");
      if (!form.issueDate || !form.expiryDate) throw new Error("Select dates");
      if (!isAllowedFile(form.file)) throw new Error("Invalid file. Use PDF/PNG/JPG up to 5MB.");

      if (useDemoData) {
        const demoItem = {
          id: `demo-user-cert-${Date.now()}`,
          title: form.title,
          issuer: form.issuer,
          category: form.category,
          issueDate: form.issueDate,
          expiryDate: form.expiryDate,
          credentialId: form.credentialId || "",
          credentialUrl: form.credentialUrl || "",
          notes: form.notes || "",
          proofUrl: "",
          userId: currentUser.uid,
          uid: currentUser.uid,
          verified: false,
        };
        setDemoCertificates((prev) => [demoItem, ...prev]);
        alert("Certificate saved in demo mode");
        setForm(emptyForm);
        setOpen(false);
        return;
      }

      let proofUrl = "";

      if (form.file) {
        const fileRef = ref(storage, `certificates/${currentUser.uid}/${Date.now()}_${form.file.name}`);
        await uploadBytes(fileRef, form.file);
        proofUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "certificates"), {
        title: form.title,
        issuer: form.issuer,
        category: form.category,
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        credentialId: form.credentialId || "",
        credentialUrl: form.credentialUrl || "",
        notes: form.notes || "",
        proofUrl,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("Certificate saved");
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      console.error("SAVE FAILED:", err);
      alert(err.message);
    }
  };

  const onDelete = async (item) => {
    if (useDemoData) {
      setDemoCertificates((prev) => prev.filter((x) => x.id !== item.id));
      return;
    }
    await removeCertificate(item);
  };

  const issuerBarData = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const key = (c.issuer || "Unknown").trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const rawIssuerSummary = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const key = c.issuer || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([issuer, count]) => ({ issuer, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const rawStatusSummary = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const s = getCertificateStatus(c.expiryDate);
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const rawSnapshot = useMemo(() => {
    return filtered.slice(0, 10).map((c) => ({
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      category: c.category,
      issueDate: c.issueDate || null,
      expiryDate: c.expiryDate || null,
      status: getCertificateStatus(c.expiryDate),
      daysLeft: daysLeft(c.expiryDate),
      credentialId: c.credentialId || null,
      credentialUrl: c.credentialUrl || null,
      proofUrl: getProofLink(c),
      notes: c.notes || null,
    }));
  }, [filtered]);

  return (
    <div>
      <div className="section-head">
        <h2>Certificates</h2>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Add Certificate
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => setUseDemoData((v) => !v)}>
          {useDemoData ? "Use Live Firestore Data" : "Use Random Demo Data"}
        </button>

        {useDemoData && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setDemoCertificates(buildDemoCertificates(currentUser?.uid || "demo-user"))}
          >
            Regenerate Random Data
          </button>
        )}
      </div>

      {useDemoData && (
        <p style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Demo mode is ON with random documents and certificates data.
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
            placeholder="Certificate title (optional, used while adding)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
          />
          <input
            key={quickProofInputKey}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setQuickProofFile(e.target.files?.[0] || null)}
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
            <button type="button" className="btn-primary" onClick={useCourseInForm}>
              Use in Add Certificate + PDF
            </button>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          After searching/login on external sites, use the button above to prefill title and optional PDF proof.
        </p>
      </section>

      <div className="glass-card filters-row">
        <input
          placeholder="Search by title / issuer / category"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select value={filterIssuer} onChange={(e) => setFilterIssuer(e.target.value)}>
          {issuers.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="glass-card modal-like">
          <h3>Add Certificate</h3>

          <form onSubmit={handleSave} className="grid-form">
            <input
              type="text"
              placeholder="certificate title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              type="text"
              placeholder="issuer"
              value={form.issuer}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
            />
            <input
              type="text"
              placeholder="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            <input
              type="text"
              placeholder="credentialId"
              value={form.credentialId}
              onChange={(e) => setForm({ ...form, credentialId: e.target.value })}
            />
            <input
              type="text"
              placeholder="credentialUrl"
              value={form.credentialUrl}
              onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })}
            />

            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            />

            <div className="actions-row">
              <button type="submit">Save</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setOpen(false);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Issuer</th>
              <th>Category</th>
              <th>Issue</th>
              <th>Expiry</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Credential ID</th>
              <th>Credential URL</th>
              <th>Notes</th>
              <th>PDF/Proof</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => {
              const status = getCertificateStatus(item.expiryDate);
              const proof = getProofLink(item);
              const left = daysLeft(item.expiryDate);

              return (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.issuer}</td>
                  <td>{item.category || "-"}</td>
                  <td>{formatDate(item.issueDate)}</td>
                  <td>{formatDate(item.expiryDate)}</td>
                  <td>{left === null ? "-" : left}</td>

                  <td>
                    <span className={`status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
                  </td>

                  <td>{item.credentialId || "-"}</td>

                  <td>
                    {item.credentialUrl ? (
                      <a href={item.credentialUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td title={item.notes || ""}>{shortText(item.notes, 30)}</td>

                  <td>
                    {proof ? (
                      <a href={proof} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
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
              {rawStatusSummary.length === 0 && <li>No data</li>}
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
