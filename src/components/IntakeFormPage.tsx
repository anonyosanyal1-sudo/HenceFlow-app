import React from 'react';
import { IntakeForm, IntakeFormField } from '../types';
import { fetchIntakeFormByToken, submitIntakeForm } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from './Logo';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface IntakeFormPageProps {
  token: string;
}

export function IntakeFormPage({ token }: IntakeFormPageProps) {
  const [form, setForm] = React.useState<IntakeForm | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [submitterName, setSubmitterName] = React.useState('');
  const [submitterEmail, setSubmitterEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchIntakeFormByToken(token)
      .then(f => { if (f) setForm(f); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !values[field.name]?.trim()) {
        setError(`"${field.name}" is required.`);
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      await submitIntakeForm(form.id, values, submitterName || undefined, submitterEmail || undefined);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Form not found</h1>
          <p className="text-muted-foreground text-sm">This form link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Submitted!</h1>
          <p className="text-muted-foreground text-sm">Your request has been received. Thank you!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo variant="wordmark" className="h-7" />
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-foreground mb-1">{form.name}</h1>
          {form.description && <p className="text-sm text-muted-foreground mb-6">{form.description}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Submitter info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Your name</label>
                <Input
                  placeholder="Optional"
                  value={submitterName}
                  onChange={e => setSubmitterName(e.target.value)}
                  className="h-10 bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="Optional"
                  value={submitterEmail}
                  onChange={e => setSubmitterEmail(e.target.value)}
                  className="h-10 bg-background"
                />
              </div>
            </div>

            {/* Title field (always present) */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Request title <span className="text-red-400">*</span>
              </label>
              <Input
                required
                placeholder="Brief summary of your request"
                value={values['title'] ?? ''}
                onChange={e => setValues(v => ({ ...v, title: e.target.value }))}
                className="h-10 bg-background"
              />
            </div>

            {/* Custom fields */}
            {form.fields.map(field => (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.name] ?? ''}
                onChange={val => setValues(v => ({ ...v, [field.name]: val }))}
              />
            ))}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || !(values['title']?.trim())}
              className="w-full h-11 font-semibold"
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          Powered by HenceFlow
        </p>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: IntakeFormField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1 block">
        {field.name}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          placeholder={field.placeholder ?? ''}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      ) : field.type === 'select' && field.options?.length ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select an option</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <Input
          type={field.type === 'email' ? 'email' : 'text'}
          placeholder={field.placeholder ?? ''}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          className="h-10 bg-background"
        />
      )}
    </div>
  );
}
