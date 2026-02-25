import React from 'react';

export default function PieChart({ data = [] }) {
  // Simple textual pie chart placeholder — keep component lightweight and safe
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>{d.label}</span>
          <span>{d.value}</span>
        </div>
      ))}
    </div>
  );
}
