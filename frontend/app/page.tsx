"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User, Activity, ShieldAlert, Scale, Key, ArrowRight, Server, CheckCircle, XCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 bg-[url('/bg-pattern.svg')] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Ambient Glassmorphism Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-900/20 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-900/20 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="text-center mb-16 max-w-4xl z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-slate-300 text-xs font-mono tracking-widest uppercase mb-6 shadow-xl">
          System v1.0.0 Online
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-500">Afterlife</span> Protocol
        </h1>
        <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
          A decentralized multi-sig digital legacy system. <br className="hidden md:block" />
          Secure your assets off-chain, unlocked strictly via hybrid consensus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full z-10 animate-in fade-in zoom-in duration-300">
        <PortalCard href="/beneficiary" title="Beneficiary Claim" desc="Access decrypted legacy notes exclusively after multi-sig confirms." icon={<Key size={28} className="text-purple-400" />} colorClass="hover:border-purple-500/50 hover:bg-purple-900/20" />
        <OracleStatusCard />
        <PortalCard href="/user" title="Citizen Registration" desc="Initialize your vault and securely encrypt your digital legacy note." icon={<User size={28} className="text-slate-300" />} colorClass="hover:border-slate-400/50 hover:bg-slate-800/40" />
        <PortalCard href="/hospital" title="Hospital Command" desc="Authorized medical entities: Trigger emergency countdowns." icon={<Activity size={28} className="text-red-400" />} colorClass="hover:border-red-500/50 hover:bg-red-900/20" />
        <PortalCard href="/gov" title="Government Registry" desc="State authorities: Audit and authorize death certificates on-chain." icon={<ShieldAlert size={28} className="text-emerald-400" />} colorClass="hover:border-emerald-500/50 hover:bg-emerald-900/20" />
        <PortalCard href="/verifier" title="Legal Verifier" desc="Independent audits: Provide the final signature to unlock vaults." icon={<Scale size={28} className="text-blue-400" />} colorClass="hover:border-blue-500/50 hover:bg-blue-900/20" />
      </div>
    </div>
  );
}

function OracleStatusCard() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  useEffect(() => {
    const checkOracle = async () => {
      try { const res = await fetch('http://localhost:8000/health'); setStatus(res.ok ? 'online' : 'offline'); }
      catch { setStatus('offline'); }
    };
    checkOracle(); const int = setInterval(checkOracle, 5000); return () => clearInterval(int);
  }, []);

  return (
    <div className="group relative flex flex-col justify-between p-8 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${status === 'online' ? 'bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse' : 'bg-white/5'}`}></div>
      <div>
        <div className="mb-6 w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shadow-xl backdrop-blur-md">
          <Server size={28} className="text-slate-300 group-hover:scale-110 transition-transform" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight text-white">Oracle Indexer</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">Real-time Python daemon bridging Polygon Amoy smart contract events to off-chain registry.</p>
      </div>
      <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest font-bold">
        {status === 'checking' && <span className="text-slate-500 animate-pulse">Pinging Node...</span>}
        {status === 'online' && <><CheckCircle size={18} className="text-green-400" /> <span className="text-green-400">System Online</span></>}
        {status === 'offline' && <><XCircle size={18} className="text-red-400" /> <span className="text-red-400">System Offline</span></>}
      </div>
    </div>
  );
}

function PortalCard({ href, title, desc, icon, colorClass }: any) {
  return (
    <Link href={href} className={`group relative flex flex-col justify-between p-8 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 ${colorClass}`}>
      <div>
        <div className="mb-6 w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl backdrop-blur-md">
          {icon}
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight text-slate-100">{title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">{desc}</p>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 duration-300 text-slate-300">
        Access Portal <ArrowRight size={16} />
      </div>
    </Link>
  );
}