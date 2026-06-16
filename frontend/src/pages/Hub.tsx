import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import type { Task, TaskCreate, EisenhowerCategory } from '../types';

const categoryConfig = {
  urgent_important: {
    label: 'Do First',
    sublabel: 'Urgent & Important',
    accent: '#FF4D4D',
    glow: 'rgba(255,77,77,0.15)',
    border: 'rgba(255,77,77,0.3)',
    badge: '#FF4D4D',
    icon: '🔥',
    gradient: 'linear-gradient(135deg, rgba(255,77,77,0.08), rgba(255,77,77,0.02))',
  },
  urgent_not_important: {
    label: 'Delegate',
    sublabel: 'Urgent & Not Important',
    accent: '#FF9A3C',
    glow: 'rgba(255,154,60,0.15)',
    border: 'rgba(255,154,60,0.3)',
    badge: '#FF9A3C',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, rgba(255,154,60,0.08), rgba(255,154,60,0.02))',
  },
  not_urgent_important: {
    label: 'Schedule',
    sublabel: 'Not Urgent & Important',
    accent: '#4D9FFF',
    glow: 'rgba(77,159,255,0.15)',
    border: 'rgba(77,159,255,0.3)',
    badge: '#4D9FFF',
    icon: '📅',
    gradient: 'linear-gradient(135deg, rgba(77,159,255,0.08), rgba(77,159,255,0.02))',
  },
  not_urgent_not_important: {
    label: 'Eliminate',
    sublabel: 'Not Urgent & Not Important',
    accent: '#9B9BA4',
    glow: 'rgba(155,155,164,0.15)',
    border: 'rgba(155,155,164,0.25)',
    badge: '#9B9BA4',
    icon: '🗑️',
    gradient: 'linear-gradient(135deg, rgba(155,155,164,0.06), rgba(155,155,164,0.01))',
  },
};

const Hub: React.FC = () => {
  const [tasks, setTasks] = useState<{ [key in EisenhowerCategory]: Task[] }>({
    urgent_important: [],
    urgent_not_important: [],
    not_urgent_important: [],
    not_urgent_not_important: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newTask, setNewTask] = useState<TaskCreate>({
    title: '',
    description: '',
    category: 'urgent_important',
    priority: 1,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const allTasks = await tasksAPI.getAll();
      setTasks({
        urgent_important: allTasks.filter(t => t.category === 'urgent_important'),
        urgent_not_important: allTasks.filter(t => t.category === 'urgent_not_important'),
        not_urgent_important: allTasks.filter(t => t.category === 'not_urgent_important'),
        not_urgent_not_important: allTasks.filter(t => t.category === 'not_urgent_not_important'),
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tasksAPI.create(newTask);
      setNewTask({ title: '', description: '', category: 'urgent_important', priority: 1 });
      setShowAddForm(false);
      loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleComplete = async (taskId: number, completed: boolean) => {
    try {
      await tasksAPI.update(taskId, { completed: !completed });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (confirm('Delete this task?')) {
      try {
        await tasksAPI.delete(taskId);
        loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const totalTasks = Object.values(tasks).flat().length;
  const completedTasks = Object.values(tasks).flat().filter(t => t.completed).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .hub-root {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Inter', sans-serif;
          color: #0F172A;
          position: relative;
          overflow-x: hidden;
        }

        .hub-root::before {
          content: '';
          position: fixed;
          top: -30%;
          left: -20%;
          width: 60%;
          height: 60%;
          background: radial-gradient(ellipse, rgba(77,159,255,0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .hub-root::after {
          content: '';
          position: fixed;
          bottom: -20%;
          right: -10%;
          width: 50%;
          height: 50%;
          background: radial-gradient(ellipse, rgba(255,77,77,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .hub-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .hub-header {
          margin-bottom: 48px;
          opacity: 0;
          transform: translateY(-16px);
          animation: fadeUp 0.6s ease forwards;
        }

        .hub-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #4D9FFF;
          margin-bottom: 12px;
        }

        .hub-title {
          font-family: 'Inter', sans-serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #0F172A;
          margin: 0 0 12px;
        }

        .hub-subtitle {
          font-size: 15px;
          color: #475569;
          font-weight: 300;
          margin: 0;
        }

        .hub-stats {
          display: flex;
          gap: 24px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 13px;
          color: #64748B;
        }

        .stat-pill strong {
          color: #0F172A;
          font-weight: 600;
        }

        .stat-bar-wrap {
          flex: 1;
          min-width: 200px;
          max-width: 300px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 100px;
          padding: 6px 16px;
        }

        .stat-bar-track {
          flex: 1;
          height: 4px;
          background: #E2E8F0;
          border-radius: 2px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4D9FFF, #A855F7);
          border-radius: 2px;
          transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
        }

        .add-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #334155;
          padding: 12px 24px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 32px;
          backdrop-filter: blur(10px);
          opacity: 0;
          animation: fadeUp 0.6s 0.15s ease forwards;
        }

        .add-btn:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .add-btn.active {
          background: rgba(77,159,255,0.15);
          border-color: rgba(77,159,255,0.4);
          color: #4D9FFF;
        }

        .add-btn-icon {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #4D9FFF, #A855F7);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .form-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 40px;
          backdrop-filter: blur(20px);
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-title {
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-field.full { grid-column: 1 / -1; }

        .form-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #475569;
        }

        .form-input, .form-textarea, .form-select {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          color: #0F172A;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          padding: 10px 14px;
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
        }

        .form-input::placeholder, .form-textarea::placeholder {
          color: #94A3B8;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: rgba(77,159,255,0.5);
          background: rgba(77,159,255,0.05);
          box-shadow: 0 0 0 3px rgba(77,159,255,0.1);
        }

        .form-textarea { resize: vertical; min-height: 80px; }

        .form-select option { background: #FFFFFF; }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-submit {
          background: linear-gradient(135deg, #4D9FFF, #A855F7);
          border: none;
          color: white;
          padding: 10px 24px;
          border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(77,159,255,0.3);
        }

        .btn-cancel {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          padding: 10px 20px;
          border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: #E2E8F0;
          color: #0F172A;
        }

        .matrix-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .matrix-grid { grid-template-columns: 1fr; }
        }

        .quadrant {
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px solid #E2E8F0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px);
          transition: box-shadow 0.3s ease;
        }

        .quadrant:hover {
          box-shadow: var(--q-glow);
        }

        .quadrant.q0 { animation: fadeUp 0.5s 0.2s ease forwards; }
        .quadrant.q1 { animation: fadeUp 0.5s 0.3s ease forwards; }
        .quadrant.q2 { animation: fadeUp 0.5s 0.4s ease forwards; }
        .quadrant.q3 { animation: fadeUp 0.5s 0.5s ease forwards; }

        .quadrant-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid #E2E8F0;
          background: var(--q-gradient);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .quadrant-icon {
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .quadrant-titles {
          flex: 1;
        }

        .quadrant-label {
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.01em;
          display: block;
        }

        .quadrant-sublabel {
          font-size: 11px;
          color: #64748B;
          font-weight: 400;
          display: block;
          margin-top: 3px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .quadrant-count {
          font-family: 'Inter', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--q-accent);
          opacity: 0.8;
          line-height: 1;
          flex-shrink: 0;
        }

        .quadrant-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 120px;
        }

        .task-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.2s ease;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        .task-card:hover {
          background: #F8FAFC;
          border-color: rgba(255,255,255,0.1);
          transform: translateX(2px);
        }

        .task-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid #CBD5E1;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          transition: all 0.2s ease;
        }

        .task-checkbox:hover {
          border-color: var(--q-accent);
          background: #F8FAFC;
        }

        .task-checkbox.done {
          background: var(--q-accent);
          border-color: var(--q-accent);
        }

        .task-checkbox.done::after {
          content: '✓';
          font-size: 10px;
          color: white;
          font-weight: 700;
        }

        .task-content {
          flex: 1;
          min-width: 0;
        }

        .task-title {
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          line-height: 1.4;
          transition: all 0.2s ease;
        }

        .task-title.done {
          text-decoration: line-through;
          color: #94A3B8;
        }

        .task-desc {
          font-size: 12px;
          color: #64748B;
          margin-top: 4px;
          line-height: 1.4;
          font-weight: 300;
        }

        .task-delete {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          line-height: 1;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }

        .task-delete:hover { color: #FF4D4D; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          color: #94A3B8;
          font-size: 13px;
          text-align: center;
          font-weight: 300;
          gap: 8px;
        }

        .empty-state-icon {
          font-size: 24px;
          opacity: 0.3;
        }

        .loading-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #F8FAFC;
          gap: 16px;
        }

        .loader {
          width: 32px;
          height: 32px;
          border: 2px solid #E2E8F0;
          border-top-color: #4D9FFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .loading-text {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #94A3B8;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .accent-divider {
          width: 40px;
          height: 3px;
          background: linear-gradient(90deg, #4D9FFF, #A855F7);
          border-radius: 2px;
          margin: 12px 0;
        }

        .hub-root {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Inter', sans-serif;
          color: #0F172A;
          position: relative;
          overflow-x: hidden;
          transition: background-color 0.3s, color 0.3s;
        }

        .dark .hub-root {
          background: #0A0A0F;
          color: #E8E8F0;
        }

        .hub-title { color: #0F172A; }
        .dark .hub-title { color: #FFFFFF; }

        .stat-pill { background: #FFFFFF; border-color: #E2E8F0; color: #64748B; }
        .dark .stat-pill { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.07); color: #9B9BA4; }

        .stat-pill strong { color: #0F172A; }
        .dark .stat-pill strong { color: #E8E8F0; }

        .stat-bar-wrap { background: #FFFFFF; border-color: #E2E8F0; }
        .dark .stat-bar-wrap { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.07); }

        .stat-bar-track { background: #E2E8F0; }
        .dark .stat-bar-track { background: rgba(255,255,255,0.08); }

        .add-btn { background: #FFFFFF; border-color: #E2E8F0; color: #334155; }
        .dark .add-btn { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); color: #E8E8F0; }
        
        .add-btn:hover { background: #F8FAFC; border-color: #CBD5E1; }
        .dark .add-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }

        .add-btn.active { background: rgba(77,159,255,0.15); border-color: rgba(77,159,255,0.4); color: #4D9FFF; }
        
        .form-panel { background: #FFFFFF; border-color: #E2E8F0; }
        .dark .form-panel { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }

        .form-title { color: #0F172A; }
        .dark .form-title { color: #FFFFFF; }

        .form-label { color: #475569; }
        .dark .form-label { color: #6B6B7A; }

        .form-input, .form-textarea, .form-select { background: #FFFFFF; border-color: #E2E8F0; color: #0F172A; }
        .dark .form-input, .dark .form-textarea, .dark .form-select { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: #E8E8F0; }

        .form-input::placeholder, .form-textarea::placeholder { color: #94A3B8; }
        .dark .form-input::placeholder, .dark .form-textarea::placeholder { color: #3A3A45; }

        .form-select option { background: #FFFFFF; }
        .dark .form-select option { background: #1A1A25; }

        .btn-cancel { background: #F8FAFC; border-color: #E2E8F0; color: #475569; }
        .dark .btn-cancel { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); color: #6B6B7A; }

        .btn-cancel:hover { background: #E2E8F0; color: #0F172A; }
        .dark .btn-cancel:hover { background: rgba(255,255,255,0.08); color: #E8E8F0; }

        .quadrant { background: #FFFFFF; border-color: #E2E8F0; }
        .dark .quadrant { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.06); }

        .quadrant-header { border-bottom-color: #E2E8F0; }
        .dark .quadrant-header { border-bottom-color: rgba(255,255,255,0.05); }

        .quadrant-label { color: #0F172A; }
        .dark .quadrant-label { color: #FFFFFF; }

        .quadrant-sublabel { color: #64748B; }
        .dark .quadrant-sublabel { color: #5A5A6A; }

        .empty-state { color: #94A3B8; }
        .dark .empty-state { color: #2A2A35; }

        .task-card { background: #FFFFFF; border-color: #E2E8F0; }
        .dark .task-card { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06); }

        .task-card:hover { background: #F8FAFC; border-color: #CBD5E1; }
        .dark .task-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

        .task-checkbox { border-color: #CBD5E1; }
        .dark .task-checkbox { border-color: rgba(255,255,255,0.15); }

        .task-checkbox:hover { background: #F8FAFC; border-color: var(--q-accent); }
        .dark .task-checkbox:hover { background: rgba(255,255,255,0.05); }

        .task-title { color: #334155; }
        .dark .task-title { color: #D8D8E0; }

        .task-title.done { color: #94A3B8; }
        .dark .task-title.done { color: #3A3A4A; }

        .task-desc { color: #64748B; }
        .dark .task-desc { color: #4A4A5A; }

        .task-delete { color: #94A3B8; }
        .dark .task-delete { color: #3A3A4A; }

        .loading-wrap { background: #F8FAFC; }
        .dark .loading-wrap { background: #0A0A0F; }

        .loading-text { color: #64748B; }
        .dark .loading-text { color: #3A3A4A; }
        
        .loader { border-color: #E2E8F0; border-top-color: #4D9FFF; }
        .dark .loader { border-color: rgba(255,255,255,0.06); border-top-color: #4D9FFF; }
        
      `}</style>

      <div className="hub-root">
        {isLoading ? (
          <div className="loading-wrap">
            <div className="loader" />
            <p className="loading-text">Loading matrix</p>
          </div>
        ) : (
          <div className="hub-inner">
            {/* Header */}
            <div className="hub-header">
              <p className="hub-eyebrow">Eisenhower Matrix</p>
              <h1 className="hub-title">Productivity Hub</h1>
              <div className="accent-divider" />
              <p className="hub-subtitle">Organize, prioritize, and act with clarity</p>
              <div className="hub-stats">
                <div className="stat-pill">
                  <strong>{totalTasks}</strong> tasks total
                </div>
                <div className="stat-pill">
                  <strong>{completedTasks}</strong> completed
                </div>
                <div className="stat-bar-wrap">
                  <span style={{ fontSize: 12, color: '#5A5A6A', whiteSpace: 'nowrap' }}>
                    {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                  </span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Add Task Button */}
            <button
              className={`add-btn ${showAddForm ? 'active' : ''}`}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <div className="add-btn-icon">{showAddForm ? '−' : '+'}</div>
              {showAddForm ? 'Close form' : 'Add new task'}
            </button>

            {/* Add Task Form */}
            {showAddForm && (
              <div className="form-panel">
                <h3 className="form-title">New Task</h3>
                <form onSubmit={handleAddTask}>
                  <div className="form-grid">
                    <div className="form-field full">
                      <label className="form-label">Task Title</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="What needs to be done?"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-field full">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Add context or notes..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      />
                    </div>
                    <div className="form-field full">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value as EisenhowerCategory })}
                      >
                        {Object.entries(categoryConfig).map(([key, cfg]) => (
                          <option key={key} value={key}>
                            {cfg.icon} {cfg.label} — {cfg.sublabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-submit">Add Task</button>
                    <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Matrix Grid */}
            <div className="matrix-grid">
              {(Object.entries(categoryConfig) as [EisenhowerCategory, typeof categoryConfig[EisenhowerCategory]][]).map(
                ([category, cfg], i) => (
                  <div
                    key={category}
                    className={`quadrant q${i}`}
                    style={{
                      '--q-accent': cfg.accent,
                      '--q-glow': `0 0 40px ${cfg.glow}`,
                      '--q-gradient': cfg.gradient,
                      '--q-border': cfg.border,
                    } as React.CSSProperties}
                  >
                    <div className="quadrant-header">
                      <span className="quadrant-icon">{cfg.icon}</span>
                      <div className="quadrant-titles">
                        <span className="quadrant-label">{cfg.label}</span>
                        <span className="quadrant-sublabel">{cfg.sublabel}</span>
                      </div>
                      <span className="quadrant-count">{tasks[category].length}</span>
                    </div>

                    <div className="quadrant-body">
                      {tasks[category].length === 0 ? (
                        <div className="empty-state">
                          <span className="empty-state-icon">○</span>
                          <span>No tasks here</span>
                        </div>
                      ) : (
                        tasks[category].map((task) => (
                          <div key={task.id} className="task-card">
                            <div
                              className={`task-checkbox ${task.completed ? 'done' : ''}`}
                              onClick={() => handleToggleComplete(task.id, task.completed)}
                              style={{ '--q-accent': cfg.accent } as React.CSSProperties}
                            />
                            <div className="task-content">
                              <p className={`task-title ${task.completed ? 'done' : ''}`}>{task.title}</p>
                              {task.description && (
                                <p className="task-desc">{task.description}</p>
                              )}
                            </div>
                            <button
                              className="task-delete"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete task"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Hub;