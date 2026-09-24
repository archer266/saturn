"use client";

import {
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Focus,
  LocateFixed,
  MapPin,
  Orbit,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Snowflake,
  Sparkles,
  TimerReset,
  Trash2,
  Wind,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Task = {
  id: string;
  title: string;
  time: string;
  completed: boolean;
};

type Weather = {
  location: string;
  temperature: number;
  apparent: number;
  code: number;
  high: number;
  low: number;
  precipitation: number;
  wind: number;
};

type Fortune = {
  message: string;
  source: "ai" | "built-in";
};

type ModelContextLike = {
  registerTool: (
    tool: {
      name: string;
      title?: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: {
        readOnlyHint?: boolean;
        untrustedContentHint?: boolean;
      };
      execute: (input: unknown) => unknown | Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "saturn-starter-1",
    title: "Choose one meaningful priority",
    time: "09:00",
    completed: false,
  },
  {
    id: "saturn-starter-2",
    title: "Take a five-minute reset",
    time: "13:00",
    completed: false,
  },
  {
    id: "saturn-starter-3",
    title: "Close the loop on one task",
    time: "16:30",
    completed: false,
  },
];

const MOODS = [
  { emoji: "😌", label: "Calm" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😵‍💫", label: "Scattered" },
  { emoji: "😮‍💨", label: "Tired" },
];

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const FOCUS_SECONDS = 25 * 60;
const BREATH_SECONDS = 60;
const BREATH_PHASES = ["Inhale", "Hold", "Exhale", "Rest"];

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function to24Hour(hour: string, minute: string, period: string) {
  const numericHour = Number(hour) % 12 + (period === "PM" ? 12 : 0);
  return `${String(numericHour).padStart(2, "0")}:${minute}`;
}

function normalizeTaskTime(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "";

  const twentyFourHour = cleaned.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) return cleaned;

  const twelveHour = cleaned.match(/^(1[0-2]|[1-9]):([0-5]\d)\s*([AP]M)$/i);
  if (!twelveHour) return "";
  return to24Hour(twelveHour[1], twelveHour[2], twelveHour[3].toUpperCase());
}

function formatTaskTime(value: string) {
  const normalized = normalizeTaskTime(value);
  if (!normalized) return "Anytime";
  const [hour, minute] = normalized.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function sortTasks(items: Task[]) {
  return [...items].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

function getWeatherLabel(code: number) {
  if (code === 0) return "Clear skies";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Misty";
  if (code <= 67 || (code >= 80 && code <= 82)) return "Rainy";
  if (code <= 77 || code === 85 || code === 86) return "Snowy";
  if (code >= 95) return "Stormy";
  return "Changing skies";
}

function WeatherIcon({ code, className = "" }: { code: number; className?: string }) {
  if (code === 0) return <CloudSun className={className} aria-hidden="true" />;
  if (code <= 3) return <CloudSun className={className} aria-hidden="true" />;
  if (code <= 48) return <CloudFog className={className} aria-hidden="true" />;
  if (code <= 67 || (code >= 80 && code <= 82)) {
    return <CloudRain className={className} aria-hidden="true" />;
  }
  if (code <= 77 || code === 85 || code === 86) {
    return <Snowflake className={className} aria-hidden="true" />;
  }
  if (code >= 95) return <CloudLightning className={className} aria-hidden="true" />;
  return <CloudSun className={className} aria-hidden="true" />;
}

async function requestFortune(question: string): Promise<Fortune> {
  const response = await fetch("/api/affirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) throw new Error("Saturn could not answer right now.");
  return (await response.json()) as Fortune;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskHour, setTaskHour] = useState("9");
  const [taskMinute, setTaskMinute] = useState("00");
  const [taskPeriod, setTaskPeriod] = useState("AM");
  const [hydrated, setHydrated] = useState(false);
  const [mood, setMood] = useState("");

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("Use your location or search a city.");
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [focusSeconds, setFocusSeconds] = useState(FOCUS_SECONDS);
  const [focusRunning, setFocusRunning] = useState(false);

  const [breathing, setBreathing] = useState(false);
  const [breathRemaining, setBreathRemaining] = useState(BREATH_SECONDS);

  const [question, setQuestion] = useState("");
  const [activeSection, setActiveSection] = useState<"today" | "reset" | "ask-saturn">("today");
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [fortuneError, setFortuneError] = useState("");
  const [asking, setAsking] = useState(false);

  const [dateLabel, setDateLabel] = useState("Today");
  const [clockLabel, setClockLabel] = useState("--:-- --");
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const updateDateAndTime = () => {
      const now = new Date();
      setDateLabel(
        now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      );
      setClockLabel(
        now.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
      const hour = now.getHours();
      setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    };

    updateDateAndTime();
    const clockInterval = window.setInterval(updateDateAndTime, 30_000);

    try {
      const savedTasks = localStorage.getItem("saturn.tasks");
      const savedMood = localStorage.getItem("saturn.mood");
      if (savedTasks) setTasks(sortTasks(JSON.parse(savedTasks) as Task[]));
      if (savedMood) setMood(savedMood);
    } catch {
      // The starter plan remains available if browser storage is unavailable.
    } finally {
      setHydrated(true);
    }

    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("saturn.tasks", JSON.stringify(tasks));
  }, [hydrated, tasks]);

  useEffect(() => {
    if (!hydrated || !mood) return;
    localStorage.setItem("saturn.mood", mood);
  }, [hydrated, mood]);

  useEffect(() => {
    if (!focusRunning) return;
    const interval = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          setFocusRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [focusRunning]);

  useEffect(() => {
    if (!breathing) return;
    const interval = window.setInterval(() => {
      setBreathRemaining((current) => {
        if (current <= 1) {
          setBreathing(false);
          return BREATH_SECONDS;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [breathing]);

  const loadWeather = useCallback(async (latitude: number, longitude: number, location: string) => {
    setWeatherLoading(true);
    setWeatherStatus("Checking the sky…");
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: "auto",
        forecast_days: "1",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error("Weather request failed");
      const data = (await response.json()) as {
        current: {
          temperature_2m: number;
          apparent_temperature: number;
          weather_code: number;
          wind_speed_10m: number;
        };
        daily: {
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: number[];
        };
      };
      setWeather({
        location,
        temperature: Math.round(data.current.temperature_2m),
        apparent: Math.round(data.current.apparent_temperature),
        code: data.current.weather_code,
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        precipitation: Math.round(data.daily.precipitation_probability_max[0] ?? 0),
        wind: Math.round(data.current.wind_speed_10m),
      });
      setWeatherStatus("");
    } catch {
      setWeatherStatus("Weather is taking a break. Try a city search.");
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setWeatherStatus("Search a city to see today’s weather.");
      return;
    }
    setWeatherLoading(true);
    setWeatherStatus("Finding your local weather…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadWeather(position.coords.latitude, position.coords.longitude, "Current location");
      },
      () => {
        setWeatherLoading(false);
        setWeatherStatus("Search a city to see today’s weather.");
      },
      { timeout: 8000 },
    );
  }, [loadWeather]);

  const searchWeather = async (event: FormEvent) => {
    event.preventDefault();
    const query = city.trim();
    if (!query) return;
    setWeatherLoading(true);
    setWeatherStatus("Finding that city…");
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      );
      if (!response.ok) throw new Error("City search failed");
      const data = (await response.json()) as {
        results?: Array<{
          name: string;
          admin1?: string;
          country?: string;
          latitude: number;
          longitude: number;
        }>;
      };
      const result = data.results?.[0];
      if (!result) {
        setWeatherStatus("That city didn’t show up. Try a nearby city.");
        setWeatherLoading(false);
        return;
      }
      const place = [result.name, result.admin1 ?? result.country].filter(Boolean).join(", ");
      await loadWeather(result.latitude, result.longitude, place);
      setCity("");
    } catch {
      setWeatherStatus("City search didn’t connect. Try again in a moment.");
      setWeatherLoading(false);
    }
  };

  const addTask = useCallback((title: string, time = "") => {
    const cleaned = title.trim();
    if (!cleaned) return null;
    const task: Task = {
      id: makeId(),
      title: cleaned.slice(0, 100),
      time: normalizeTaskTime(time),
      completed: false,
    };
    setTasks((current) => sortTasks([...current, task]));
    return task;
  }, []);

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    const time = to24Hour(taskHour, taskMinute, taskPeriod);
    if (!addTask(taskTitle, time)) return;
    setTaskTitle("");
  };

  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  };

  const removeTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const askSaturn = useCallback(async (prompt: string) => {
    const cleaned = prompt.trim();
    if (!cleaned) throw new Error("Ask Saturn a question first.");
    setAsking(true);
    setFortuneError("");
    try {
      const answer = await requestFortune(cleaned.slice(0, 240));
      setFortune(answer);
      return answer;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Saturn could not answer right now.";
      setFortuneError(message);
      throw error;
    } finally {
      setAsking(false);
    }
  }, []);

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await askSaturn(question);
      setQuestion("");
    } catch {
      // The inline message explains what needs attention.
    }
  };

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: ModelContextLike }).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    const register = async () => {
      await modelContext.registerTool(
        {
          name: "add_plan_item",
          title: "Add plan item",
          description: "Add one item to today’s Saturn plan and show it in the visible task list.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 1, maxLength: 100 },
              time: {
                type: "string",
                description: "Optional time in 12-hour format, such as 9:30 AM.",
                pattern: "^(1[0-2]|[1-9]):[0-5][0-9] ?([AaPp][Mm])$",
              },
            },
            required: ["title"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const candidate = input as { title?: unknown; time?: unknown };
            if (typeof candidate.title !== "string" || !candidate.title.trim()) {
              throw new Error("title is required");
            }
            const requestedTime = typeof candidate.time === "string" ? candidate.time : "";
            const normalizedTime = normalizeTaskTime(requestedTime);
            if (requestedTime && !normalizedTime) throw new Error("Use a time like 9:30 AM");
            const task = addTask(candidate.title, normalizedTime);
            if (!task) throw new Error("Could not add that plan item");
            return {
              id: task.id,
              title: task.title,
              time: formatTaskTime(task.time),
              status: "added",
            };
          },
        },
        { signal: lifecycle.signal },
      );

      await modelContext.registerTool(
        {
          name: "ask_saturn",
          title: "Ask Saturn",
          description: "Ask Saturn’s positive Magic 8 Ball a question and show its supportive answer.",
          inputSchema: {
            type: "object",
            properties: { question: { type: "string", minLength: 1, maxLength: 240 } },
            required: ["question"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input) {
            const candidate = input as { question?: unknown };
            if (typeof candidate.question !== "string" || !candidate.question.trim()) {
              throw new Error("question is required");
            }
            const answer = await askSaturn(candidate.question);
            return { answer: answer.message, source: answer.source };
          },
        },
        { signal: lifecycle.signal },
      );
    };

    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [addTask, askSaturn]);

  const completedTasks = tasks.filter((task) => task.completed).length;
  const planProgress = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
  const focusProgress = ((FOCUS_SECONDS - focusSeconds) / FOCUS_SECONDS) * 100;
  const breathElapsed = BREATH_SECONDS - breathRemaining;
  const breathPhase = BREATH_PHASES[Math.floor((breathElapsed % 16) / 4)];
  const selectedMood = MOODS.find((item) => item.label === mood);

  const planSummary = useMemo(() => {
    if (!tasks.length) return "Your day is open. Add one thing that matters.";
    if (completedTasks === tasks.length) return "Everything is complete. Let the day feel lighter.";
    return `${tasks.length - completedTasks} item${tasks.length - completedTasks === 1 ? "" : "s"} left today.`;
  }, [completedTasks, tasks.length]);

  const scrollToSection = useCallback((sectionId: "today" | "reset" | "ask-saturn") => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    setActiveSection(sectionId);
    section.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${sectionId}`);
  }, []);

  const progressStyle = {
    "--progress": `${Math.max(0, Math.min(100, planProgress)) * 3.6}deg`,
  } as CSSProperties;

  return (
    <main className="saturn-app">
      <div className="app-shell">
        <aside className="app-sidebar">
          <a className="brand" href="#today" aria-label="Saturn home">
            <span className="brand-mark"><Orbit aria-hidden="true" /></span>
            <span className="brand-copy"><strong>Saturn</strong><small>Daily balance</small></span>
          </a>

          <nav className="side-nav" aria-label="Saturn sections">
            <button
              type="button"
              className={`side-nav-item${activeSection === "today" ? " active" : ""}`}
              onClick={() => scrollToSection("today")}
              aria-label="Go to Today"
              aria-pressed={activeSection === "today"}
            >
              <CalendarDays aria-hidden="true" />
              <span>Today</span>
            </button>
            <button
              type="button"
              className={`side-nav-item${activeSection === "reset" ? " active" : ""}`}
              onClick={() => scrollToSection("reset")}
              aria-label="Go to Reset tools"
              aria-pressed={activeSection === "reset"}
            >
              <Focus aria-hidden="true" />
              <span>Reset tools</span>
            </button>
            <button
              type="button"
              className={`side-nav-item${activeSection === "ask-saturn" ? " active" : ""}`}
              onClick={() => scrollToSection("ask-saturn")}
              aria-label="Go to Ask Saturn"
              aria-pressed={activeSection === "ask-saturn"}
            >
              <Sparkles aria-hidden="true" />
              <span>Ask Saturn</span>
            </button>
          </nav>

          <div className="sidebar-spacer" />

          <section className="sidebar-progress" aria-label={`${Math.round(planProgress)} percent complete`}>
            <div className="progress-orbit" style={progressStyle}>
              <div>
                <strong>{Math.round(planProgress)}%</strong>
                <span>complete</span>
              </div>
            </div>
            <div>
              <span>Today’s progress</span>
              <p>{completedTasks} of {tasks.length} finished</p>
            </div>
          </section>

          <section className="sidebar-clock" aria-label={`${dateLabel}, ${clockLabel}`}>
            <Clock3 aria-hidden="true" />
            <div>
              <span>{dateLabel}</span>
              <strong>{clockLabel}</strong>
            </div>
          </section>

          <p className="save-note"><CheckCircle2 aria-hidden="true" /> Saved on this device</p>
        </aside>

        <section className="main-stage">
          <header className="page-header">
            <div>
              <p className="eyebrow">Your space for today</p>
              <h1>{greeting}</h1>
              <p className="header-note">Make room for progress and a little calm.</p>
            </div>
            <div className="header-status">
              <div className="date-pill"><CalendarDays aria-hidden="true" /><span>{dateLabel}</span></div>
              <a className="mood-pill" href="#mood-check">
                <span>{selectedMood?.emoji ?? "✦"}</span>
                <span>{mood || "Check in"}</span>
              </a>
            </div>
          </header>

          <div className="overview-grid">
            <section className="surface planner-surface" id="today" aria-labelledby="planner-heading">
              <div className="surface-heading planner-heading">
                <div>
                  <p className="section-kicker">Daily plan</p>
                  <h2 id="planner-heading">Today’s orbit</h2>
                  <p>{planSummary}</p>
                </div>
                <span className="task-count">{tasks.length} planned</span>
              </div>

              <form className="task-composer" onSubmit={submitTask}>
                <label className="sr-only" htmlFor="task-title">New plan item</label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="What would make today feel successful?"
                  maxLength={100}
                  className="saturn-input task-title-input"
                />

                <div className="time-picker" role="group" aria-label="Task time">
                  <span className="time-picker-icon"><Clock3 aria-hidden="true" /></span>
                  <Select value={taskHour} onValueChange={(value) => value && setTaskHour(value)}>
                    <SelectTrigger className="time-select" aria-label="Hour"><SelectValue /></SelectTrigger>
                    <SelectContent className="saturn-select-menu">
                      {HOURS.map((hour) => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="time-colon">:</span>
                  <Select value={taskMinute} onValueChange={(value) => value && setTaskMinute(value)}>
                    <SelectTrigger className="time-select minute-select" aria-label="Minute"><SelectValue /></SelectTrigger>
                    <SelectContent className="saturn-select-menu">
                      {MINUTES.map((minute) => <SelectItem key={minute} value={minute}>{minute}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={taskPeriod} onValueChange={(value) => value && setTaskPeriod(value)}>
                    <SelectTrigger className="time-select period-select" aria-label="AM or PM"><SelectValue /></SelectTrigger>
                    <SelectContent className="saturn-select-menu">
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="primary-button" disabled={!taskTitle.trim()}>
                  <Plus aria-hidden="true" />
                  Add task
                </Button>
              </form>

              <div className="list-meta">
                <span>Schedule</span>
                <span>{completedTasks}/{tasks.length} complete</span>
              </div>

              <div className="task-list" aria-live="polite">
                {tasks.length === 0 ? (
                  <div className="empty-plan">
                    <span><Check aria-hidden="true" /></span>
                    <h3>Nothing scheduled yet</h3>
                    <p>Add one small task to begin your day.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <article className={`task-row${task.completed ? " task-complete" : ""}`} key={task.id}>
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="task-checkbox"
                      />
                      <label htmlFor={`task-${task.id}`} className="task-copy">
                        <span>{task.title}</span>
                        <small>{task.completed ? "Completed" : "Ready when you are"}</small>
                      </label>
                      <time dateTime={task.time || undefined}>{formatTaskTime(task.time)}</time>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="task-delete"
                        onClick={() => removeTask(task.id)}
                        aria-label={`Remove ${task.title}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="dashboard-rail" aria-label="Weather and mood">
              <section className="surface weather-surface" aria-labelledby="weather-heading">
                <div className="surface-heading compact-heading">
                  <div>
                    <p className="section-kicker">Outside now</p>
                    <h2 id="weather-heading">Weather</h2>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="location-button"
                    onClick={useMyLocation}
                    disabled={weatherLoading}
                  >
                    <LocateFixed aria-hidden="true" />
                    <span>Use location</span>
                  </Button>
                </div>

                {weather ? (
                  <div className="weather-reading">
                    <div className="weather-hero">
                      <WeatherIcon code={weather.code} className="weather-icon" />
                      <div>
                        <strong>{weather.temperature}°</strong>
                        <span>{getWeatherLabel(weather.code)}</span>
                      </div>
                    </div>
                    <p className="weather-place"><MapPin aria-hidden="true" /> {weather.location}</p>
                    <div className="weather-metrics">
                      <div><span>High / Low</span><strong>{weather.high}° / {weather.low}°</strong></div>
                      <div><span>Rain</span><strong>{weather.precipitation}%</strong></div>
                      <div><span>Wind</span><strong>{weather.wind} mph</strong></div>
                    </div>
                    <p className="feels-like">Feels like {weather.apparent}°</p>
                  </div>
                ) : (
                  <div className="weather-placeholder">
                    <span><CloudSun aria-hidden="true" /></span>
                    <p>{weatherStatus}</p>
                  </div>
                )}

                <form className="city-search" onSubmit={searchWeather}>
                  <label className="sr-only" htmlFor="city">Search city</label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Search a city"
                    className="saturn-input"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="search-button"
                    aria-label="Search weather"
                    disabled={weatherLoading || !city.trim()}
                  >
                    {weatherLoading ? <RefreshCw className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
                  </Button>
                </form>
                {weather && weatherStatus ? <p className="inline-status">{weatherStatus}</p> : null}
              </section>

              <section className="surface mood-surface" id="mood-check" aria-labelledby="mood-heading">
                <div className="surface-heading compact-heading">
                  <div>
                    <p className="section-kicker">Quick check-in</p>
                    <h2 id="mood-heading">How are you?</h2>
                  </div>
                  <span className="mood-current">{selectedMood?.emoji ?? "✦"}</span>
                </div>
                <div className="mood-options" role="group" aria-label="Choose your mood">
                  {MOODS.map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      className={`mood-option${mood === item.label ? " selected" : ""}`}
                      onClick={() => setMood(item.label)}
                      aria-pressed={mood === item.label}
                    >
                      <span>{item.emoji}</span>
                      <small>{item.label}</small>
                    </button>
                  ))}
                </div>
                <p className="mood-note">
                  {mood ? `You’re feeling ${mood.toLowerCase()}. Thanks for checking in.` : "No fixing—just notice where you are."}
                </p>
              </section>
            </aside>
          </div>

          <section className="reset-section" id="reset" aria-labelledby="reset-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Reset tools</p>
                <h2 id="reset-heading">Pause without losing momentum.</h2>
              </div>
              <p>Choose what you need right now.</p>
            </div>

            <div className="reset-grid">
              <article className="surface tool-card focus-card">
                <div className="tool-card-heading">
                  <span className="tool-icon coral"><TimerReset aria-hidden="true" /></span>
                  <div><small>25-minute session</small><h3>Focus timer</h3></div>
                </div>
                <div className="focus-time">{formatTimer(focusSeconds)}</div>
                <Progress value={focusProgress} className="focus-progress" />
                <div className="tool-actions">
                  <Button
                    type="button"
                    className="primary-button"
                    onClick={() => setFocusRunning((current) => !current)}
                    disabled={focusSeconds === 0}
                  >
                    {focusRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                    {focusSeconds === 0
                      ? "Complete"
                      : focusRunning
                        ? "Pause"
                        : focusSeconds === FOCUS_SECONDS
                          ? "Start focus"
                          : "Resume"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="icon-button"
                    onClick={() => {
                      setFocusRunning(false);
                      setFocusSeconds(FOCUS_SECONDS);
                    }}
                    aria-label="Reset focus timer"
                  >
                    <RefreshCw aria-hidden="true" />
                  </Button>
                </div>
              </article>

              <article className="surface tool-card breathing-card">
                <div className="tool-card-heading">
                  <span className="tool-icon mint"><Wind aria-hidden="true" /></span>
                  <div><small>60-second reset</small><h3>Box breathing</h3></div>
                </div>
                <div className={`breath-visual ${breathing ? breathPhase.toLowerCase() : "idle"}`}>
                  <span className="breath-ring" aria-hidden="true" />
                  <span className="breath-core" aria-hidden="true" />
                  <strong>{breathing ? breathPhase : "Ready"}</strong>
                  <small>{breathing ? `${breathRemaining} seconds` : "4 · 4 · 4 · 4"}</small>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="secondary-button"
                  onClick={() => setBreathing((current) => !current)}
                >
                  {breathing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  {breathing ? "Pause" : breathRemaining < BREATH_SECONDS ? "Continue" : "Begin breathing"}
                </Button>
              </article>

              <article className="surface tool-card fortune-card" id="ask-saturn">
                <div className="tool-card-heading fortune-heading">
                  <span className="tool-icon violet"><BrainCircuit aria-hidden="true" /></span>
                  <div><small>Positive Magic 8 Ball</small><h3>Ask Saturn</h3></div>
                  <span className="ai-chip"><Sparkles aria-hidden="true" /> AI-ready</span>
                </div>

                <div className="fortune-window" aria-live="polite">
                  <span className="fortune-orbit"><Orbit aria-hidden="true" /></span>
                  <div>
                    <p>{asking ? "Reading the rings…" : fortune?.message ?? "Ask what’s on your mind. Saturn will answer with an encouraging next step."}</p>
                    {fortune ? <small>{fortune.source === "ai" ? "AI-generated encouragement" : "Built-in encouragement"}</small> : null}
                  </div>
                </div>

                <form className="fortune-form" onSubmit={submitQuestion}>
                  <label className="sr-only" htmlFor="saturn-question">Ask Saturn a question</label>
                  <Input
                    id="saturn-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Will I make progress today?"
                    maxLength={240}
                    className="saturn-input"
                  />
                  <Button type="submit" className="violet-button" disabled={asking || !question.trim()}>
                    <Sparkles aria-hidden="true" />
                    Ask
                  </Button>
                </form>
                {fortuneError ? <p className="form-error" role="alert">{fortuneError}</p> : null}
              </article>
            </div>
          </section>

          <footer className="app-footer">
            <span><Orbit aria-hidden="true" /> Saturn</span>
            <p>Plan gently. Move steadily.</p>
          </footer>
        </section>
      </div>
    </main>
  );
}
