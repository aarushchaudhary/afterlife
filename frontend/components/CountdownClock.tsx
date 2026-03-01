"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownClock({ initiationTime }: { initiationTime: number }) {
    const [timeLeft, setTimeLeft] = useState("CALCULATING...");
    const [isUnlocked, setIsUnlocked] = useState(false);

    useEffect(() => {
        if (!initiationTime || initiationTime === 0) {
            setTimeLeft("SYSTEM IDLE");
            return;
        }

        // Add 72 hours (in seconds) to the initiation timestamp
        const targetTime = Number(initiationTime) + (72 * 60 * 60);

        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const difference = targetTime - now;

            if (difference <= 0) {
                setTimeLeft("00:00:00 - PROTOCOL UNLOCKED");
                setIsUnlocked(true);
                clearInterval(interval);
            } else {
                const h = Math.floor(difference / 3600).toString().padStart(2, '0');
                const m = Math.floor((difference % 3600) / 60).toString().padStart(2, '0');
                const s = (difference % 60).toString().padStart(2, '0');
                setTimeLeft(`${h}:${m}:${s}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [initiationTime]);

    return (
        <div className={`flex items-center justify-center gap-3 p-4 rounded-xl border backdrop-blur-md font-mono text-xl font-bold tracking-widest transition-all ${isUnlocked ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
            <Clock className={isUnlocked ? 'animate-pulse' : 'animate-pulse opacity-80'} />
            <span>{timeLeft}</span>
        </div>
    );
}
