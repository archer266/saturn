# Saturn

Saturn is a weather-aware daily planner designed to help people organize their day without adding more stress. It combines practical planning tools with small, calming resets in one responsive dashboard.

## Features

- Daily planner with AM/PM scheduling, completion tracking, and device-local saving
- Live weather by current location or city search
- Mood check-in saved on the current device
- 25-minute focus timer
- Guided 60-second box-breathing reset
- “Ask Saturn” positive Magic 8 Ball
- Optional OpenAI-powered encouragement with a built-in offline fallback
- Responsive, keyboard-friendly interface

## Run locally

You need Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Open the local address shown in your terminal.

### Windows / VS Code

Open the `saturn` folder in VS Code, then open **Terminal → New Terminal** and run:

```powershell
pnpm.cmd install
pnpm.cmd dev
```

Use `pnpm.cmd` on Windows if PowerShell says script execution is disabled. Stop the app with `Ctrl + C`.

## Connect the AI Magic 8 Ball

The Magic 8 Ball works immediately with built-in positive responses. To generate each answer with OpenAI, add these server-side environment variables:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
```

Never place an API key in client-side code or commit it to GitHub.

## Tech stack

- React 19
- TypeScript
- Vinext / Next-compatible routing
- Tailwind CSS
- Cloudflare Workers
- Open-Meteo for weather data
- OpenAI Responses API for optional AI encouragement

## Project structure

- `app/page.tsx` — planner, 12-hour time controls, weather, mood, timers, and Magic 8 Ball interactions
- `app/globals.css` — cosmic dashboard visual system and responsive layout
- `app/api/affirmation/route.ts` — secure AI endpoint and fallback responses
- `public/favicon.svg` — Saturn app icon

## Portfolio summary

Built a responsive wellness and productivity dashboard that combines real-time weather data, persistent task management, focus tools, mood tracking, and an optional server-side AI feature.
