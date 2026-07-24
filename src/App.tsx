import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [status, setStatus] = useState<string>("checking…");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status === "ok" ? "connected" : "unreachable");
        setDetail(`${d.tables} tables`);
      })
      .catch(() => {
        setStatus("unreachable");
        setDetail("could not reach the server");
      });
  }, []);

  return (
    <div className="wrap">
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Salon</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Business management for the shop
      </p>

      <div className="card">
        <p style={{ margin: 0, fontWeight: 600 }}>Server: {status}</p>
        <p className="muted" style={{ margin: "4px 0 0" }}>{detail}</p>
      </div>
    </div>
  );
}
