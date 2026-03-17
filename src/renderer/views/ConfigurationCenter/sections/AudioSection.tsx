/**
 * 音频配置 - 表单式 UI（简化版）
 */
import React from 'react';
import { Volume2, Mic } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SelectField,
  SwitchField,
  NumberField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

export const AudioSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (path: string[]) => getField(path);
  const s = (path: string[], v: unknown) => setField(path, v);

  return (
    <div className="space-y-4">
      <ConfigSection title="语音 (Talk)" icon={Volume2} iconColor="text-fuchsia-500">
        <SelectField
          label="Provider"
          value={String(g(['talk', 'provider']) ?? '')}
          onChange={(v) => s(['talk', 'provider'], v)}
          options={[
            { value: '', label: '—' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'elevenlabs', label: 'ElevenLabs' },
            { value: 'edge', label: 'Edge' },
          ]}
        />
        <TextField
          label="Voice ID"
          value={String(g(['talk', 'voiceId']) ?? '')}
          onChange={(v) => s(['talk', 'voiceId'], v)}
        />
        <TextField
          label="Model ID"
          value={String(g(['talk', 'modelId']) ?? '')}
          onChange={(v) => s(['talk', 'modelId'], v)}
        />
        <SwitchField
          label="说话时打断"
          value={g(['talk', 'interruptOnSpeech']) === true}
          onChange={(v) => s(['talk', 'interruptOnSpeech'], v)}
        />
      </ConfigSection>

      <ConfigSection title="语音转写" icon={Mic} iconColor="text-fuchsia-500" defaultOpen={false}>
        <TextField
          label="命令"
          value={String(g(['audio', 'transcription', 'command']) ?? '')}
          onChange={(v) => s(['audio', 'transcription', 'command'], v)}
        />
        <NumberField
          label="超时(秒)"
          value={g(['audio', 'transcription', 'timeoutSeconds']) as number | undefined}
          onChange={(v) => s(['audio', 'transcription', 'timeoutSeconds'], v)}
          min={0}
        />
      </ConfigSection>
    </div>
  );
};
