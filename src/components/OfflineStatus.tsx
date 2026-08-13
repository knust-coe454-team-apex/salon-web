import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { syncOfflineQueue } from "../lib/api";
import { getPendingCount } from "../lib/offline-store";

export default function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => setPending(await getPendingCount()), []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    await syncOfflineQueue();
    await refreshCount();
    setSyncing(false);
  }, [refreshCount]);

  useEffect(() => {
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("nailflow-queue-change", refreshCount);
    const timer = window.setTimeout(() => {
      void refreshCount();
      if (navigator.onLine) void sync();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("nailflow-queue-change", refreshCount);
    };
  }, [refreshCount, sync]);

  if (online && pending === 0) return null;

  return (
    <button className={`connection-status ${online ? "pending" : "offline"}`} onClick={() => void sync()} disabled={!online || syncing}>
      {online ? <RefreshCw size={16} className={syncing ? "spin" : ""} /> : <CloudOff size={16} />}
      <span>{online ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync` : "Working offline"}</span>
      {online && pending > 0 ? <Cloud size={15} /> : null}
    </button>
  );
}
