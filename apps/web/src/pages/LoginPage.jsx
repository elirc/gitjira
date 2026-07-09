import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@gitjira/shared/auth-schemas';
import { useAuth } from '../auth/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  // LEARN: zodResolver runs the SAME schema the API enforces — the form
  // cannot accept something the server would reject, because they are
  // literally the same object from packages/shared.
  const onSubmit = async (values) => {
    try {
      await login(values);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setError('root', { message: err.message });
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1>Log in</h1>

      <label>
        Email
        <input type="email" autoComplete="email" {...register('email')} />
        {errors.email && <span className="field-error">{errors.email.message}</span>}
      </label>

      <label>
        Password
        <input type="password" autoComplete="current-password" {...register('password')} />
        {errors.password && <span className="field-error">{errors.password.message}</span>}
      </label>

      {errors.root && <p className="form-error">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </button>

      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
