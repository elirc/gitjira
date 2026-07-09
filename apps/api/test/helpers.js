import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

// LEARN: a tiny test helper so each test reads as intent, not plumbing.
// Registers a user and returns their bearer token + id.
export async function makeUser(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, name: email.split('@')[0], password: 'correct-horse-battery' });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'correct-horse-battery' });
  return {
    id: res.body.user.id,
    token: login.body.accessToken,
    auth: `Bearer ${login.body.accessToken}`,
  };
}

export async function makeProject(auth, key = 'GJ', name = 'GitJira') {
  const res = await request(app)
    .post('/api/projects')
    .set('Authorization', auth)
    .send({ key, name });
  return res.body.project;
}
