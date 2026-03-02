// frontend/app/(portals)/layout.tsx excerpt

"use client";
import { useEffect } from "react";
import { LAMBDA_WAKE_URL } from "@/lib/constants";

export default function PortalsLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const triggerOracleWakeup = async () => {
            if (!LAMBDA_WAKE_URL) return;
            try {
                // This non-blocking call tells AWS to start the EC2 if it's stopped
                await fetch(LAMBDA_WAKE_URL, { method: "POST" });
                console.log("Oracle wake-up signal sent.");
            } catch (error) {
                console.error("Failed to signal Oracle wakeup:", error);
            }
        };

        triggerOracleWakeup();
    }, []);

    return <section>{children}</section>;
}