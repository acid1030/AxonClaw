import React, { useEffect, useMemo, useState } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SelectField } from '../fields';
import { getTranslation } from '../../../locales';
import { getTooltip } from '../../../locales/tooltips';

// Options moved inside component

export const MemorySection: React.FC<SectionProps> = ({ setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => getTooltip(key, language);
  const g = (p: string[]) => getField(['memory', ...p]);
  const s = (p: string[], v: any) => setField(['memory', ...p], v);
  const memoryRoot = getField(['memory']);
  const memoryConfig = (memoryRoot && typeof memoryRoot === 'object' && !Array.isArray(memoryRoot))
    ? memoryRoot
    : {};
  const memoryConfigText = useMemo(() => JSON.stringify(memoryConfig, null, 2), [memoryConfig]);
  const [rawJson, setRawJson] = useState(memoryConfigText);
  const [jsonError, setJsonError] = useState('');

  const BACKEND_OPTIONS = useMemo(() => [{ value: 'builtin', label: es.optBuiltin }, { value: 'qmd', label: es.optQmd }], [es]);
  const CITATIONS_OPTIONS = useMemo(() => [{ value: 'auto', label: es.optAuto }, { value: 'on', label: es.optOn }, { value: 'off', label: es.optOff }], [es]);
  const RAW_SECTION_TITLE = es.memoryRawConfigTitle || 'Complete Memory Config (JSON)';
  const RAW_SECTION_DESC = es.memoryRawConfigDesc || 'All current memory settings are shown here. You can edit and apply the full memory object directly.';
  const RAW_JSON_PLACEHOLDER = es.memoryRawConfigPlaceholder || '{\n  "backend": "builtin"\n}';
  const APPLY_LABEL = es.memoryApplyJson || 'Apply JSON';
  const RESET_LABEL = es.memoryResetJson || 'Reset';
  const INVALID_JSON_ERROR = es.memoryInvalidJson || 'Invalid JSON. Please fix syntax and keep it as an object.';

  useEffect(() => {
    setRawJson(memoryConfigText);
    setJsonError('');
  }, [memoryConfigText]);

  const applyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError(INVALID_JSON_ERROR);
        return;
      }
      setField(['memory'], parsed);
      setJsonError('');
    } catch {
      setJsonError(INVALID_JSON_ERROR);
    }
  };

  return (
    <div className="space-y-4">
      <ConfigSection title={es.memoryConfig} icon="neurology" iconColor="text-sky-500">
        <SelectField label={es.memoryProvider} tooltip={tip('memory.backend')} value={g(['backend']) || 'builtin'} onChange={v => s(['backend'], v)} options={BACKEND_OPTIONS} />
        <SelectField label={es.citations} tooltip={tip('memory.citations')} value={g(['citations']) || 'auto'} onChange={v => s(['citations'], v)} options={CITATIONS_OPTIONS} />
        <TextField label={es.memSearchProvider || 'Search Provider'} tooltip={tip('memory.search.provider')} value={g(['search', 'provider']) || ''} onChange={v => s(['search', 'provider'], v)} placeholder="openai/text-embedding-3-small" />
        <TextField label={es.memSearchFallback || 'Search Fallback'} tooltip={tip('memory.search.fallback')} value={g(['search', 'fallback']) || ''} onChange={v => s(['search', 'fallback'], v)} placeholder="builtin" />
      </ConfigSection>

      {g(['backend']) === 'qmd' && (
        <ConfigSection title={es.optQmd} icon="database" iconColor="text-sky-500" defaultOpen={false}>
          <TextField label={es.qmdCommand} tooltip={tip('memory.qmd.command')} value={g(['qmd', 'command']) || ''} onChange={v => s(['qmd', 'command'], v)} placeholder={es.phQmdCommand} />
          <TextField label={es.qmdDataPath} tooltip={tip('memory.qmd.paths.data')} value={g(['qmd', 'paths', 'data']) || ''} onChange={v => s(['qmd', 'paths', 'data'], v)} />
          <NumberField label={es.maxMemories} tooltip={tip('memory.qmd.limits.maxEntries')} value={g(['qmd', 'limits', 'maxEntries'])} onChange={v => s(['qmd', 'limits', 'maxEntries'], v)} min={1} />
          <TextField label={es.scope} tooltip={tip('memory.qmd.scope')} value={g(['qmd', 'scope']) || ''} onChange={v => s(['qmd', 'scope'], v)} placeholder={es.phMemoryScope} />
        </ConfigSection>
      )}

      <ConfigSection title={RAW_SECTION_TITLE} icon="data_object" iconColor="text-indigo-500" defaultOpen={false}>
        <div className="space-y-3">
          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
            {RAW_SECTION_DESC}
          </p>
          <textarea
            value={rawJson}
            onChange={(event) => {
              setRawJson(event.target.value);
              if (jsonError) setJsonError('');
            }}
            placeholder={RAW_JSON_PLACEHOLDER}
            rows={12}
            className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-[12px] md:text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          {jsonError && (
            <p className="text-[11px] text-red-500">{jsonError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRawJson(memoryConfigText);
                setJsonError('');
              }}
              className="h-8 px-3 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 text-[11px] md:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-black/40 transition-colors"
            >
              {RESET_LABEL}
            </button>
            <button
              type="button"
              onClick={applyRawJson}
              className="h-8 px-3 rounded-md bg-primary text-white text-[11px] md:text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {APPLY_LABEL}
            </button>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
};
