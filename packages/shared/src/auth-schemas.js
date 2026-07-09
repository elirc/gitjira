import { z } from 'zod';

// LEARN: one schema, two enforcement points. The web form uses this for
// instant field-level feedback; the API middleware uses the SAME object as
// the security boundary. They cannot drift because they are not two things.
// (Client validation is UX. Server validation is the law.)
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase() // LEARN: normalize BEFORE the unique check — or Bob@x.com and bob@x.com become two accounts
    .email('Enter a valid email'),
  name: z.string().trim().min(1, 'Name is required').max(80),
  password: z.string().min(10, 'At least 10 characters').max(128, 'At most 128 characters'), // LEARN: unbounded input + bcrypt = a cheap DoS vector
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
