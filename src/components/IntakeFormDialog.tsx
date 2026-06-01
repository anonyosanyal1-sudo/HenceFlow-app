import React from 'react';
import { IntakeForm, IntakeFormField, IntakeSubmission, Pod } from '../types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Copy, Check, Globe, Lock, ChevronDown, ChevronUp, Inbox, Pencil,
} from 'lucide-react';
import {
  fetchIntakeForms, createIntakeForm, updateIntakeForm, deleteIntakeForm,
  fetchIntakeSubmissions,
} from '../services/api';
import { toast } from 'sonner';

interface IntakeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  pods: Pod[];
}

const FIELD_TYPES: { value: IntakeFormField['type']; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'select', label: 'Dropdown' },
];

function newField(): IntakeFormField {
  return { id: crypto.randomUUID(), name: '', type: 'text', required: false };
}

function SubmissionsList({ formId }: { formId: string }) {
  const [submissions, setSubmissions] = React.useState<IntakeSubmission[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchIntakeSubmissions(formId)
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [formId]);

  if (loading) return <p className="text-xs text-muted-foreground py-2">Loading submissions…</p>;
  if (submissions.length === 0) return <p className="text-xs text-muted-foreground/40 py-2 italic">No submissions yet.</p>;

  return (
    <div className="space-y-2 mt-2">
      {submissions.map(sub => (
        <div key={sub.id} className="border border-border/30 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-foreground">
              {sub.submitterName ?? 'Anonymous'}
              {sub.submitterEmail && <span className="text-muted-foreground/50 ml-1">({sub.submitterEmail})</span>}
            </span>
            <span className="text-muted-foreground/40">
              {new Date(sub.createdAt).toLocaleString()}
            </span>
          </div>
          {Object.entries(sub.data).map(([k, v]) => (
            <div key={k} className="text-muted-foreground/60">{k}: <span className="text-foreground">{v}</span></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function IntakeFormDialog({ open, onOpenChange, projectId, pods }: IntakeFormDialogProps) {
  const [forms, setForms] = React.useState<IntakeForm[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showSubmissions, setShowSubmissions] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [formName, setFormName] = React.useState('');
  const [formDesc, setFormDesc] = React.useState('');
  const [formPodId, setFormPodId] = React.useState('');
  const [formFields, setFormFields] = React.useState<IntakeFormField[]>([]);
  const [formPublic, setFormPublic] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchIntakeForms(projectId)
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const resetFormState = () => {
    setFormName(''); setFormDesc(''); setFormPodId(''); setFormFields([]); setFormPublic(true);
    setCreating(false); setEditingId(null);
  };

  const startEdit = (form: IntakeForm) => {
    setFormName(form.name);
    setFormDesc(form.description ?? '');
    setFormPodId(form.podId ?? '');
    setFormFields(form.fields);
    setFormPublic(form.isPublic);
    setEditingId(form.id);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const data = {
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      podId: formPodId || undefined,
      fields: formFields,
      isPublic: formPublic,
      defaultPriority: 'medium',
      defaultStatus: 'todo',
    };
    try {
      if (editingId) {
        await updateIntakeForm(editingId, data);
        setForms(forms.map(f => f.id === editingId ? { ...f, ...data } : f));
        toast.success('Form updated');
      } else {
        const newForm = await createIntakeForm(projectId, data);
        setForms([newForm, ...forms]);
        toast.success('Form created');
      }
      resetFormState();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      await deleteIntakeForm(formId);
      setForms(forms.filter(f => f.id !== formId));
      toast.success('Form deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete form');
    }
  };

  const addField = () => setFormFields(f => [...f, newField()]);
  const removeField = (id: string) => setFormFields(f => f.filter(x => x.id !== id));
  const updateField = (id: string, patch: Partial<IntakeFormField>) =>
    setFormFields(f => f.map(x => x.id === id ? { ...x, ...patch } : x));

  const copyLink = (token: string) => {
    const url = `${window.location.origin}?intake=${token}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const FormEditor = () => (
    <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-muted/20">
      <Input autoFocus placeholder="Form name" value={formName} onChange={e => setFormName(e.target.value)} className="h-9 bg-background border-border/50" />
      <Input placeholder="Description (optional)" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="h-9 bg-background border-border/50" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Target pod</label>
          <select value={formPodId} onChange={e => setFormPodId(e.target.value)} className="w-full h-9 px-2 rounded-md border border-border/50 bg-background text-sm text-foreground">
            <option value="">Any pod</option>
            {pods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Visibility</label>
          <select value={formPublic ? 'public' : 'private'} onChange={e => setFormPublic(e.target.value === 'public')} className="w-full h-9 px-2 rounded-md border border-border/50 bg-background text-sm text-foreground">
            <option value="public">Public (anyone with link)</option>
            <option value="private">Private (members only)</option>
          </select>
        </div>
      </div>

      {/* Fields editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Form fields</label>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addField}>
            <Plus className="w-3 h-3" /> Add field
          </Button>
        </div>
        {formFields.length === 0 && (
          <p className="text-xs text-muted-foreground/40 italic py-2">No fields yet. Submitters will only see a title input.</p>
        )}
        {formFields.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2 mb-2">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Field ${idx + 1} name`}
                  value={field.name}
                  onChange={e => updateField(field.id, { name: e.target.value })}
                  className="h-8 text-xs bg-background border-border/50 flex-1"
                />
                <select
                  value={field.type}
                  onChange={e => updateField(field.id, { type: e.target.value as IntakeFormField['type'] })}
                  className="h-8 px-2 rounded-md border border-border/50 bg-background text-xs text-foreground w-32"
                >
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer shrink-0">
                  <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="rounded" />
                  Req
                </label>
                <button onClick={() => removeField(field.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {field.type === 'select' && (
                <Input
                  placeholder="Options: comma,separated,values"
                  value={(field.options ?? []).join(', ')}
                  onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="h-7 text-xs bg-background border-border/50"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!formName.trim() || saving} className="h-8">
          {saving ? 'Saving…' : editingId ? 'Update form' : 'Create form'}
        </Button>
        <Button size="sm" variant="ghost" onClick={resetFormState} className="h-8">Cancel</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            Intake Forms
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {(creating || editingId) ? (
            <FormEditor />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="h-8 gap-1.5 w-full border-dashed">
              <Plus className="w-3.5 h-3.5" /> New form
            </Button>
          )}

          {loading && <p className="text-xs text-muted-foreground py-4 text-center">Loading forms…</p>}

          {!loading && forms.length === 0 && !creating && (
            <div className="text-center py-8 text-muted-foreground/50 text-sm">
              No intake forms yet. Create one to start collecting requests.
            </div>
          )}

          {forms.map(form => (
            <div key={form.id} className="border border-border/40 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                {form.isPublic ? (
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{form.name}</p>
                  {form.description && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{form.description}</p>}
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                    {form.fields.length} custom fields · {form.isPublic ? 'Public' : 'Private'}
                    {pods.find(p => p.id === form.podId) && ` · → ${pods.find(p => p.id === form.podId)?.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 gap-1"
                    onClick={() => copyLink(form.token)}
                    title="Copy form link"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-foreground" onClick={() => startEdit(form)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-red-400" onClick={() => handleDelete(form.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                    onClick={() => setShowSubmissions(showSubmissions === form.id ? null : form.id)}
                  >
                    {showSubmissions === form.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              {showSubmissions === form.id && (
                <div className="border-t border-border/20 px-3 pb-3">
                  <SubmissionsList formId={form.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
