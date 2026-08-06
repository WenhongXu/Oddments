import { useState, useEffect } from 'react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

const DIM_COLORS = {
  BODY: '#e8a849', DIET: '#7ec8a4', MIND: '#a49ee8', CAREER: '#e87e7e',
  RELATION: '#e8c87e', FAMILY: '#7ec4e8', FINANCE: '#a8e87e', INNER: '#e87ec4',
};
const DIM_LABELS = {
  BODY: '身体', DIET: '饮食', MIND: '心理', CAREER: '职业',
  RELATION: '关系', FAMILY: '家庭', FINANCE: '财务', INNER: '内修',
};
const DIMENSIONS = Object.keys(DIM_LABELS);

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | create | detail
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('active'); // active | all

  useEffect(() => { loadProjects(); }, [tab]);

  async function loadProjects() {
    setLoading(true);
    try {
      const status = tab === 'active' ? 'active' : undefined;
      const data = await api.getProjects(status);
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin(projectId, note) {
    try {
      await api.checkinProject(projectId, note);
      loadProjects();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleCreateProject(data) {
    try {
      await api.createProject(data);
      setView('list');
      loadProjects();
    } catch (e) {
      if (e.code === 'ACTIVE_LIMIT_EXCEEDED') {
        alert(e.message);
      } else {
        alert('创建失败：' + e.message);
      }
    }
  }

  async function handleStatusChange(id, status, reason) {
    try {
      await api.updateProjectStatus(id, status, reason);
      setView('list');
      setSelected(null);
      loadProjects();
    } catch (e) {
      alert(e.message);
    }
  }

  if (view === 'create') {
    return (
      <CreateProjectForm
        onSubmit={handleCreateProject}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'detail' && selected) {
    return (
      <ProjectDetail
        project={selected}
        onBack={() => { setView('list'); setSelected(null); }}
        onCheckin={(note) => handleCheckin(selected.id, note)}
        onStatusChange={(status, reason) => handleStatusChange(selected.id, status, reason)}
      />
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-gold text-xl glow-text">成长项目</h1>
        <button
          className="btn-primary text-sm py-2 px-4"
          onClick={() => setView('create')}
        >
          + 新建
        </button>
      </div>

      {/* Tab */}
      <div className="flex bg-surface rounded-lg p-1 mb-4">
        <button
          className={`flex-1 py-1.5 rounded text-sm transition-all ${tab === 'active' ? 'bg-gold text-bg font-medium' : 'text-textMuted'}`}
          onClick={() => setTab('active')}
        >进行中</button>
        <button
          className={`flex-1 py-1.5 rounded text-sm transition-all ${tab === 'all' ? 'bg-gold text-bg font-medium' : 'text-textMuted'}`}
          onClick={() => setTab('all')}
        >全部</button>
      </div>

      {loading ? (
        <LoadingSpinner text="加载项目..." />
      ) : projects.length === 0 ? (
        <EmptyState tab={tab} onCreate={() => setView('create')} />
      ) : (
        <div>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onCheckin={() => handleCheckin(p.id, '')}
              onOpen={() => { setSelected(p); setView('detail'); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onCheckin, onOpen }) {
  const color = DIM_COLORS[project.dimension] || '#e8a849';
  const label = DIM_LABELS[project.dimension] || project.dimension;

  const progress = project.completion_criteria
    ? calcProgress(project)
    : null;

  const statusConfig = {
    active: { label: '进行中', cls: 'status-L' },
    completed: { label: '已完成', cls: 'status-Z' },
    abandoned: { label: '已放弃', cls: 'status-C' },
    expired: { label: '已过期', cls: 'status-C' },
  };

  const sc = statusConfig[project.status] || statusConfig.active;

  return (
    <div
      className="card mb-3 cursor-pointer active:bg-surfaceHover transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          <h3 className="font-medium text-text truncate">{project.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color }}>{label}</span>
            {project.status === 'active' && project.streak > 0 && (
              <span className="text-xs text-orange-400">🔥 {project.streak}天</span>
            )}
          </div>
        </div>
        <span className={`status-badge ${sc.cls} flex-shrink-0`}>{sc.label}</span>
      </div>

      {project.goal && (
        <p className="text-xs text-textMuted mb-2 line-clamp-2">{project.goal}</p>
      )}

      {progress !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-textMuted mb-1">
            <span>打卡 {project.totalCheckins} 次</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, progress)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      {/* Mini checkin calendar (last 7 days) */}
      <MiniCalendar checkins={project.recentCheckins} />

      {project.status === 'active' && (
        <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              project.checkedInToday
                ? 'bg-gold/20 border border-gold/40 text-gold cursor-default'
                : 'bg-gold text-bg active:opacity-80'
            }`}
            onClick={project.checkedInToday ? undefined : onCheckin}
            disabled={project.checkedInToday}
          >
            {project.checkedInToday ? '✓ 今日已打卡' : '打卡'}
          </button>
          <button
            className="py-2 px-3 rounded-lg text-textMuted bg-surfaceHover border border-border text-sm active:bg-border"
            onClick={onOpen}
          >
            详情
          </button>
        </div>
      )}
    </div>
  );
}

function MiniCalendar({ checkins }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const checkinSet = new Set(
    (checkins || []).filter(c => c.completed).map(c => c.date)
  );

  return (
    <div className="flex gap-1">
      {days.map(date => {
        const isToday = date === today.toISOString().split('T')[0];
        const done = checkinSet.has(date);
        return (
          <div
            key={date}
            className={`flex-1 h-1.5 rounded-sm transition-all ${
              done ? 'bg-gold' : isToday ? 'bg-border border border-gold/30' : 'bg-border'
            }`}
            title={date}
          />
        );
      })}
    </div>
  );
}

function calcProgress(project) {
  const match = project.completion_criteria?.match(/(\d+)/);
  if (!match) return 0;
  const target = parseInt(match[1]);
  return Math.min(100, (project.totalCheckins / target) * 100);
}

function EmptyState({ tab, onCreate }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🌱</div>
      <p className="text-textMuted mb-2">
        {tab === 'active' ? '暂无进行中的项目' : '还没有任何项目'}
      </p>
      <p className="text-textMuted text-xs mb-4">创建一个成长项目，开始打卡记录</p>
      <button className="btn-primary" onClick={onCreate}>创建第一个项目</button>
    </div>
  );
}

function CreateProjectForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    dimension: '',
    goal: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    completion_criteria: '',
    milestones: [],
  });
  const [submitting, setSubmitting] = useState(false);

  function update(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit() {
    if (!form.name || !form.dimension) {
      alert('请填写项目名称和所属维度');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-textMuted active:text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-serif text-gold text-xl">新建项目</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-textMuted block mb-1.5">项目名称 *</label>
          <input
            className="input-field"
            placeholder="例：晨跑30天"
            value={form.name}
            onChange={e => update('name', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-textMuted block mb-1.5">所属维度 *</label>
          <div className="grid grid-cols-4 gap-2">
            {DIMENSIONS.map(d => (
              <button
                key={d}
                onClick={() => update('dimension', d)}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  form.dimension === d
                    ? 'border-opacity-100 text-bg font-bold'
                    : 'border-border text-textMuted bg-surfaceHover active:bg-border'
                }`}
                style={form.dimension === d ? {
                  backgroundColor: DIM_COLORS[d],
                  borderColor: DIM_COLORS[d],
                } : {}}
              >
                {DIM_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-textMuted block mb-1.5">目标描述</label>
          <textarea
            className="input-field resize-none h-20 text-sm"
            placeholder="具体可衡量的目标描述..."
            value={form.goal}
            onChange={e => update('goal', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-textMuted block mb-1.5">开始日期</label>
            <input
              type="date"
              className="input-field text-sm"
              value={form.start_date}
              onChange={e => update('start_date', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-textMuted block mb-1.5">截止日期</label>
            <input
              type="date"
              className="input-field text-sm"
              value={form.end_date}
              onChange={e => update('end_date', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-textMuted block mb-1.5">完成标准</label>
          <input
            className="input-field text-sm"
            placeholder="例：累计打卡25天即为完成"
            value={form.completion_criteria}
            onChange={e => update('completion_criteria', e.target.value)}
          />
        </div>

        <button
          className="btn-primary w-full mt-2"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? '创建中...' : '创建项目'}
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onBack, onCheckin, onStatusChange }) {
  const [note, setNote] = useState('');
  const [showAbandon, setShowAbandon] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');
  const [calendar, setCalendar] = useState([]);

  const color = DIM_COLORS[project.dimension] || '#e8a849';
  const label = DIM_LABELS[project.dimension] || project.dimension;

  useEffect(() => {
    api.getProjectCalendar(project.id).then(setCalendar).catch(() => {});
  }, [project.id]);

  async function doCheckin() {
    await onCheckin(note);
    setNote('');
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-textMuted active:text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-gold text-lg truncate">{project.name}</h1>
          <span className="text-xs" style={{ color }}>{label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatBox label="累计打卡" value={project.totalCheckins} unit="次" color={color} />
        <StatBox label="当前连续" value={project.streak} unit="天" color="#f59e0b" />
        <StatBox label="剩余天数" value={calcDaysLeft(project)} unit="天" color="#60a5fa" />
      </div>

      {/* Progress bar */}
      {project.completion_criteria && (
        <div className="card mb-4">
          <div className="flex justify-between text-xs text-textMuted mb-2">
            <span>{project.completion_criteria}</span>
            <span>{Math.round(calcProgress2(project))}%</span>
          </div>
          <div className="h-2 bg-border rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, calcProgress2(project))}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      {/* Goal */}
      {project.goal && (
        <div className="card mb-4 border-l-2" style={{ borderColor: color }}>
          <p className="text-xs text-textMuted mb-1">目标</p>
          <p className="text-sm text-text">{project.goal}</p>
        </div>
      )}

      {/* Check-in calendar */}
      <div className="card mb-4">
        <h3 className="text-sm font-medium text-textMuted mb-3">打卡记录</h3>
        <FullCalendar calendar={calendar} color={color} startDate={project.start_date} />
      </div>

      {/* Check-in action */}
      {project.status === 'active' && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-textMuted mb-3">今日打卡</h3>
          <textarea
            className="input-field resize-none h-16 text-sm mb-3"
            placeholder="打卡备注（可选）..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button
            className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
              project.checkedInToday
                ? 'bg-gold/20 border border-gold/40 text-gold cursor-default'
                : 'bg-gold text-bg active:opacity-80'
            }`}
            onClick={project.checkedInToday ? undefined : doCheckin}
            disabled={project.checkedInToday}
          >
            {project.checkedInToday ? '✓ 今日已打卡' : '完成今日打卡'}
          </button>
        </div>
      )}

      {/* Actions */}
      {project.status === 'active' && (
        <div className="space-y-2">
          <button
            className="w-full py-3 rounded-lg border border-green-700/50 text-green-400 text-sm active:opacity-70"
            onClick={() => onStatusChange('completed')}
          >
            标记为已完成
          </button>
          <button
            className="w-full py-3 rounded-lg border border-red-900/50 text-red-400 text-sm active:opacity-70"
            onClick={() => setShowAbandon(true)}
          >
            放弃此项目
          </button>
        </div>
      )}

      {showAbandon && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={() => setShowAbandon(false)}>
          <div className="bg-surface rounded-t-2xl p-6 w-full max-w-[520px] mx-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-gold mb-3">放弃项目</h3>
            <p className="text-textMuted text-sm mb-3">记录放弃原因有助于未来的反思</p>
            <textarea
              className="input-field resize-none h-20 text-sm mb-3"
              placeholder="为什么放弃这个项目？"
              value={abandonReason}
              onChange={e => setAbandonReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowAbandon(false)}>取消</button>
              <button
                className="flex-1 py-3 rounded-lg bg-red-900/50 text-red-300 text-sm active:opacity-70"
                onClick={() => { setShowAbandon(false); onStatusChange('abandoned', abandonReason); }}
              >
                确认放弃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, unit, color }) {
  return (
    <div className="card text-center">
      <div className="text-xl font-bold" style={{ color }}>{value ?? '-'}</div>
      <div className="text-xs text-textMuted">{unit}</div>
      <div className="text-xs text-textMuted mt-0.5">{label}</div>
    </div>
  );
}

function calcDaysLeft(project) {
  if (!project.end_date) return '∞';
  const diff = Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function calcProgress2(project) {
  const match = project.completion_criteria?.match(/(\d+)/);
  if (!match) return 0;
  return Math.min(100, (project.totalCheckins / parseInt(match[1])) * 100);
}

function FullCalendar({ calendar, color, startDate }) {
  if (!startDate) return null;

  const checkinSet = new Set(calendar.filter(c => c.completed).map(c => c.date));

  const start = new Date(startDate);
  const today = new Date();
  const days = [];
  const current = new Date(start);

  while (current <= today && days.length < 42) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className="flex flex-wrap gap-1">
      {days.map(date => {
        const isToday = date === today.toISOString().split('T')[0];
        const done = checkinSet.has(date);
        return (
          <div
            key={date}
            className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs ${
              done ? 'text-bg' : isToday ? 'border border-gold/50 text-gold' : 'bg-border text-transparent'
            }`}
            style={done ? { backgroundColor: color } : {}}
            title={date}
          >
            {done ? '✓' : isToday ? '·' : ''}
          </div>
        );
      })}
    </div>
  );
}
