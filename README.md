# Transit Tracker

Real-time MTA bus + subway tracker for East Elmhurst, NDS Harlem, CUNY Law (LIC), and Legal Aid Society (Downtown).

## Deploy to Vercel (free, ~5 min)

### Prerequisites
- Node.js installed
- Vercel account (free at vercel.com)

### Steps

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. From this folder, deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: transit-tracker (or anything)
# - Root directory: ./  (hit enter)
# - Override build settings? No

# 3. Add your MTA Bus API key as an environment variable
vercel env add MTA_BUS_KEY
# Paste: cae896f4-1935-4da6-b8eb-724eb661403f
# Select: Production, Preview, Development

# 4. Redeploy with the env var active
vercel --prod
```

Your app will be live at something like `transit-tracker-xyz.vercel.app`.

Share that URL with your partner — bookmark it on both phones.

## How It Works

- `public/index.html` — the web app
- `api/bus.js` — serverless function that proxies MTA BusTime SIRI API
  - MTA blocks direct browser requests (CORS), so all bus calls go through this proxy
  - Your API key lives in Vercel env vars, never exposed in the HTML
- Refreshes every 30 seconds (MTA's rate limit)
- Subway lines shown with link to MTA live board (protobuf parsing requires additional backend work)

## Locations Configured

| Label | Location | MTA Stops |
|-------|----------|-----------|
| HOME | East Elmhurst / Jackson Hts | Northern Blvd, Astoria Blvd, Jackson Ave |
| NDS | Harlem, Manhattan | Frederick Douglass Blvd, Lenox Ave, 7th Ave |
| CUNY LAW | LIC, Queens | Queens Blvd, Jackson Ave |
| LEGAL AID | Downtown Manhattan | Broadway, Church St, Hudson St |

## Adding/Changing Stops

To find MTA stop IDs near any location:
```
https://bustime.mta.info/api/where/stops-for-location.json?lat=LAT&lon=LNG&latSpan=0.004&lonSpan=0.004&key=YOUR_KEY
```

Replace stop IDs in the `LOCATIONS` array in `public/index.html`.
