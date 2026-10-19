"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Copy, Check, Trash2, ArrowDownCircle, Wifi, WifiOff, FolderGit2, Loader2, Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";
import { fetchWorkflowDetail } from "@/lib/api";
import { WorkflowSummary } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export interface LogEntry {
  id: string;
  time: string;
  type: "AGENT_START" | "AGENT_PROGRESS" | "AGENT_OUTPUT" | "AGENT_COMPLETED" | "STATE_TRANSITION" | "HUMAN_GATE_TRIGGERED" | "ALERT" | "INFO";
  message: string;
}

interface TerminalLogStreamerProps {
  workflowId?: string;
  workflows?: WorkflowSummary[];
  onSelectWorkflowId?: (id: string) => void;
}

export function TerminalLogStreamer({
  workflowId,
  workflows = [],
  onSelectWorkflowId,
}: TerminalLogStreamerProps) {
  const { language, t } = useLanguage();
  const currentWf = workflows.find((w) => w.id === workflowId);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init-1",
      time: new Date().toLocaleTimeString(),
      type: "INFO",
      message: t.telemetry.initialMessage,
    },
  ]);

  const [filter, setFilter] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 1. Reset logs saat berpindah proyek agar tidak campur aduk
  useEffect(() => {
    const projLabel = currentWf ? `${currentWf.projectId} (${currentWf.taskName})` : workflowId || "Global Stream";
    setLogs([
      {
        id: `switch-${workflowId || "global"}-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: "INFO",
        message: t.telemetry.channelSwitched(projLabel),
      },
    ]);
  }, [workflowId, currentWf, t]);

  // 2. Sinkronisasi Riwayat Nyata dari Database (History Polling / Initial Load)
  useEffect(() => {
    if (!workflowId) return;

    let isMounted = true;
    const loadHistory = async () => {
      try {
        const detail = await fetchWorkflowDetail(workflowId);
        if (!isMounted || !detail.history) return;

        const loadedLogs: LogEntry[] = detail.history.map((h) => ({
          id: `hist-${h.id}`,
          time: new Date(h.createdAt).toLocaleTimeString(),
          type: (h.actor === "HUMAN_OPERATOR"
            ? "HUMAN_GATE_TRIGGERED"
            : h.actor === "AUTONOMOUS_ORCHESTRATOR"
              ? "AGENT_OUTPUT"
              : "STATE_TRANSITION") as LogEntry["type"],
          message: `[${h.toState}] [${h.actor}] ${h.message}`,
        }));

        setLogs((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = loadedLogs.filter((l) => !existingIds.has(l.id));
          if (newItems.length === 0) return prev;
          return [...prev, ...newItems];
        });
      } catch {
        // Silent catch for background polling
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 3000); // Polling sync setiap 3 detik
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [workflowId]);

  // 3. Realtime SSE Event Stream
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_ORCHESTRATOR_API_URL || "https://satset-orchestrator-348109038643.asia-south1.run.app";
    const streamUrl = workflowId
      ? `${apiBase}/api/workflow/${workflowId}/stream`
      : `${apiBase}/api/workflow/stream`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onerror = () => {
        setConnected(false);
      };

      const handleEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const newEntry: LogEntry = {
            id: data.id || `sse-${Date.now()}-${Math.random()}`,
            time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
            type: data.type || "INFO",
            message: `[${data.state || "PIPELINE"}] ${data.message || ""}`,
          };
          setLogs((prev) => [...prev, newEntry]);
        } catch {
          setLogs((prev) => [
            ...prev,
            {
              id: `sse-raw-${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              type: "INFO",
              message: event.data,
            },
          ]);
        }
      };

      eventSource.onmessage = handleEvent;
      eventSource.addEventListener("STATE_TRANSITION", handleEvent);
      eventSource.addEventListener("HUMAN_GATE_TRIGGERED", handleEvent);
      eventSource.addEventListener("AGENT_START", handleEvent);
      eventSource.addEventListener("AGENT_PROGRESS", handleEvent);
      eventSource.addEventListener("AGENT_OUTPUT", handleEvent);
      eventSource.addEventListener("AGENT_COMPLETED", handleEvent);
      eventSource.addEventListener("AGENT_ERROR", handleEvent);
    } catch {
      setConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [workflowId]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((l) => {
    if (filter === "ALL") return true;
    if (filter === "AGENT") {
      return (
        l.type.startsWith("AGENT") ||
        l.message.includes("[AI_AGENT]") ||
        l.message.includes("AGENT") ||
        l.type === "INFO"
      );
    }
    if (filter === "GATE") {
      return l.type === "HUMAN_GATE_TRIGGERED" || l.message.includes("HUMAN_OPERATOR") || l.message.includes("Sign-off");
    }
    if (filter === "TRANSITION") {
      return l.type === "STATE_TRANSITION" || l.message.includes("Transisi") || l.message.includes("PHASE_");
    }
    return true;
  });

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.time}] [${l.type}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className="w-full rounded-2xl glass-panel border border-slate-800 overflow-hidden flex flex-col h-[480px] shadow-2xl">
      {/* 1. Project Switcher & Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950/90 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span>{t.telemetry.title}</span>
          </div>

          {/* Project Dropdown Switcher */}
          {workflows.length > 0 && onSelectWorkflowId && (
            <div className="relative">
              <select
                value={workflowId || ""}
                onChange={(e) => onSelectWorkflowId(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-xl px-2.5 py-1 pr-7 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer hover:border-slate-600 transition"
              >
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.projectId || w.id} — {w.taskName} {w.agentRunning ? "(⚡ Active)" : w.waitingForHuman ? "(✋ HITL)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Connection status badge */}
          {connected ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
              <Wifi className="h-3 w-3" /> {t.telemetry.connected}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping inline-block" /> {t.telemetry.connected} (Active)
            </span>
          )}
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
            {["ALL", "AGENT", "GATE", "TRANSITION"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded font-medium transition ${filter === f ? "bg-cyan-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {f === "ALL" ? t.common.all : f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={t.telemetry.autoScroll}
            className={`p-1.5 rounded-lg border transition ${autoScroll
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleCopy}
            title={copied ? (language === "en" ? "Copied!" : "Tersalin!") : (language === "en" ? "Copy Logs" : "Salin Log")}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleClear}
            title={t.telemetry.clear}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Active Project Context & Real-Time Agent Activity Banner */}
      {currentWf && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded text-[11px]">
              <FolderGit2 className="h-3 w-3" />
              {currentWf.projectId || currentWf.id}
            </span>
            <span className="font-semibold text-white truncate max-w-xs sm:max-w-md">
              {currentWf.taskName}
            </span>
            {currentWf.clientId && (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                Client: {currentWf.clientId}
              </span>
            )}
          </div>

          {/* Real-time Agent Status Banner */}
          {currentWf.agentRunning ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
              <span>
                <strong>[{currentWf.currentAgentRole || "Agent"}]:</strong>{" "}
                {currentWf.currentAgentActivity || "Memproses tahapan otonom..."} ({currentWf.phaseProgressPercentage || 0}%)
              </span>
            </div>
          ) : currentWf.waitingForHuman ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
              <ShieldAlert className="h-3 w-3 text-amber-400" />
              <span>Menunggu Sign-off Manusia (HITL Gate Aktif)</span>
            </div>
          ) : currentWf.currentState === "PHASE_9_RELEASED" ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Selesai & Dirilis</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
              <span>Fase: {currentWf.currentState}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Terminal Log Output Window */}
      <div
        ref={logContainerRef}
        className="flex-1 p-3.5 overflow-y-auto font-mono text-xs sm:text-[13px] bg-[#070b12] space-y-1.5 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center space-y-2.5">
            <div className="text-slate-400 font-sans text-xs">
              {language === "en" ? `No logs found for filter "${filter}" on this project.` : `Belum ada entri khusus untuk filter "${filter}" pada proyek ini.`}
            </div>
            <button
              onClick={() => setFilter("ALL")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-sans hover:bg-cyan-600/40 transition"
            >
              <span>{language === "en" ? "Show All Logs (ALL)" : "Tampilkan Semua Log (ALL)"}</span>
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            let typeColor = "text-blue-400";
            if (log.type === "HUMAN_GATE_TRIGGERED") typeColor = "text-amber-400 font-bold";
            if (log.type === "ALERT" || log.type.includes("ERROR")) typeColor = "text-rose-400 font-bold";
            if (log.type === "STATE_TRANSITION") typeColor = "text-purple-400";
            if (log.type.startsWith("AGENT")) typeColor = "text-cyan-400 font-semibold";

            return (
              <div key={log.id} className="leading-relaxed flex items-start gap-2 hover:bg-slate-900/40 rounded px-1">
                <span className="text-slate-500 flex-shrink-0 text-[11px] select-none">[{log.time}]</span>
                <span className={`text-[11px] flex-shrink-0 uppercase font-semibold ${typeColor}`}>
                  [{log.type}]
                </span>
                <span className="text-slate-200 break-words">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
