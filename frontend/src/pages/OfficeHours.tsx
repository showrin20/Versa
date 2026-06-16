import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCHEDULE_KEY = "wl_schedule";
const ENTRIES_KEY = "wl_entries";
const TASKS_PREFIX = "wl_tasks_";
const DEFAULT_SCHED = { startTime: "09:00", endTime: "17:00" };

const CAT = {
  meeting: { label: "Meeting", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30", dot: "bg-blue-500 dark:bg-blue-400" },
  coding: { label: "Coding", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500 dark:bg-emerald-400" },
  review: { label: "Review", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500 dark:bg-amber-400" },
  docs: { label: "Docs", color: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30", dot: "bg-violet-500 dark:bg-violet-400" },
  other: { label: "Other", color: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30", dot: "bg-slate-500 dark:bg-slate-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split("T")[0];
const nowHHMM = () => new Date().toTimeString().substring(0, 5);
const t2h = (t: string): number => { const [h, m] = t.split(":").map(Number); return h + m / 60; };
const schedHrs = (s: { startTime: string; endTime: string }): number => Math.max(0, t2h(s.endTime) - t2h(s.startTime));

const fmtDur = (hrs: number): string => {
  const h = Math.floor(Math.abs(hrs));
  const m = Math.round((Math.abs(hrs) - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const ls = {
  get: <T = unknown>(k: string, def: T | null = null): T | null => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : def; } catch { return def; } },
  set: (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

const parseNotesAndTasks = (raw = "") => {
  const sep = "\n\n--- Tasks ---\n";
  const idx = raw.indexOf(sep);
  if (idx === -1) return { plain: raw, tasks: [] };
  const plain = raw.substring(0, idx);
  const tasks = raw.substring(idx + sep.length).split("\n").filter(Boolean).map((line, i) => {
    const m = line.match(/^\[(\w+)\] (\d{2}:\d{2}) — (.+)$/);
    return m
      ? { id: String(i), category: m[1], time: m[2], description: m[3] }
      : { id: String(i), category: "other", time: "--:--", description: line };
  });
  return { plain, tasks };
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function OfficeHours() {
  const [now, setNow] = useState(new Date());
  const [entries, setEntries] = useState<Array<Record<string, any>>>(() => ls.get<Array<Record<string, any>>>(ENTRIES_KEY, []) ?? []);
  const [schedule, setSchedule] = useState<typeof DEFAULT_SCHED>(() => ls.get<typeof DEFAULT_SCHED>(SCHEDULE_KEY, DEFAULT_SCHED) ?? DEFAULT_SCHED);
  const [draftSched, setDraftSched] = useState<typeof DEFAULT_SCHED>(schedule);
  const [showSchedEd, setShowSchedEd] = useState(false);
  const [tasks, setTasks] = useState<Array<Record<string, any>>>(() => ls.get<Array<Record<string, any>>>(TASKS_PREFIX + todayKey(), []) ?? []);
  const [newTask, setNewTask] = useState("");
  const [newCat, setNewCat] = useState<keyof typeof CAT>("other");
  const [tab, setTab] = useState("today");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayEntry = (entries as Array<Record<string, any>>).find((e) => e.date === todayKey()) || null;
  const isCheckedIn = !!(todayEntry?.checkIn && !todayEntry?.checkOut);
  const isOnBreak = !!(todayEntry?.breakStart && !todayEntry?.breakEnd);

  useEffect(() => {
    if (todayEntry) setNotes(todayEntry.notes || "");
  }, [todayEntry?.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Entry helpers ──────────────────────────────────────────────────────────
  const updateEntry = (date: string, patch: Record<string, unknown>) => {
    setEntries((prev: Array<Record<string, any>>) => {
      const exists = prev.find((e) => e.date === date);
      let next: Array<Record<string, any>>;
      if (exists) {
        next = prev.map((e) => e.date === date ? { ...e, ...patch } : e);
      } else {
        next = [{
          id: Date.now(), date, checkIn: null, checkOut: null,
          breakStart: null, breakEnd: null, breakMins: 0,
          totalHours: 0, notes: ""
        }, ...prev]
          .map((e) => e.date === date ? { ...e, ...patch } : e);
      }
      ls.set(ENTRIES_KEY, next);
      return next;
    });
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCheckIn = () => {
    const date = todayKey();
    const checkIn = nowHHMM();
    updateEntry(date, { checkIn, checkOut: null });
  };

  const handleCheckOut = () => {
    if (!todayEntry?.checkIn) return;
    const checkOut = nowHHMM();
    const ci = t2h(todayEntry.checkIn);
    const co = t2h(checkOut);
    const totalHours = Math.max(0, co - ci - (todayEntry.breakMins || 0) / 60);
    const currentTasks = ls.get<Array<Record<string, any>>>(TASKS_PREFIX + todayKey(), []) ?? [];
    const taskLine = currentTasks.length
      ? "\n\n--- Tasks ---\n" + currentTasks.map((t) => `[${t.category}] ${t.time} — ${t.description}`).join("\n")
      : "";
    updateEntry(todayKey(), { checkOut, totalHours, notes: (notes || "") + taskLine });
  };

  const handleStartBreak = () => {
    if (!isCheckedIn) return;
    updateEntry(todayKey(), { breakStart: nowHHMM(), breakEnd: null });
  };

  const handleEndBreak = () => {
    if (!todayEntry?.breakStart) return;
    const breakEnd = nowHHMM();
    const bs = t2h(todayEntry.breakStart);
    const be = t2h(breakEnd);
    const added = (be - bs) * 60;
    updateEntry(todayKey(), { breakEnd, breakMins: (todayEntry.breakMins || 0) + added });
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => updateEntry(todayKey(), { notes: val }), 600);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task = { id: String(Date.now()), time: nowHHMM(), description: newTask.trim(), category: newCat };
    const updated = [task, ...tasks];
    setTasks(updated);
    ls.set(TASKS_PREFIX + todayKey(), updated);
    setNewTask("");
  };

  const removeTask = (id: string) => {
    const updated = (tasks as Array<Record<string, any>>).filter((t) => t.id !== id);
    setTasks(updated);
    ls.set(TASKS_PREFIX + todayKey(), updated);
  };

  const saveSchedule = () => {
    setSchedule(draftSched);
    ls.set(SCHEDULE_KEY, draftSched);
    setShowSchedEd(false);
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const getCurrentDuration = () => {
    if (!todayEntry?.checkIn) return todayEntry?.totalHours || 0;
    if (!isCheckedIn) return todayEntry?.totalHours || 0;
    const ci = t2h(todayEntry.checkIn);
    const cn = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    return Math.max(0, cn - ci - (todayEntry.breakMins || 0) / 60);
  };

  const goalHrs = schedHrs(schedule);
  const worked = getCurrentDuration();
  const workedPct = goalHrs > 0 ? Math.min(100, (worked / goalHrs) * 100) : 0;
  const remaining = Math.max(0, goalHrs - worked);

  const schedPct = () => {
    const sh = t2h(schedule.startTime), eh = t2h(schedule.endTime);
    const ch = now.getHours() + now.getMinutes() / 60;
    if (ch <= sh) return 0;
    if (ch >= eh) return 100;
    return ((ch - sh) / (eh - sh)) * 100;
  };

  const weekTotal = () => {
    const w = new Date(); w.setDate(w.getDate() - 7);
    return (entries as Array<Record<string, any>>)
      .filter((e) => new Date(e.date) >= w)
      .reduce((s: number, e) => s + (e.totalHours || 0), 0);
  };

  const greeting = () => {
    const h = now.getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const statusBadge = () => {
    if (!isCheckedIn) return { label: "Not checked in", cls: "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-700" };
    if (isOnBreak) return { label: "☕ On break", cls: "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30" };
    return { label: "🟢 Working", cls: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30" };
  };

  const badge = statusBadge();
  const sp = schedPct();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
      className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">

      {/* ── BANNER ── */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 120% at 60% -10%, rgba(30,64,175,0.15), transparent 65%)" }} />
        <div className="relative max-w-5xl mx-auto px-5 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm">⏱</div>
              <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-500 font-semibold">WorkLog</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {greeting()}, <span className="text-blue-500 dark:text-blue-400">let's get to work</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-500 text-sm mt-0.5">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Office hours pill */}
            <button
              onClick={() => { setDraftSched(schedule); setShowSchedEd(true); }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 hover:border-blue-500/50 rounded-xl px-4 py-2.5 transition-all group"
            >
              <span className="text-gray-500 dark:text-slate-400 text-xs">🕐 Office hours</span>
              <span className="font-mono font-semibold text-blue-500 dark:text-blue-400 text-sm">
                {schedule.startTime} – {schedule.endTime}
              </span>
              <span className="text-gray-400 dark:text-slate-600 group-hover:text-gray-600 dark:group-hover:text-slate-300 text-xs ml-1 transition-colors">✎</span>
            </button>

            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </div>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCHEDULE EDITOR MODAL ── */}
      {showSchedEd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg mb-1">Set Office Hours</h3>
            <p className="text-gray-500 dark:text-slate-500 text-sm mb-5">Your usual schedule — used for daily goal progress.</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {[["Start time", "startTime"], ["End time", "endTime"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1.5 font-medium">{label}</label>
                  <input type="time" value={(draftSched as Record<string, string>)[key]}
                    onChange={e => setDraftSched((d: typeof DEFAULT_SCHED) => ({ ...d, [key]: e.target.value }))}
                    className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="bg-gray-100 dark:bg-slate-800 rounded-lg px-4 py-3 mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-slate-400">Total scheduled</span>
              <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{fmtDur(schedHrs(draftSched))}</span>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">Quick presets</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: "9:00 – 5:00", s: "09:00", e: "17:00" },
                { label: "8:30 – 3:30", s: "08:30", e: "15:30" },
                { label: "10:00 – 6:00", s: "10:00", e: "18:00" },
                { label: "8:00 – 4:00", s: "08:00", e: "16:00" },
                { label: "9:00 – 6:00", s: "09:00", e: "18:00" },
              ].map(p => (
                <button key={p.label}
                  onClick={() => setDraftSched({ startTime: p.s, endTime: p.e })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${draftSched.startTime === p.s && draftSched.endTime === p.e
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-600"
                    }`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSchedEd(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 text-sm hover:border-gray-400 dark:hover:border-slate-600 transition-colors">
                Cancel
              </button>
              <button onClick={saveSchedule}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Today", value: fmtDur(worked), icon: "📅", color: "text-blue-500 dark:text-blue-400" },
            { label: "This Week", value: fmtDur(weekTotal()), icon: "📊", color: "text-violet-500 dark:text-violet-400" },
            { label: "Break", value: `${Math.round(todayEntry?.breakMins || 0)}m`, icon: "☕", color: "text-amber-500 dark:text-amber-400" },
            { label: "Remaining", value: isCheckedIn ? fmtDur(remaining) : "—", icon: "⏳", color: "text-rose-500 dark:text-rose-400" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Schedule Progress */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">Daily Schedule Progress</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                {schedule.startTime} – {schedule.endTime} · Goal: {fmtDur(goalHrs)}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${workedPct >= 100
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
              }`}>
              {workedPct >= 100 ? "✓ Goal reached" : `${Math.round(workedPct)}% done`}
            </span>
          </div>

          <div className="relative mb-3">
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-gray-300/80 dark:bg-slate-700/60 rounded-full transition-all duration-1000"
                style={{ width: `${sp}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                style={{
                  width: `${workedPct}%`,
                  background: workedPct >= 100
                    ? "linear-gradient(90deg,#059669,#34d399)"
                    : workedPct >= 75
                      ? "linear-gradient(90deg,#2563eb,#60a5fa)"
                      : "linear-gradient(90deg,#4f46e5,#818cf8)",
                }} />
            </div>
            {sp > 2 && sp < 98 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-gray-500/50 dark:bg-white/50"
                style={{ left: `${sp}%`, transform: "translateX(-50%)" }} />
            )}
          </div>

          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-400 dark:text-slate-600">{schedule.startTime}</span>
            <span className="text-gray-600 dark:text-slate-400">
              {isCheckedIn
                ? `${fmtDur(worked)} worked · ${fmtDur(remaining)} remaining`
                : `${fmtDur(worked)} worked today`}
            </span>
            <span className="text-gray-400 dark:text-slate-600">{schedule.endTime}</span>
          </div>

          <div className="flex gap-4 mt-3 text-xs text-gray-400 dark:text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700 inline-block" /> Day elapsed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block" /> Hours worked
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1 w-fit">
          {["today", "history"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}>
              {t === "today" ? "Today's Log" : "History"}
            </button>
          ))}
        </div>

        {/* TODAY TAB */}
        {tab === "today" && (
          <div className="grid md:grid-cols-2 gap-5">

            {/* Time Tracking */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center text-xs">⏱</span>
                Time Tracking
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Check In", value: todayEntry?.checkIn || "--:--" },
                  { label: "Check Out", value: todayEntry?.checkOut || "--:--" },
                  { label: "Break Start", value: todayEntry?.breakStart || "--:--" },
                  { label: "Break End", value: todayEntry?.breakEnd || "--:--" },
                ].map(item => (
                  <div key={item.label} className="bg-gray-100 dark:bg-slate-800/70 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-slate-500 mb-1">{item.label}</div>
                    <div className="font-mono font-semibold text-gray-800 dark:text-slate-200 text-base">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {!isCheckedIn ? (
                  <button onClick={handleCheckIn}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                    ▶ Check In
                  </button>
                ) : (
                  <>
                    <button onClick={handleCheckOut}
                      className="w-full py-3 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                      ⏹ Check Out
                    </button>
                    {!isOnBreak ? (
                      <button onClick={handleStartBreak}
                        className="w-full py-2.5 rounded-xl font-medium text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 active:scale-95 transition-all">
                        ☕ Start Break
                      </button>
                    ) : (
                      <button onClick={handleEndBreak}
                        className="w-full py-2.5 rounded-xl font-medium text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all">
                        ✓ End Break
                      </button>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Day Notes</label>
                <textarea value={notes} onChange={e => handleNotesChange(e.target.value)}
                  placeholder="General notes for today..."
                  rows={3}
                  className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none transition-colors" />
              </div>
            </div>

            {/* What I Did Today */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-violet-500/20 rounded flex items-center justify-center text-xs">✍</span>
                  What I Did Today
                </h3>
                <span className="text-xs text-gray-500 dark:text-slate-500">{tasks.length} tasks</span>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="text" value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTask()}
                    placeholder="Add a task or activity..."
                    className="flex-1 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button onClick={addTask}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-lg text-sm font-semibold text-white transition-all">
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CAT) as Array<keyof typeof CAT>).map(cat => (
                    <button key={cat} onClick={() => setNewCat(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${newCat === cat
                        ? CAT[cat].color + " ring-1 ring-current"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-500 border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600"
                        }`}>
                      {CAT[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-slate-600 text-sm">
                    No tasks yet — log what you've been working on!
                  </div>
                ) : (tasks as Array<Record<string, any>>).map(task => (
                  <div key={task.id}
                    className="flex items-start gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 group hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${CAT[task.category as keyof typeof CAT]?.dot || "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 dark:text-slate-200 leading-snug">{task.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CAT[task.category as keyof typeof CAT]?.color || ""}`}>
                          {CAT[task.category as keyof typeof CAT]?.label || task.category}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-500 font-mono">{task.time}</span>
                      </div>
                    </div>
                    <button onClick={() => removeTask(task.id)}
                      className="text-gray-400 dark:text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all text-xs mt-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {tasks.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-600 text-center pt-1 border-t border-gray-200 dark:border-slate-800">
                  💾 Tasks are saved to history on checkout
                </p>
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-6 gap-2 px-5 py-3 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wide">
              {["Date", "In", "Out", "Break", "Total", "Tasks / Notes"].map(h => <div key={h}>{h}</div>)}
            </div>

            {entries.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-slate-600">
                <div className="text-4xl mb-3">📋</div>
                <p>No entries yet. Check in to start tracking!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-800/60">
                {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => {
                  const { plain, tasks: entryTasks } = parseNotesAndTasks(entry.notes || "");
                  const isExp = expanded === i;
                  const goalMet = goalHrs > 0 && entry.totalHours >= goalHrs;
                  const isToday = entry.date === todayKey();

                  return (
                    <div key={entry.id}>
                      <div
                        onClick={() => setExpanded(isExp ? null : i as number)}
                        className={`grid grid-cols-6 gap-2 px-5 py-3.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors ${isToday ? "bg-blue-500/5" : ""}`}>
                        <div className="font-medium text-gray-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                          {new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {isToday && <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full">today</span>}
                        </div>
                        <div className="font-mono text-gray-700 dark:text-slate-300">{entry.checkIn || "--:--"}</div>
                        <div className="font-mono text-gray-700 dark:text-slate-300">{entry.checkOut || "--:--"}</div>
                        <div className="text-gray-600 dark:text-slate-400">{Math.round(entry.breakMins || 0)}m</div>
                        <div className="flex items-center gap-1">
                          <span className={`font-mono font-semibold ${goalMet ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
                            {fmtDur(entry.totalHours || 0)}
                          </span>
                          {goalMet && <span className="text-emerald-500 text-xs">✓</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-slate-500 text-xs">
                            {entryTasks.length > 0
                              ? `${entryTasks.length} task${entryTasks.length > 1 ? "s" : ""}`
                              : plain ? "📝 note" : "—"}
                          </span>
                          <span className="text-gray-400 dark:text-slate-600 text-xs">{isExp ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {isExp && (
                        <div className="px-5 pb-5 pt-3 bg-gray-50 dark:bg-slate-800/20 border-t border-gray-200 dark:border-slate-800/40 space-y-4">
                          {plain && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide font-semibold mb-1.5">Notes</p>
                              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-gray-100 dark:bg-slate-800/50 rounded-lg px-3 py-2.5">{plain}</p>
                            </div>
                          )}
                          {entryTasks.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide font-semibold mb-2">Tasks completed</p>
                              <div className="space-y-1.5">
                                {(entryTasks as Array<Record<string, any>>).map(task => (
                                  <div key={task.id} className="flex items-start gap-3 bg-white dark:bg-slate-800/60 rounded-lg px-3 py-2.5 border border-gray-100 dark:border-transparent">
                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${CAT[task.category as keyof typeof CAT]?.dot || "bg-gray-400"}`} />
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-800 dark:text-slate-200">{task.description}</div>
                                      <div className="flex gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CAT[task.category as keyof typeof CAT]?.color || "bg-gray-100 text-gray-500 border-gray-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600"}`}>
                                          {CAT[task.category as keyof typeof CAT]?.label || task.category}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-slate-500 font-mono">{task.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {!plain && entryTasks.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-slate-600 italic">No tasks or notes recorded for this day.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
