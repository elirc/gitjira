import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@gitjira/shared/issue-schemas';
import { Modal } from './Modal.jsx';

export function CreateProjectModal({ onClose, onCreate }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createProjectSchema) });

  const onSubmit = async (values) => {
    try {
      await onCreate(values);
    } catch (err) {
      setError('root', { message: err.message });
    }
  };

  return (
    <Modal title="New project" onClose={onClose}>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label>
          Key
          <input placeholder="GJ" {...register('key')} />
          {errors.key && <span className="field-error">{errors.key.message}</span>}
        </label>
        <label>
          Name
          <input placeholder="My project" {...register('name')} />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </label>
        <label>
          Description (optional)
          <input {...register('description')} />
        </label>
        {errors.root && <p className="form-error">{errors.root.message}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </Modal>
  );
}
