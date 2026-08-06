import { useEffect, useMemo, useState } from 'react'
import './App.css'

const emptyDraft = {
  text: '',
  type: 'daily',
  completeByDate: '',
  completeByTime: '',
  dayOfWeek: '',
}

const filters = ['all', 'daily', 'weekly', 'one-time']
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getTimeValue(timeValue, fallback) {
  return timeValue || fallback
}

function formatDisplayDate(todo) {
  if (todo.type === 'daily') {
    return `Daily at ${getTimeValue(todo.completeByTime, '00:00')}`
  }

  if (todo.type === 'weekly') {
    const dayName = weekdayNames[Number(todo.dayOfWeek)] ?? 'selected day'
    return `Weekly on ${dayName}${todo.completeByTime ? ` at ${todo.completeByTime}` : ' at 00:00'}`
  }

  if (!todo.completeByDate) return 'No deadline'

  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const date = new Date(`${todo.completeByDate}T${getTimeValue(todo.completeByTime, '23:59')}`)
  return `${formatter.format(date)}${todo.completeByTime ? ` at ${todo.completeByTime}` : ''}`
}

function getNextReset(todo, referenceDate = new Date()) {
  const timeValue = getTimeValue(todo.completeByTime, todo.type === 'one-time' ? '23:59' : '00:00')
  const [hours, minutes] = timeValue.split(':').map(Number)
  const nextReset = new Date(referenceDate)
  nextReset.setSeconds(0, 0)

  if (todo.type === 'daily') {
    nextReset.setHours(hours, minutes, 0, 0)
    if (nextReset <= referenceDate) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    return nextReset
  }

  if (todo.type === 'weekly') {
    const targetDay = Number(todo.dayOfWeek)
    let dayOffset = targetDay - referenceDate.getDay()
    if (dayOffset < 0) dayOffset += 7

    nextReset.setDate(referenceDate.getDate() + dayOffset)
    nextReset.setHours(hours, minutes, 0, 0)

    if (nextReset <= referenceDate) {
      nextReset.setDate(nextReset.getDate() + 7)
    }

    return nextReset
  }

  return nextReset
}

function App() {
  const [todos, setTodos] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeView, setActiveView] = useState('tasks')

  useEffect(() => {
    const savedTodos = window.localStorage.getItem('todo-board-items')
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos))
      } catch {
        window.localStorage.removeItem('todo-board-items')
      }
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('todo-board-items', JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodos((currentTodos) =>
        currentTodos.map((todo) => {
          if (!todo.completed || (todo.type !== 'daily' && todo.type !== 'weekly')) {
            return todo
          }

          const completedAt = todo.completedAt ? new Date(todo.completedAt) : new Date(todo.createdAt)
          const nextReset = getNextReset(todo, completedAt)

          if (new Date() >= nextReset) {
            return { ...todo, completed: false, completedAt: null }
          }

          return todo
        })
      )
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [])

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => activeFilter === 'all' || todo.type === activeFilter)
  }, [activeFilter, todos])

  const addTodo = (event) => {
    event.preventDefault()

    const text = draft.text.trim()
    if (!text) return
    // if (draft.type === 'one-time' && !draft.completeByDate) return
    if (draft.type === 'weekly' && !draft.dayOfWeek) return

    const normalizedTime = draft.type === 'one-time'
      ? draft.completeByTime
      : draft.completeByTime || '00:00'

    const newTodo = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      text,
      type: draft.type,
      completeByDate: draft.type === 'one-time' ? draft.completeByDate : '',
      completeByTime: normalizedTime,
      dayOfWeek: draft.type === 'weekly' ? draft.dayOfWeek : '',
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
    }

    setTodos((currentTodos) => [newTodo, ...currentTodos])
    setDraft(emptyDraft)
    setActiveView('tasks')
  }

  const toggleCompletion = (todoId) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) => {
        if (todo.id !== todoId || (todo.type !== 'daily' && todo.type !== 'weekly')) {
          return todo
        }

        return {
          ...todo,
          completed: !todo.completed,
          completedAt: todo.completed ? null : new Date().toISOString(),
        }
      })
    )
  }

  const deleteTodo = (todoId) => {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== todoId))
  }

  return (
    <div className="app-shell">
      <div className="nav">
        {filters.map((filter) => {
          const label = filter === 'all'
            ? 'All tasks'
            : filter === 'one-time'
              ? 'One-time'
              : filter[0].toUpperCase() + filter.slice(1)

          return (
            <button
              key={filter}
              className={activeView === 'tasks' && activeFilter === filter ? 'nav-button active' : 'nav-button'}
              onClick={() => {
                setActiveFilter(filter)
                setActiveView('tasks')
              }}
              type="button"
            >
              {label}
            </button>
          )
        })}

        <button
          className={activeView === 'add' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('add')}
          type="button"
        >
          Add task
        </button>
      </div>

      {activeView === 'add' ? (
        <form className="todo-input-container" onSubmit={addTodo}>
          <input
            id="todo-input"
            type="text"
            placeholder="Add a task"
            value={draft.text}
            onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
          />

          <label className="field" htmlFor="task-type">
            <span>Task type</span>
            <select
              id="task-type"
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value, dayOfWeek: '' }))}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="one-time">One-time</option>
            </select>
          </label>

          {draft.type === 'weekly' && (
            <label className="field" htmlFor="day-of-week">
              <span>Day of week</span>
              <select
                id="day-of-week"
                value={draft.dayOfWeek}
                onChange={(event) => setDraft((current) => ({ ...current, dayOfWeek: event.target.value }))}
              >
                <option value="">Choose a day</option>
                {weekdayNames.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </label>
          )}

          {draft.type === 'one-time' && (
            <label className="field" htmlFor="complete-by-date">
              <span>Complete by date</span>
              <input
                id="complete-by-date"
                type="date"
                value={draft.completeByDate}
                onChange={(event) => setDraft((current) => ({ ...current, completeByDate: event.target.value }))}
              />
            </label>
          )}

          <label className="field" htmlFor="complete-by-time">
            <span>{draft.type === 'one-time' ? 'Time (optional)' : 'Time (optional)'}</span>
            <input
              id="complete-by-time"
              type="time"
              value={draft.completeByTime}
              onChange={(event) => setDraft((current) => ({ ...current, completeByTime: event.target.value }))}
            />
          </label>

          <button type="submit">Add Task</button>
        </form>
      ) : (
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <p className="empty-state">No tasks match this view yet.</p>
          ) : (
            filteredTodos.map((todo) => (
              <div className={`todo-item ${todo.completed ? 'completed' : ''}`} key={todo.id}>
                <div className="todo-main">
                  <div>
                    <p className="todo-text">{todo.text}</p>
                    <p className="todo-meta">
                      <span>{todo.type === 'one-time' ? 'One-time' : todo.type[0].toUpperCase() + todo.type.slice(1)}</span>
                      <span>• {formatDisplayDate(todo)}</span>
                    </p>
                  </div>

                  <div className="todo-actions">
                    {(todo.type === 'daily' || todo.type === 'weekly') && (
                      <button type="button" onClick={() => toggleCompletion(todo.id)}>
                        {todo.completed ? 'Mark incomplete' : 'Mark done'}
                      </button>
                    )}
                    <button className="delete-button" type="button" onClick={() => deleteTodo(todo.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default App
