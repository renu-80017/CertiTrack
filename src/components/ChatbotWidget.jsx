import { useState } from 'react';

const QUICK = {
  'How to add certificate?': 'Open Certificates → Add Certificate. Fill required fields and upload proof PDF/JPG/PNG (max 5MB).',
  'How renew works?': 'Go to Renewals, choose Renew Now, enter new expiry and optional proof. The certificate updates immediately.',
  'Admin permissions?': 'Admins can view all users, certificates, renewals, and verify records in admin modules.',
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi! I can help with CertiTrack navigation.' }]);

  const onQuick = (q) => {
    setMessages((prev) => [...prev, { from: 'user', text: q }, { from: 'bot', text: QUICK[q] }]);
  };

  return (
    <div className="chatbot">
      {open && (
        <div className="chat-panel glass-card">
          <h4>CertiTrack Assistant</h4>
          <div className="chat-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="quick-actions">
            {Object.keys(QUICK).map((q) => (
              <button key={q} onClick={() => onQuick(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="chat-bubble" onClick={() => setOpen((v) => !v)}>
        {open ? '×' : 'Help'}
      </button>
    </div>
  );
}
