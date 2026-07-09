import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createIssueSchema, ISSUE_TYPES, PRIORITIES } from '@gitjira/shared/issue-schemas';
import { Modal } from './Modal.jsx';

export function CreateIssueModal({ columns, onClose, onCreate }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createIssueSchema),
    defaultValues: { type: 'TASK', priority: 'MEDIUM', columnId: columns[0]?.id },
  });

  const onSubmit = async (values) => {
    try {
      await onCreate(values);
    } catch (err) {
      setError('root', { message: err.message });
    }
  };

  return (
    <Modal title="New issue" onClose={onClose}>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label>
          Title
          <input {...register('title')} />
          {errors.title && <span className="field-error">{errors.title.message}</span>}
        </label>
        <label>
          Type
          <select {...register('type')}>
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select {...register('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description (optional)
          <textarea rows={3} {...register('description')} />
        </label>
        {errors.root && <p className="form-error">{errors.root.message}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create issue'}
        </button>
      </form>
    </Modal>
  );
}
