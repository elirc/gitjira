import { registerUser } from '../services/auth.service.js';

export async function register(req, res) {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
}
