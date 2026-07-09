import { checkHealth } from '../services/health.service.js';

// LEARN: a controller is a translator, nothing more. HTTP comes in, a
// service is called, HTTP goes out. If you find an `if` in a controller
// that isn't about the shape of the request/response, it belongs in a
// service. This one is trivially thin — that is the point of the pattern,
// not a shortcoming of it.
export async function getHealth(req, res) {
  const health = await checkHealth();
  res.json(health);
}
