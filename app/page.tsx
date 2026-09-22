"use client";

import {
  BrainCircuit,
  Check,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
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
  Sun,
  TimerReset,
  Trash2,
  Wind,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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
  if (code === 0) return <Sun className={className} aria-hidden="true" />;
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
  const [taskTime, setTaskTime] = useState("09:00");
  const [hydrated, setHydrated] = useState(false);
  const [mood, setMood] = useState("");

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("Use location or search a city.");
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [focusSeconds, setFocusSeconds] = useState(FOCUS_SECONDS);
  const [focusRunning, setFocusRunning] = useState(false);

  const [breathing, setBreathing] = useState(false);
  const [breathRemaining, setBreathRemaining] = useState(BREATH_SECONDS);

  const [question, setQuestion] = useState("");
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [fortuneError, setFortuneError] = useState("");
  const [asking, setAsking] = useState(false);

  const [dateLabel, setDateLabel] = useState("Today");
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const now = new Date();
    setDateLabel(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
    const hour = now.getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    try {
      const savedTasks = localStorage.getItem("saturn.tasks");
      const savedMood = localStorage.getItem("saturn.mood");
      if (savedTasks) setTasks(JSON.parse(savedTasks) as Task[]);
      if (savedMood) setMood(savedMood);
    } catch {
      // The starter plan remains available if browser storage is unavailable.
    } finally {
      setHydrated(true);
    }
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
      time,
      completed: false,
    };
    setTasks((current) => [...current, task].sort((a, b) => a.time.localeCompare(b.time)));
    return task;
  }, []);

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    if (!addTask(taskTitle, taskTime)) return;
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
    const modelContext = (
      document as Document & { modelContext?: ModelContextLike }
    ).modelContext;
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
              time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
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
            const time = typeof candidate.time === "string" ? candidate.time : "";
            const task = addTask(candidate.title, time);
            if (!task) throw new Error("Could not add that plan item");
            return { id: task.id, title: task.title, time: task.time, status: "added" };
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
    if (!tasks.length) return "A clear orbit. Add what matters today.";
    if (completedTasks === tasks.length) return "Everything is complete. Let the day feel lighter.";
    return `${tasks.length - completedTasks} item${tasks.length - completedTasks === 1 ? "" : "s"} left in today’s orbit.`;
  }, [completedTasks, tasks.length]);

  return (
    <main className="saturn-app">
      <header className="topbar">
        <a className="brand" href="#today" aria-label="Saturn home">
          <span className="brand-mark"><Orbit aria-hidden="true" /></span>
          <span>SATURN</span>
        </a>
        <nav className="topnav" aria-label="Saturn sections">
          <a href="#today">Today</a>
          <a href="#reset">Reset</a>
          <a href="#ask-saturn">Ask Saturn</a>
        </nav>
        <div className="mood-chip" aria-label={mood ? `Current mood: ${mood}` : "No mood selected"}>
          <span>{selectedMood?.emoji ?? "✦"}</span>
          <span>{mood || "Check in"}</span>
        </div>
      </header>

      <div className="dashboard-shell">
        <section className="welcome-row" aria-labelledby="welcome-heading">
          <div>
            <p className="eyebrow">{dateLabel}</p>
            <h1 id="welcome-heading">{greeting}. Make space for what matters.</h1>
          </div>
          <div className="day-progress" aria-label={`${completedTasks} of ${tasks.length} plan items complete`}>
            <span>{completedTasks}/{tasks.length || 0} complete</span>
            <Progress value={planProgress} className="day-progress-bar" />
          </div>
        </section>

        <div className="primary-grid">
          <section className="panel planner-panel" id="today" aria-labelledby="planner-heading">
            <div className="panel-heading planner-heading">
              <div>
                <p className="eyebrow">Daily orbit</p>
                <h2 id="planner-heading">Today’s plan</h2>
                <p>{planSummary}</p>
              </div>
              <span className="count-badge">{tasks.length} planned</span>
            </div>

            <form className="task-form" onSubmit={submitTask}>
              <label className="sr-only" htmlFor="task-title">New plan item</label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Add something to your day…"
                maxLength={100}
                className="saturn-input task-title-input"
              />
              <label className="sr-only" htmlFor="task-time">Time</label>
              <Input
                id="task-time"
                type="time"
                value={taskTime}
                onChange={(event) => setTaskTime(event.target.value)}
                className="saturn-input time-input"
              />
              <Button type="submit" className="gold-button" disabled={!taskTitle.trim()}>
                <Plus aria-hidden="true" />
                Add
              </Button>
            </form>

            <div className="task-list" aria-live="polite">
              {tasks.length === 0 ? (
                <div className="empty-plan">
                  <Check aria-hidden="true" />
                  <p>Your day is open. Add one small thing worth doing.</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div className={`task-row${task.completed ? " task-complete" : ""}`} key={task.id}>
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="task-checkbox"
                    />
                    <label htmlFor={`task-${task.id}`} className="task-copy">
                      <span>{task.title}</span>
                      <small>{task.completed ? "Complete" : "Ready when you are"}</small>
                    </label>
                    <time>{task.time || "Anytime"}</time>
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
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="side-stack" aria-label="Weather and mood">
            <section className="panel weather-panel" aria-labelledby="weather-heading">
              <div className="panel-heading compact-heading">
                <div>
                  <p className="eyebrow">Outside now</p>
                  <h2 id="weather-heading">Weather</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="soft-icon-button"
                  onClick={useMyLocation}
                  aria-label="Use my current location"
                  disabled={weatherLoading}
                >
                  <LocateFixed aria-hidden="true" />
                </Button>
              </div>

              {weather ? (
                <div className="weather-reading">
                  <div className="weather-main">
                    <WeatherIcon code={weather.code} className="weather-icon" />
                    <div>
                      <strong>{weather.temperature}°</strong>
                      <span>{getWeatherLabel(weather.code)}</span>
                    </div>
                  </div>
                  <p className="weather-place"><MapPin aria-hidden="true" /> {weather.location}</p>
                  <div className="weather-details">
                    <span>H {weather.high}° / L {weather.low}°</span>
                    <span><CloudRain aria-hidden="true" /> {weather.precipitation}%</span>
                    <span><Wind aria-hidden="true" /> {weather.wind} mph</span>
                  </div>
                  <p className="feels-like">Feels like {weather.apparent}°</p>
                </div>
              ) : (
                <div className="weather-placeholder">
                  <CloudSun aria-hidden="true" />
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
                  variant="secondary"
                  className="search-button"
                  aria-label="Search weather"
                  disabled={weatherLoading || !city.trim()}
                >
                  {weatherLoading ? <RefreshCw className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
                </Button>
              </form>
              {weather && weatherStatus ? <p className="inline-status">{weatherStatus}</p> : null}
            </section>

            <section className="panel mood-panel" aria-labelledby="mood-heading">
              <div className="panel-heading compact-heading">
                <div>
                  <p className="eyebrow">One honest moment</p>
                  <h2 id="mood-heading">How are you?</h2>
                </div>
              </div>
              <div className="mood-options" role="group" aria-label="Choose your mood">
                {MOODS.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    className={`mood-option${mood === item.label ? " selected" : ""}`}
                    onClick={() => setMood(item.label)}
                    aria-pressed={mood === item.label}
                    title={item.label}
                  >
                    <span>{item.emoji}</span>
                    <small>{item.label}</small>
                  </button>
                ))}
              </div>
              <p className="mood-note">
                {mood ? `Noted: you’re feeling ${mood.toLowerCase()}.` : "No fixing. Just notice where you are."}
              </p>
            </section>
          </aside>
        </div>

        <section className="wellness-section" id="reset" aria-labelledby="reset-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reset station</p>
              <h2 id="reset-heading">Slow down, then move forward.</h2>
            </div>
            <p>Pick one. A small reset still counts.</p>
          </div>

          <div className="wellness-grid">
            <article className="panel reset-card breathing-card">
              <div className="card-icon mint"><Wind aria-hidden="true" /></div>
              <div>
                <p className="eyebrow">60-second reset</p>
                <h3>Box breathing</h3>
              </div>
              <div className={`breath-visual ${breathing ? breathPhase.toLowerCase() : "idle"}`}>
                <span className="breath-orb" aria-hidden="true" />
                <strong aria-live="polite">{breathing ? breathPhase : "Ready"}</strong>
                <small>{breathing ? `${breathRemaining}s` : "4 · 4 · 4 · 4"}</small>
              </div>
              <Button
                type="button"
                variant="outline"
                className="panel-button"
                onClick={() => {
                  setBreathing((current) => !current);
                  if (!breathing && breathRemaining === BREATH_SECONDS) setBreathRemaining(BREATH_SECONDS);
                }}
              >
                {breathing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                {breathing ? "Pause" : breathRemaining < BREATH_SECONDS ? "Continue" : "Begin breathing"}
              </Button>
            </article>

            <article className="panel reset-card focus-card">
              <div className="card-icon peach"><TimerReset aria-hidden="true" /></div>
              <div>
                <p className="eyebrow">Quiet momentum</p>
                <h3>Focus timer</h3>
              </div>
              <div className="focus-time" aria-live="polite">{formatTimer(focusSeconds)}</div>
              <Progress value={focusProgress} className="focus-progress" />
              <div className="timer-actions">
                <Button
                  type="button"
                  className="gold-button"
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
                  className="soft-icon-button"
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

            <article className="panel reset-card eight-ball-card" id="ask-saturn">
              <div className="eight-ball-topline">
                <div className="card-icon violet"><BrainCircuit aria-hidden="true" /></div>
                <span className="ai-label"><Sparkles aria-hidden="true" /> Positive 8 Ball</span>
              </div>
              <div>
                <p className="eyebrow">A little cosmic encouragement</p>
                <h3>Ask Saturn</h3>
              </div>
              <div className="fortune-window" aria-live="polite">
                <Orbit aria-hidden="true" />
                <p>
                  {asking
                    ? "Reading the rings…"
                    : fortune?.message ?? "Ask what’s on your mind. Saturn answers with a kind next step."}
                </p>
                {fortune ? (
                  <small>{fortune.source === "ai" ? "AI-generated encouragement" : "Built-in encouragement"}</small>
                ) : null}
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

        <footer>
          <span><Orbit aria-hidden="true" /> Saturn</span>
          <p>Your plan is saved on this device.</p>
        </footer>
      </div>
    </main>
  );
}
