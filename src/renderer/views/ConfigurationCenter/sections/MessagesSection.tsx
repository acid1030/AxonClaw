/**
 * 消息配置 - 表单式 UI
 */
import React from 'react';
import { Quote, ThumbsUp, Users, Inbox, Edit3, Mic } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SelectField,
  SwitchField,
  NumberField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const ACK_SCOPE_OPTIONS = [
  { value: 'group-mentions', label: '群组提及' },
  { value: 'group-all', label: '群组全部' },
  { value: 'direct', label: '私聊' },
  { value: 'all', label: '全部' },
];
const QUEUE_OPTIONS = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'debounce', label: '防抖' },
  { value: 'off', label: '关闭' },
];
const TYPING_OPTIONS = [
  { value: 'never', label: '从不' },
  { value: 'instant', label: '即时' },
  { value: 'thinking', label: '思考中' },
  { value: 'message', label: '消息' },
];

export const MessagesSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['messages', ...p]);
  const s = (p: string[], v: unknown) => setField(['messages', ...p], v);
  const sg = (p: string[]) => getField(['session', ...p]);
  const ss = (p: string[], v: unknown) => setField(['session', ...p], v);
  const tg = (p: string[]) => getField(['tools', 'message', ...p]);
  const ts = (p: string[], v: unknown) => setField(['tools', 'message', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="前缀" icon={Quote} iconColor="text-cyan-500">
        <TextField
          label="消息前缀"
          value={String(g(['messagePrefix']) ?? '')}
          onChange={(v) => s(['messagePrefix'], v)}
          placeholder="用户:"
          mono={false}
        />
        <TextField
          label="回复前缀"
          value={String(g(['responsePrefix']) ?? '')}
          onChange={(v) => s(['responsePrefix'], v)}
          placeholder="助手:"
          mono={false}
        />
      </ConfigSection>

      <ConfigSection title="确认反应" icon={ThumbsUp} iconColor="text-amber-500">
        <TextField
          label="确认 Emoji"
          value={String(g(['ackReaction']) ?? '')}
          onChange={(v) => s(['ackReaction'], v)}
          placeholder="👍"
          mono={false}
        />
        <SelectField
          label="确认范围"
          value={String(g(['ackReactionScope']) ?? 'group-mentions')}
          onChange={(v) => s(['ackReactionScope'], v)}
          options={ACK_SCOPE_OPTIONS}
        />
        <SwitchField
          label="回复后移除"
          value={g(['removeAckAfterReply']) === true}
          onChange={(v) => s(['removeAckAfterReply'], v)}
        />
      </ConfigSection>

      <ConfigSection title="群聊" icon={Users} iconColor="text-green-500" defaultOpen={false}>
        <ArrayField
          label="提及模式"
          value={(g(['groupChat', 'mentionPatterns']) as string[]) ?? []}
          onChange={(v) => s(['groupChat', 'mentionPatterns'], v)}
          placeholder="@username"
        />
        <NumberField
          label="历史限制"
          value={g(['groupChat', 'historyLimit']) as number | undefined}
          onChange={(v) => s(['groupChat', 'historyLimit'], v)}
          min={0}
        />
      </ConfigSection>

      <ConfigSection title="消息队列" icon={Inbox} iconColor="text-indigo-500" defaultOpen={false}>
        <SelectField
          label="模式"
          value={String(g(['queue', 'mode']) ?? 'debounce')}
          onChange={(v) => s(['queue', 'mode'], v)}
          options={QUEUE_OPTIONS}
        />
        <NumberField
          label="防抖(ms)"
          value={g(['queue', 'debounceMs']) as number | undefined}
          onChange={(v) => s(['queue', 'debounceMs'], v)}
          min={0}
          step={100}
        />
        <NumberField
          label="队列容量"
          value={g(['queue', 'cap']) as number | undefined}
          onChange={(v) => s(['queue', 'cap'], v)}
          min={1}
        />
        <SwitchField
          label="满时丢弃"
          value={g(['queue', 'drop']) === true}
          onChange={(v) => s(['queue', 'drop'], v)}
        />
      </ConfigSection>

      <ConfigSection title="打字模式" icon={Edit3} iconColor="text-purple-500" defaultOpen={false}>
        <SelectField
          label="模式"
          value={String(sg(['typingMode']) ?? 'never')}
          onChange={(v) => ss(['typingMode'], v)}
          options={TYPING_OPTIONS}
        />
        <NumberField
          label="打字间隔(秒)"
          value={sg(['typingIntervalSeconds']) as number | undefined}
          onChange={(v) => ss(['typingIntervalSeconds'], v)}
          min={1}
        />
      </ConfigSection>

      <ConfigSection title="TTS 配置" icon={Mic} iconColor="text-fuchsia-500" defaultOpen={false}>
        <SelectField
          label="TTS Provider"
          value={String(g(['tts', 'provider']) ?? '')}
          onChange={(v) => s(['tts', 'provider'], v)}
          options={[
            { value: '', label: '—' },
            { value: 'elevenlabs', label: 'ElevenLabs' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'edge', label: 'Edge' },
          ]}
        />
        <SwitchField
          label="自动 TTS"
          value={g(['tts', 'auto']) === true}
          onChange={(v) => s(['tts', 'auto'], v)}
        />
        <TextField
          label="Voice ID"
          value={String(g(['tts', 'voiceId']) ?? '')}
          onChange={(v) => s(['tts', 'voiceId'], v)}
        />
      </ConfigSection>

      <ConfigSection title="消息工具" icon={Inbox} iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label="跨上下文发送"
          value={tg(['crossContext']) === true}
          onChange={(v) => ts(['crossContext'], v)}
        />
        <SwitchField
          label="广播"
          value={tg(['broadcast']) === true}
          onChange={(v) => ts(['broadcast'], v)}
        />
      </ConfigSection>
    </div>
  );
};
