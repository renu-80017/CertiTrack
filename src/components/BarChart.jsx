export default function BarChart({ data = [], height = 160 }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));

  const colors = ["#4f7cff", "#2ecc71", "#ff6b6b", "#f7b731", "#9b59b6"];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "grid", gap: 10 }}>
        {data.map((d, i) => {
          const v = Number(d.value) || 0;
          const w = Math.round((v / max) * 100);
          return (
            <div key={d.label} style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{d.label}</span>
                <span style={{ fontWeight: 800 }}>{v}</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 12,
                  borderRadius: 999,
                  background: "#e9ecf5",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${w}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: colors[i % colors.length],
                    transition: "width 250ms ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}