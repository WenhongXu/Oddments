import { useState } from 'react';

const DIMENSION_COLORS = {
  BODY: 'text-body', DIET: 'text-diet', MIND: 'text-mind',
  CAREER: 'text-career', RELATION: 'text-relation', FAMILY: 'text-family',
  FINANCE: 'text-finance', INNER: 'text-inner',
};

const DIMENSION_LABELS = {
  BODY: '身体', DIET: '饮食', MIND: '心理',
  CAREER: '职业', RELATION: '关系', FAMILY: '家庭',
  FINANCE: '财务', INNER: '内修',
};

export default function QuestionInput({ question, value, onChange }) {
  const { question_text, question_type, config, dimension } = question;
  const dimColor = DIMENSION_COLORS[dimension] || 'text-gold';
  const dimLabel = DIMENSION_LABELS[dimension];

  return (
    <div className="card mb-3 fade-in">
      {dimension && (
        <span className={`text-xs font-medium ${dimColor} mb-2 block`}>{dimLabel}</span>
      )}
      <p className="text-sm text-text mb-3 leading-relaxed">{question_text}</p>

      {question_type === 'scale' && (
        <ScaleInput config={config} value={value} onChange={onChange} />
      )}

      {question_type === 'number' && (
        <NumberInput config={config} value={value} onChange={onChange} />
      )}

      {question_type === 'text' && (
        <textarea
          className="input-field resize-none h-20 text-sm"
          placeholder={config?.placeholder || '写下你的想法...'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {question_type === 'yesno' && (
        <YesNoInput value={value} onChange={onChange} />
      )}

      {question_type === 'yesno_text' && (
        <YesNoTextInput config={config} value={value} onChange={onChange} />
      )}

      {question_type === 'yesno_number' && (
        <YesNoNumberInput config={config} value={value} onChange={onChange} />
      )}

      {question_type === 'choice' && (
        <ChoiceInput config={config} value={value} onChange={onChange} />
      )}
    </div>
  );
}

function ScaleInput({ config, value, onChange }) {
  const { min = 1, max = 5, label } = config || {};
  const current = value || min;

  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
  const color = colors[Math.min(Math.round(current) - 1, 4)];

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-textMuted text-xs">{min}</span>
        <span className="text-2xl font-bold" style={{ color }}>{current}</span>
        <span className="text-textMuted text-xs">{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full"
        style={{ accentColor: '#e8a849' }}
      />
      {label && <p className="text-textMuted text-xs mt-1 text-center">{label}</p>}
    </div>
  );
}

function NumberInput({ config, value, onChange }) {
  const { unit = '', min = 0, max = 999 } = config || {};

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, (value || 0) - 1))}
        className="w-10 h-10 rounded-full bg-surfaceHover border border-border text-xl text-textMuted active:bg-border transition-colors flex-shrink-0"
      >−</button>
      <div className="flex-1 text-center">
        <span className="text-3xl font-bold text-gold">{value || 0}</span>
        {unit && <span className="text-textMuted text-sm ml-1">{unit}</span>}
      </div>
      <button
        onClick={() => onChange(Math.min(max, (value || 0) + 1))}
        className="w-10 h-10 rounded-full bg-surfaceHover border border-border text-xl text-textMuted active:bg-border transition-colors flex-shrink-0"
      >+</button>
    </div>
  );
}

function YesNoInput({ value, onChange }) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onChange(true)}
        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
          value === true
            ? 'bg-gold/20 border-gold text-gold'
            : 'bg-surfaceHover border-border text-textMuted active:bg-border'
        }`}
      >
        是
      </button>
      <button
        onClick={() => onChange(false)}
        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
          value === false
            ? 'bg-blue-900/30 border-blue-500/50 text-blue-300'
            : 'bg-surfaceHover border-border text-textMuted active:bg-border'
        }`}
      >
        否
      </button>
    </div>
  );
}

function YesNoTextInput({ config, value, onChange }) {
  const val = value || { answer: null, text: '' };

  return (
    <div>
      <YesNoInput value={val.answer} onChange={a => onChange({ ...val, answer: a })} />
      {val.answer === true && (
        <textarea
          className="input-field resize-none h-16 text-sm mt-2"
          placeholder={config?.placeholder || '请描述...'}
          value={val.text || ''}
          onChange={e => onChange({ ...val, text: e.target.value })}
        />
      )}
    </div>
  );
}

function YesNoNumberInput({ config, value, onChange }) {
  const { unit = '分钟', placeholder = '' } = config || {};
  const val = value || { answer: null, number: 0 };

  return (
    <div>
      <YesNoInput value={val.answer} onChange={a => onChange({ ...val, answer: a })} />
      {val.answer === true && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            className="input-field text-center w-24"
            placeholder="0"
            min="0"
            value={val.number || ''}
            onChange={e => onChange({ ...val, number: parseInt(e.target.value) || 0 })}
          />
          <span className="text-textMuted text-sm">{unit}</span>
        </div>
      )}
    </div>
  );
}

function ChoiceInput({ config, value, onChange }) {
  const options = config?.options || [];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-2 rounded-lg border text-sm transition-all ${
            value === opt
              ? 'bg-gold/20 border-gold text-gold'
              : 'bg-surfaceHover border-border text-textMuted active:bg-border'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
