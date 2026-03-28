// api/bus.js — Vercel serverless function
// Proxies MTA BusTime SIRI StopMonitoring API
// API key lives in Vercel env vars, never exposed to browser

export default async function handler(req, res) {
  // CORS headers so your frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.MTA_BUS_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'MTA_BUS_KEY not configured in environment variables' });
  }

  // Expect: /api/bus?stopId=MTA_305423&stopId=MTA_305424
  // Multiple stopIds supported per call
  const { stopId } = req.query;

  if (!stopId) {
    return res.status(400).json({ error: 'stopId param required' });
  }

  const stopIds = Array.isArray(stopId) ? stopId : [stopId];

  try {
    const results = await Promise.all(
      stopIds.map(async (id) => {
        const url = `https://bustime.mta.info/api/siri/stop-monitoring.json` +
          `?key=${API_KEY}` +
          `&OperatorRef=MTA` +
          `&MonitoringRef=${id}` +
          `&MaximumStopVisits=5` +
          `&StopMonitoringDetailLevel=minimum`;

        const response = await fetch(url);
        if (!response.ok) {
          console.error(`MTA error for stop ${id}: ${response.status}`);
          return { stopId: id, visits: [] };
        }

        const data = await response.json();
        const delivery = data?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0];
        const visits = delivery?.MonitoredStopVisit || [];

        return {
          stopId: id,
          visits: visits.map(v => {
            const journey = v.MonitoredVehicleJourney;
            const call = journey?.MonitoredCall;
            return {
              route: journey?.PublishedLineName || journey?.LineRef?.replace('MTA NYCT_', '') || '?',
              destination: journey?.DestinationName || '',
              vehicleLat: journey?.VehicleLocation?.Latitude,
              vehicleLng: journey?.VehicleLocation?.Longitude,
              vehicleRef: journey?.VehicleRef,
              stopName: call?.StopPointName || '',
              expectedArrival: call?.ExpectedArrivalTime || null,
              aimedArrival: call?.AimedArrivalTime || null,
              proximityText: call?.ArrivalProximityText || '',
              distanceFromStop: call?.DistanceFromStop,
              numberOfStopsAway: call?.NumberOfStopsAway,
            };
          })
        };
      })
    );

    return res.status(200).json({ stops: results, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch from MTA BusTime', detail: err.message });
  }
}
