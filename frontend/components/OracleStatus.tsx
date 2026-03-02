// New Component: frontend/components/OracleStatus.tsx

import { useState, useEffect } from "react";
import { ORACLE_API_URL } from "@/lib/constants";

export default function OracleStatus() {
    const [status, setStatus] = useState<"online" | "offline" | "waking">("offline");

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${ORACLE_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
                if (res.ok) {
                    setStatus("online");
                } else {
                    setStatus("waking");
                }
            } catch (err) {
                setStatus("offline");
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 text-sm font-medium">
            <div className={`h-3 w-3 rounded-full ${status === "online" ? "bg-green-500" : status === "waking" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                }`} />
            <span className="capitalize">Oracle: {status}</span>
        </div>
    );
}