import React from 'react';
import { CustomFieldDefinition, CustomFieldValue } from '../types';
import { getCustomFieldValues, upsertCustomFieldValue } from '../services/api';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ExternalLink } from 'lucide-react';

interface CustomFieldsPanelProps {
  taskId: string;
  fieldDefs: CustomFieldDefinition[];
}

export function CustomFieldsPanel({ taskId, fieldDefs }: CustomFieldsPanelProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!taskId) return;
    getCustomFieldValues(taskId).then(data => {
      const map: Record<string, string> = {};
      data.forEach((v: CustomFieldValue) => { map[v.fieldId] = v.value; });
      setValues(map);
      setLoaded(true);
    });
  }, [taskId]);

  const handleChange = async (fieldId: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    await upsertCustomFieldValue(taskId, fieldId, value);
  };

  if (!loaded || fieldDefs.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Custom Fields
      </label>
      <div className="space-y-2">
        {fieldDefs.map(def => (
          <div key={def.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{def.name}</span>
            {def.fieldType === 'select' ? (
              <Select
                value={values[def.id] ?? ''}
                onValueChange={v => handleChange(def.id, v)}
              >
                <SelectTrigger className="h-7 text-xs bg-muted/50 border-none flex-1">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {(def.options ?? []).map(opt => (
                    <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative flex-1">
                <Input
                  type={def.fieldType === 'number' ? 'number' : 'text'}
                  value={values[def.id] ?? ''}
                  onChange={e => handleChange(def.id, e.target.value)}
                  placeholder={def.fieldType === 'url' ? 'https://…' : '—'}
                  className="h-7 text-xs bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary pr-7"
                />
                {def.fieldType === 'url' && values[def.id] && (
                  <a
                    href={values[def.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
