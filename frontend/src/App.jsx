import { useEffect, useState } from 'react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      try {
        const response = await fetch('/api/tasks', {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Failed to load tasks');
        }

        const data = await response.json();
        setTasks(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Не удалось загрузить задачи');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => controller.abort();
  }, []);

  async function addTask(event) {
    event.preventDefault();

    const newTitle = title.trim();

    if (!newTitle || saving) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();

      setTasks(prev => [newTask, ...prev]);
      setTitle('');
    } catch {
      setError('Не удалось добавить задачу');
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    setError('');

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed: !task.completed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setTasks(prev =>
        prev.map(item =>
          item.id === task.id
            ? { ...item, completed: !task.completed }
            : item
        )
      );
    } catch {
      setError('Не удалось обновить задачу');
    }
  }

  async function deleteTask(id) {
    setError('');

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(prev =>
        prev.filter(task => task.id !== id)
      );
    } catch {
      setError('Не удалось удалить задачу');
    }
  }

  const completed = tasks.filter(task => task.completed).length;
  const remaining = tasks.length - completed;

  return (
    <div className="page">
      <main className="app">
        <header className="header">
          <div className="logo">✓</div>
          <div>
            <h1>Task Tracker</h1>
            <p className="subtitle">
              Простой менеджер повседневных задач
            </p>
          </div>
        </header>

        <section className="stats">
          <div>
            <span className="stat-number">{tasks.length}</span>
            <span className="stat-label">Всего</span>
          </div>
          <div>
            <span className="stat-number">{remaining}</span>
            <span className="stat-label">Активных</span>
          </div>
          <div>
            <span className="stat-number">{completed}</span>
            <span className="stat-label">Выполнено</span>
          </div>
        </section>

        <form className="add-form" onSubmit={addTask}>
          <input
            type="text"
            placeholder="Что нужно сделать?"
            value={title}
            maxLength={160}
            onChange={event => setTitle(event.target.value)}
          />
          <button type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Добавление...' : '+ Добавить'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        <section className="tasks-section">
          <div className="section-heading">
            <h2>Мои задачи</h2>
            <span className="task-count">{tasks.length}</span>
          </div>

          {loading ? (
            <p className="empty">Загрузка задач...</p>
          ) : tasks.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">☑</span>
              <p>Задач пока нет</p>
              <small>Добавьте свою первую задачу выше</small>
            </div>
          ) : (
            <ul className="task-list">
              {tasks.map(task => (
                <li className="task" key={task.id}>
                  <label className="task-content">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                    />
                    <span className={task.completed ? 'done' : ''}>
                      {task.title}
                    </span>
                  </label>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Удалить задачу"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer>
          React + Flask + SQLite · Docker Compose
        </footer>
      </main>
    </div>
  );
}
