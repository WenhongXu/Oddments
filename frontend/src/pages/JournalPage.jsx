import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import QuestionInput from '../components/QuestionInput';
import LoadingSpinner from '../components/LoadingSpinner';

const TODAY = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

export default function JournalPage() {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState('morning'); // morning | projects | evening | rotating | done
  const [fixedData, setFixedData] = useState({});
  const [rotatingData, setRotatingData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTemplate();
  }, []);

  async function loadTemplate() {
    try {
      const data = await api.getTodayJournal();
      setTemplate(data);

      if (data.alreadyFilled && data.existing) {
        setFixedData(data.existing.fixed_data);
        setRotatingData(data.existing.rotating_data);
        setSaved(true);
        setStep('done');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.saveJournal(today, { fixed_data: fixedData, rotating_data: rotatingData });
      setSaved(true);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateFixed(key, val) {
    setFixedData(prev => ({ ...prev, [key]: val }));
  }

  function updateRotating(qid, val) {
    setRotatingData(prev => ({ ...prev, [qid]: val }));
  }

  if (loading) return (
    <div className="page-container">
      <LoadingSpinner text="加载今日日记..." />
    </div>
  );

  if (error) return (
    <div className="page-container">
      <div className="card text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button className="btn-primary" onClick={loadTemplate}>重试</button>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-gold text-2xl glow-text">守明</h1>
        <p className="text-textMuted text-sm mt-1">{TODAY}</p>
      </div>

      {step === 'done' ? (
        <DoneView
          fixedData={fixedData}
          template={template}
          onEdit={() => setStep('morning')}
          saved={saved}
        />
      ) : (
        <>
          {/* Step progress */}
          <StepProgress step={step} />

          {step === 'morning' && (
            <MorningSection
              data={fixedData}
              onChange={updateFixed}
              onNext={() => setStep(template?.projects?.length ? 'projects' : 'rotating')}
            />
          )}

          {step === 'projects' && template?.projects && (
            <ProjectsSection
              projects={template.projects}
              data={fixedData}
              onChange={updateFixed}
              onNext={() => setStep('evening')}
              onBack={() => setStep('morning')}
            />
          )}

          {step === 'evening' && (
            <EveningSection
              data={fixedData}
              onChange={updateFixed}
              onNext={() => setStep('rotating')}
              onBack={() => setStep(template?.projects?.length ? 'projects' : 'morning')}
            />
          )}

          {step === 'rotating' && (
            <RotatingSection
              questions={template?.rotatingQuestions || []}
              data={rotatingData}
              onChange={updateRotating}
              onSave={handleSave}
              saving={saving}
              onBack={() => setStep('evening')}
            />
          )}
        </>
      )}
    </div>
  );
}

function StepProgress({ step }) {
  const steps = ['morning', 'evening', 'rotating'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="flex gap-1.5 mb-6">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all ${
            i <= currentIdx ? 'bg-gold' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

function MorningSection({ data, onChange, onNext }) {
  const canProceed = data.morning_body && data.morning_sleep;

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🌅</span>
        <h2 className="section-title">晨间快照</h2>
      </div>

      <div className="card mb-3">
        <p className="text-sm text-text mb-3">今早身体感受如何？</p>
        <ScaleRow
          value={data.morning_body}
          onChange={v => onChange('morning_body', v)}
          icons={['😩', '😔', '😐', '😊', '✨']}
        />
      </div>

      <div className="card mb-3">
        <p className="text-sm text-text mb-3">昨晚睡眠质量？</p>
        <ScaleRow
          value={data.morning_sleep}
          onChange={v => onChange('morning_sleep', v)}
          icons={['😫', '😟', '😶', '😌', '😴']}
        />
      </div>

      <div className="card mb-6">
        <p className="text-sm text-text mb-3">今天的一句话意图设定</p>
        <input
          type="text"
          className="input-field text-sm"
          placeholder="今天我打算..."
          value={data.intention || ''}
          onChange={e => onChange('intention', e.target.value)}
        />
      </div>

      <button
        className="btn-primary w-full"
        onClick={onNext}
        disabled={!canProceed}
        style={{ opacity: canProceed ? 1 : 0.5 }}
      >
        继续 →
      </button>
    </div>
  );
}

function ProjectsSection({ projects, data, onChange, onNext, onBack }) {
  const checkins = data.project_checkins || {};

  function toggleCheckin(id) {
    onChange('project_checkins', { ...checkins, [id]: !checkins[id] });
  }

  const DIM_COLORS = {
    BODY: '#e8a849', DIET: '#7ec8a4', MIND: '#a49ee8', CAREER: '#e87e7e',
    RELATION: '#e8c87e', FAMILY: '#7ec4e8', FINANCE: '#a8e87e', INNER: '#e87ec4',
  };
  const DIM_LABELS = {
    BODY: '身体', DIET: '饮食', MIND: '心理', CAREER: '职业',
    RELATION: '关系', FAMILY: '家庭', FINANCE: '财务', INNER: '内修',
  };

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✅</span>
        <h2 className="section-title">项目打卡</h2>
      </div>

      {projects.map(p => (
        <div
          key={p.id}
          onClick={() => toggleCheckin(p.id)}
          className={`card mb-3 flex items-center gap-3 cursor-pointer transition-all ${
            checkins[p.id] ? 'border border-gold/40 bg-gold/5' : ''
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              checkins[p.id] ? 'bg-gold border-gold' : 'border-border'
            }`}
          >
            {checkins[p.id] && <span className="text-bg text-xs font-bold">✓</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{p.name}</p>
            <span className="text-xs" style={{ color: DIM_COLORS[p.dimension] || '#e8a849' }}>
              {DIM_LABELS[p.dimension] || p.dimension}
            </span>
          </div>
        </div>
      ))}

      <div className="flex gap-3 mt-4">
        <button className="btn-secondary flex-1" onClick={onBack}>← 返回</button>
        <button className="btn-primary flex-1" onClick={onNext}>继续 →</button>
      </div>
    </div>
  );
}

function EveningSection({ data, onChange, onNext, onBack }) {
  const canProceed = data.evening_mood;

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🌙</span>
        <h2 className="section-title">晚间回顾</h2>
      </div>

      <div className="card mb-3">
        <p className="text-sm text-text mb-3">今天的整体心情？</p>
        <ScaleRow
          value={data.evening_mood}
          onChange={v => onChange('evening_mood', v)}
          icons={['😢', '😞', '😐', '🙂', '😄']}
        />
      </div>

      <div className="card mb-3">
        <p className="text-sm text-text mb-3">今天发生了一件好事</p>
        <input
          type="text"
          className="input-field text-sm"
          placeholder="哪怕很小的事也算..."
          value={data.good_thing || ''}
          onChange={e => onChange('good_thing', e.target.value)}
        />
      </div>

      <div className="card mb-6">
        <p className="text-sm text-text mb-3">自由记录（可选）</p>
        <textarea
          className="input-field resize-none h-24 text-sm"
          placeholder="今天有什么想记下来的..."
          value={data.free_note || ''}
          onChange={e => onChange('free_note', e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>← 返回</button>
        <button
          className="btn-primary flex-1"
          onClick={onNext}
          disabled={!canProceed}
          style={{ opacity: canProceed ? 1 : 0.5 }}
        >
          继续 →
        </button>
      </div>
    </div>
  );
}

function RotatingSection({ questions, data, onChange, onSave, saving, onBack }) {
  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔄</span>
        <h2 className="section-title">今日探索</h2>
      </div>
      <p className="text-textMuted text-xs mb-4">每天2-3个不同的维度问题，保持新鲜感</p>

      {questions.length === 0 ? (
        <div className="card text-center text-textMuted text-sm py-4">暂无轮转问题</div>
      ) : (
        questions.map(q => (
          <QuestionInput
            key={q.id}
            question={q}
            value={data[q.id]}
            onChange={val => onChange(q.id, val)}
          />
        ))
      )}

      <div className="flex gap-3 mt-4">
        <button className="btn-secondary flex-1" onClick={onBack} disabled={saving}>← 返回</button>
        <button className="btn-primary flex-1" onClick={onSave} disabled={saving}>
          {saving ? '保存中...' : '完成记录 ✓'}
        </button>
      </div>
    </div>
  );
}

function DoneView({ fixedData, template, onEdit, saved }) {
  return (
    <div className="fade-in">
      {saved && (
        <div className="card mb-4 text-center border border-gold/30 bg-gold/5">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-gold font-medium">今日记录完成</p>
          <p className="text-textMuted text-xs mt-1">坚持记录是改变的开始</p>
        </div>
      )}

      {/* Today's summary */}
      <div className="card mb-3">
        <h3 className="section-title text-base mb-3">今日快照</h3>
        <div className="grid grid-cols-2 gap-3">
          <Snapshot icon="🌅" label="身体" value={fixedData.morning_body} max={5} />
          <Snapshot icon="💤" label="睡眠" value={fixedData.morning_sleep} max={5} />
          <Snapshot icon="🌙" label="心情" value={fixedData.evening_mood} max={5} />
          {fixedData.intention && (
            <div className="col-span-2 bg-surfaceHover rounded-lg p-3">
              <p className="text-xs text-textMuted mb-1">今日意图</p>
              <p className="text-sm text-text">{fixedData.intention}</p>
            </div>
          )}
        </div>
      </div>

      {fixedData.good_thing && (
        <div className="card mb-3 border-l-2 border-gold/50">
          <p className="text-xs text-textMuted mb-1">今日好事</p>
          <p className="text-sm text-text">{fixedData.good_thing}</p>
        </div>
      )}

      {fixedData.free_note && (
        <div className="card mb-3">
          <p className="text-xs text-textMuted mb-1">自由记录</p>
          <p className="text-sm text-text leading-relaxed">{fixedData.free_note}</p>
        </div>
      )}

      <button className="btn-ghost w-full text-center mt-2" onClick={onEdit}>
        修改记录
      </button>
    </div>
  );
}

function Snapshot({ icon, label, value, max }) {
  if (!value) return null;
  const pct = ((value - 1) / (max - 1)) * 100;
  const color = pct < 40 ? '#ef4444' : pct < 60 ? '#eab308' : '#22c55e';

  return (
    <div className="bg-surfaceHover rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-textMuted">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color }}>{value}</span>
        <span className="text-textMuted text-xs">/ {max}</span>
      </div>
      <div className="h-1 bg-border rounded-full mt-1.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ScaleRow({ value, onChange, icons }) {
  return (
    <div className="flex justify-between gap-2">
      {icons.map((icon, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 py-3 rounded-lg border text-xl transition-all ${
              value === v
                ? 'border-gold bg-gold/10 scale-105'
                : 'border-border bg-surfaceHover active:scale-95'
            }`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
