import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { changePin, getToken, createUser } from '../api/auth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MyPage({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [confidence, setConfidence] = useState([]);
  const [randomEntry, setRandomEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); // home | confidence | admin | pin | adduser
  const [adminConfig, setAdminConfig] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getRandomConfidence(),
      api.getConfidence(20),
    ]).then(([statsData, random, conf]) => {
      setStats(statsData);
      setRandomEntry(random.log);
      setConfidence(conf.logs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view === 'admin' && !adminConfig) {
      api.getAdminConfig().then(setAdminConfig).catch(console.error);
    }
  }, [view]);

  if (loading) return <div className="page-container"><LoadingSpinner text="加载个人数据..." /></div>;

  if (view === 'confidence') {
    return (
      <ConfidenceLibrary
        confidence={confidence}
        onBack={() => setView('home')}
        onRefresh={() => api.getConfidence(50).then(d => setConfidence(d.logs))}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel
        config={adminConfig}
        onBack={() => setView('home')}
        onSave={async (data) => {
          await api.updateAdminConfig(data);
          setAdminConfig(prev => ({ ...prev, ...data }));
        }}
      />
    );
  }

  if (view === 'pin') {
    return <ChangePinPanel onBack={() => setView('home')} onSuccess={onLogout} />;
  }

  if (view === 'adduser') {
    return <AddUserPanel onBack={() => setView('home')} />;
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-gold text-xl glow-text">我的</h1>
        {user && (
          <div className="text-right">
            <p className="text-text text-sm font-medium">{user.name}</p>
            <p className="text-textMuted text-xs">@{user.username}</p>
          </div>
        )}
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon="📓"
          label="累计日记"
          value={stats?.journalCount || 0}
          unit="篇"
          sub={stats?.journalStreak ? `连续 ${stats.journalStreak} 天` : null}
        />
        <StatCard
          icon="🎯"
          label="成长项目"
          value={stats?.projectCount || 0}
          unit="个"
          sub={`打卡 ${stats?.checkinCount || 0} 次`}
        />
        <StatCard
          icon="⭐"
          label="自信证据"
          value={stats?.confidenceCount || 0}
          unit="条"
          sub="我做到了"
        />
        <div
          className="card flex flex-col items-center justify-center cursor-pointer active:bg-surfaceHover"
          onClick={() => setView('confidence')}
        >
          <span className="text-2xl mb-1">🌟</span>
          <span className="text-gold text-sm font-medium">自信证据库</span>
          <span className="text-textMuted text-xs mt-0.5">查看全部</span>
        </div>
      </div>

      {/* Today's random confidence entry */}
      {randomEntry && (
        <div className="card mb-4 border-l-2 border-gold/50 bg-gold/5">
          <p className="text-xs text-gold/70 mb-1">💫 来自你的证据库</p>
          <p className="text-sm text-text leading-relaxed">"{randomEntry.content}"</p>
          <p className="text-xs text-textMuted mt-2">{new Date(randomEntry.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      )}

      {/* Mood trend */}
      <MoodTrend />

      {/* Quick links */}
      <div className="space-y-2 mb-4">
        <MenuLink icon="⭐" title="自信证据库" sub="你做对的事情，都记录在这里" onClick={() => setView('confidence')} />
        <MenuLink icon="⚙️" title="顾问配置" sub="命理师指导原则与个性化设置" onClick={() => setView('admin')} />
        <MenuLink icon="🔑" title="修改PIN码" sub="更改你的登录密码" onClick={() => setView('pin')} />
        <MenuLink icon="👤" title="添加用户" sub="为家人朋友创建账户" onClick={() => setView('adduser')} />
      </div>

      {/* Logout */}
      <button
        className="w-full py-3 rounded-lg border border-red-900/40 text-red-400 text-sm active:opacity-70 mb-4"
        onClick={onLogout}
      >
        退出登录
      </button>

      {/* App info */}
      <div className="card text-center text-textMuted">
        <p className="text-xs">守明 · 个人生命管理系统</p>
        <p className="text-xs mt-0.5">V2.0 · 2026</p>
      </div>
    </div>
  );
}

function MenuLink({ icon, title, sub, onClick }) {
  return (
    <button
      className="card w-full flex items-center gap-3 text-left active:bg-surfaceHover"
      onClick={onClick}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="text-xs text-textMuted">{sub}</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-textMuted flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}

function StatCard({ icon, label, value, unit, sub }) {
  return (
    <div className="card">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gold">{value}</span>
        <span className="text-textMuted text-xs">{unit}</span>
      </div>
      <p className="text-xs text-textMuted mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text/50 mt-0.5">{sub}</p>}
    </div>
  );
}

function MoodTrend() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.getWeekMood().then(setData).catch(() => {});
  }, []);

  if (data.length === 0) return null;

  const recentData = data.slice(-7);

  return (
    <div className="card mb-4">
      <h3 className="section-title text-base mb-3">近期心情趋势</h3>
      <div className="flex items-end gap-1 h-16">
        {recentData.map((d, i) => {
          const mood = d.evening_mood || 0;
          const body = d.morning_body || 0;
          const pct = mood ? (mood / 5) * 100 : 0;
          const date = new Date(d.date);
          const label = date.toLocaleDateString('zh-CN', { weekday: 'narrow' });
          const color = pct < 40 ? '#ef4444' : pct < 60 ? '#eab308' : '#22c55e';

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '44px' }}>
                {mood > 0 ? (
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: color,
                      opacity: 0.8,
                      minHeight: '4px',
                    }}
                  />
                ) : (
                  <div className="w-full h-1 bg-border rounded-sm" />
                )}
              </div>
              <span className="text-textMuted text-[10px]">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-textMuted mt-2">晚间心情 (近7天)</p>
    </div>
  );
}

function ConfidenceLibrary({ confidence, onBack, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function addEntry() {
    if (!newEntry.trim()) return;
    setSubmitting(true);
    try {
      await api.addConfidence(newEntry.trim());
      setNewEntry('');
      setAdding(false);
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id) {
    if (!confirm('删除这条证据？')) return;
    await api.deleteConfidence(id);
    onRefresh();
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-textMuted active:text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="font-serif text-gold text-xl">自信证据库</h1>
        </div>
        <button className="btn-ghost text-sm py-1.5" onClick={() => setAdding(!adding)}>
          {adding ? '取消' : '+ 添加'}
        </button>
      </div>

      <p className="text-textMuted text-xs mb-4 leading-relaxed">
        每一条记录都是你能力的证明。日记中的反思回答会自动汇入这里。
      </p>

      {adding && (
        <div className="card mb-4 border border-gold/20 fade-in">
          <textarea
            className="input-field resize-none h-24 text-sm mb-3"
            placeholder="写下一件你做对的事，或者一个正确的判断..."
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
          />
          <button
            className="btn-primary w-full"
            onClick={addEntry}
            disabled={submitting || !newEntry.trim()}
          >
            {submitting ? '保存中...' : '保存到证据库'}
          </button>
        </div>
      )}

      {confidence.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🌟</div>
          <p className="text-textMuted mb-2">证据库还是空的</p>
          <p className="text-textMuted text-xs">完成日记中的反思问题后，答案会自动汇入这里</p>
        </div>
      ) : (
        <div className="space-y-2">
          {confidence.map(log => (
            <div key={log.id} className="card border-l-2 border-gold/30 group">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm text-text leading-relaxed">"{log.content}"</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-textMuted">
                      {new Date(log.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      log.source === 'manual' ? 'bg-blue-900/30 text-blue-300' : 'bg-gold/10 text-gold/70'
                    }`}>
                      {log.source === 'manual' ? '手动添加' : '日记'}
                    </span>
                  </div>
                </div>
                <button
                  className="text-textMuted/30 active:text-red-400 flex-shrink-0 mt-0.5"
                  onClick={() => deleteEntry(log.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPanel({ config, onBack, onSave }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setName(config.name || '守明');
      setNotes(config.config?.advisor_notes || '');
    }
  }, [config]);

  async function save() {
    setSaving(true);
    try {
      await onSave({ name, advisor_notes: notes });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-textMuted active:text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-serif text-gold text-xl">顾问配置</h1>
      </div>

      <div className="card mb-4 border border-amber-900/30 bg-amber-900/5">
        <p className="text-xs text-amber-400/80 leading-relaxed">
          ⚠️ 此页面为命理师配置区域。在这里设置的指导原则将融入AI教练的建议中，但不会向用户显示命理术语。
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-textMuted block mb-1.5">用户名称</label>
          <input
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="用户姓名"
          />
        </div>

        <div>
          <label className="text-sm text-textMuted block mb-1.5">顾问指导原则</label>
          <p className="text-xs text-textMuted/70 mb-2">
            基于命理分析的个性化指导，AI将据此调整建议方向。请使用现代语言描述，不要直接写命理术语。
          </p>
          <textarea
            className="input-field resize-none h-48 text-sm"
            placeholder={`示例：
• 此客户冬季情绪较脆弱，11-2月间需加强运动和社交建议
• 此客户在决策前需要更多独处时间来整合信息
• 建议在当前阶段聚焦深耕而非广泛拓展
• 此客户2027年需特别关注父亲健康和人际关系`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button
          className="btn-primary w-full"
          onClick={save}
          disabled={saving}
        >
          {saved ? '✓ 已保存' : saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}

function ChangePinPanel({ onBack, onSuccess }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (newPin.length < 4) { setError('新PIN码至少4位'); return; }
    if (newPin !== confirmPin) { setError('两次输入的PIN码不一致'); return; }
    setError('');
    setSaving(true);
    try {
      await changePin(currentPin, newPin, getToken());
      alert('PIN码已更新，请重新登录');
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-textMuted active:text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-serif text-gold text-xl">修改PIN码</h1>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-textMuted block mb-1.5">当前PIN码</label>
          <input type="password" inputMode="numeric" maxLength={6} className="input-field text-center tracking-widest text-xl" placeholder="••••" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <label className="text-sm text-textMuted block mb-1.5">新PIN码（至少4位）</label>
          <input type="password" inputMode="numeric" maxLength={6} className="input-field text-center tracking-widest text-xl" placeholder="••••" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <label className="text-sm text-textMuted block mb-1.5">确认新PIN码</label>
          <input type="password" inputMode="numeric" maxLength={6} className="input-field text-center tracking-widest text-xl" placeholder="••••" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg py-2 px-3 text-center">{error}</p>}
        <button className="btn-primary w-full" onClick={save} disabled={saving}>
          {saving ? '保存中...' : '确认修改'}
        </button>
      </div>
    </div>
  );
}

function AddUserPanel({ onBack }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit() {
    if (!name || !username || pin.length < 4) { setError('请填写完整信息'); return; }
    setError(''); setSaving(true);
    try {
      await createUser(name.trim(), username.trim(), pin, getToken());
      setSuccess(`用户 @${username} 已创建，PIN码：${pin}`);
      setName(''); setUsername(''); setPin('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-textMuted active:text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="font-serif text-gold text-xl">添加用户</h1>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-textMuted block mb-1.5">用户名字</label>
          <input className="input-field" placeholder="例：小明" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-textMuted block mb-1.5">登录用户名</label>
          <input className="input-field" placeholder="英文或拼音" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} />
        </div>
        <div>
          <label className="text-sm text-textMuted block mb-1.5">初始PIN码（4-6位）</label>
          <input type="password" inputMode="numeric" maxLength={6} className="input-field text-center tracking-widest text-xl" placeholder="••••" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg py-2 px-3 text-center">{error}</p>}
        {success && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-3">
            <p className="text-green-400 text-sm text-center">{success}</p>
            <p className="text-textMuted text-xs text-center mt-1">请将登录信息告知用户，建议首次登录后修改PIN码</p>
          </div>
        )}
        <button className="btn-primary w-full" onClick={submit} disabled={saving}>
          {saving ? '创建中...' : '创建用户'}
        </button>
      </div>
    </div>
  );
}
