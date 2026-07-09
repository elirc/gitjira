import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '@gitjira/shared/auth-schemas';
import { useAuth } from '../auth/AuthContext.jsx';

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values) => {
    try {
      await registerAccount(values);
      navigate('/', { replace: true });
    } catch (err) {
      setError('root', { message: err.message });
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1>Create account</h1>

      <label>
        Name
        <input autoComplete="name" {...register('name')} />
        {errors.name && <span className="field-error">{errors.name.message}</span>}
      </label>

      <label>
        Email
        <input type="email" autoComplete="email" {...register('email')} />
        {errors.email && <span className="field-error">{errors.email.message}</span>}
      </label>

      <label>
        Password
        <input type="password" autoComplete="new-password" {...register('password')} />
        {errors.password && <span className="field-error">{errors.password.message}</span>}
      </label>

      {errors.root && <p className="form-error">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create account'}
      </button>

      <p>
        Have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
