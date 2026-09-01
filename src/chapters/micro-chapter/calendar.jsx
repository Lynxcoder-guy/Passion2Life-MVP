// ============================================================
// CALENDAR MECHANICS - "When is everything due?"
// ============================================================
// This component shows a MONTH VIEW calendar with all your
// tasks placed on the day they are due. You can:
//   - Move between months with the arrow buttons
//   - Click any day to see the tasks due that day
//   - See today highlighted with a special border
//   - See how many tasks are pending vs completed per day
//
// HOW IT WORKS:
//   A calendar is a GRID of day cells:
//
//     Sun  Mon  Tue  Wed  Thu  Fri  Sat
//      1    2    3    4    5    6    7
//      8    9   10   11   12   13   14
//     ...
//
//   To build the grid we need:
//     1. How many days are in the month?
//     2. What day of the week does it start on?
//   Then we add empty cells before day 1 and one cell per day.
// ============================================================

import { useEffect, useState } from 'react'

// The 7 days of the week (getDay() returns 0-6, 0 = Sunday).
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The 12 months (getMonth() returns 0-11, 0 = January).
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ------------------------------------------------------------
// DATE HELPERS
// ------------------------------------------------------------

// Turn a Date into a "YYYY-MM-DD" string (used as a key).
const toLocalDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDateKey = (date) => toLocalDateString(date)

// How many days are in this month? Trick: day 0 of the NEXT month
// is the last day of the current month.
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()

// Which weekday does the month start on? (0 = Sunday ... 6 = Saturday)
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

// ------------------------------------------------------------
// THE CALENDAR COMPONENT
// ------------------------------------------------------------
// Receives "tasks" as a prop: an array of tasks with dueDates.
export default function Calendar({ tasks = [] }) {
  // STATE
  const [now, setNow] = useState(() => new Date())
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()))

  // Keep "now" up to date every 60 seconds so the "today"
  // highlight stays correct even if the app is left open.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // todayKey = today's date as a "YYYY-MM-DD" string.
  const todayKey = now ? getDateKey(now) : ''

  // ------------------------------------------------------------
  // GROUP TASKS BY DUE DATE
  // ------------------------------------------------------------
  // Use an object as a map:
  //   { "2026-08-09": [task, task], "2026-08-15": [task] }
  const tasksByDate = {}
  tasks.forEach((task) => {
    if (!task.dueDate) return
    if (!tasksByDate[task.dueDate]) {
      tasksByDate[task.dueDate] = []
    }
    tasksByDate[task.dueDate].push(task)
  })

  // ------------------------------------------------------------
  // BUILD THE CALENDAR GRID CELLS
  // ------------------------------------------------------------
  // Each cell is either:
  //   null     -> an empty padding cell (before the 1st)
  //   object   -> a real day cell with info about that day
  const daysInMonth = viewYear > 0 ? getDaysInMonth(viewYear, viewMonth) : 0
  const firstDay = viewYear > 0 ? getFirstDayOfMonth(viewYear, viewMonth) : 0
  const cells = []

  // STEP 1: Add empty cells before day 1 so it lines up correctly.
  for (let i = 0; i < firstDay; i++) {
    cells.push(null)
  }

  // STEP 2: Add one cell for each day of the month.
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day)
    const dateKey = getDateKey(date)
    const dayTasks = tasksByDate[dateKey] || []

    const isToday = dateKey === todayKey
    const isSelected = dateKey === selectedDate
    const isPast = todayKey ? date < new Date(todayKey) : false

    cells.push({
      day,
      dateKey,
      tasks: dayTasks,
      isToday,
      isSelected,
      isPast,
    })
  }

  // ------------------------------------------------------------
  // NAVIGATION HANDLERS - moving between months
  // ------------------------------------------------------------
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)            // December
      setViewYear((year) => year - 1) // previous year
    } else {
      setViewMonth((month) => month - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)             // January
      setViewYear((year) => year + 1) // next year
    } else {
      setViewMonth((month) => month + 1)
    }
  }

  // Jump back to today's month and select today.
  const goToToday = () => {
    const current = new Date()
    setViewYear(current.getFullYear())
    setViewMonth(current.getMonth())
    setSelectedDate(getDateKey(current))
  }

  // The tasks that appear in the details box under the calendar.
  const selectedTasks = tasksByDate[selectedDate] || []

  // Helper: the CSS class for a day cell, based on its flags.
  const getCellClass = (cell) => {
    let className = 'calendar-cell'
    if (cell.isToday) className += ' calendar-cell-today'
    if (cell.isSelected) className += ' calendar-cell-selected'
    if (cell.isPast) className += ' calendar-cell-past'
    return className
  }

  // Helper: the CSS class for a task row (completed gets a style).
  const getTaskItemClass = (task) =>
    task.completed
      ? 'calendar-task-item calendar-task-item-completed'
      : 'calendar-task-item'

  // ------------------------------------------------------------
  // RENDER THE CALENDAR UI
  // ------------------------------------------------------------
  return (
    <div className="calendar-panel">
      {/* HEADER with navigation buttons */}
      <div className="calendar-header">
        <h2>Calendar</h2>
        <div className="calendar-nav">
          <button type="button" onClick={goToPrevMonth} className="calendar-nav-button">
            &larr;
          </button>
          <span className="calendar-month-label">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button type="button" onClick={goToNextMonth} className="calendar-nav-button">
            &rarr;
          </button>
          <button type="button" onClick={goToToday} className="calendar-today-button">
            Today
          </button>
        </div>
      </div>

      {/* THE MONTH GRID */}
      <div className="calendar-grid">
        {/* First row: the day-of-week names */}
        {DAY_NAMES.map((dayName) => (
          <div key={dayName} className="calendar-day-name">
            {dayName}
          </div>
        ))}

        {/* Then: each cell (empty placeholder or a real day) */}
        {cells.map((cell, index) => {
          // null means an empty padding cell.
          if (cell === null) {
            return <div key={`empty-${index}`} className="calendar-cell calendar-cell-empty" />
          }

          // Count completed vs pending tasks for this day.
          const completedCount = cell.tasks.filter((task) => task.completed).length
          const pendingCount = cell.tasks.length - completedCount

          return (
            <div
              key={cell.dateKey}
              className={getCellClass(cell)}
              onClick={() => setSelectedDate(cell.dateKey)}
            >
              <span className="calendar-cell-day">{cell.day}</span>

              {/* Task badges - only show if there are tasks */}
              {cell.tasks.length > 0 && (
                <div className="calendar-cell-tasks">
                  {pendingCount > 0 && (
                    <span
                      className="calendar-task-dot calendar-task-dot-pending"
                      title={`${pendingCount} pending`}
                    >
                      {pendingCount}
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span
                      className="calendar-task-dot calendar-task-dot-completed"
                      title={`${completedCount} completed`}
                    >
                      &check;{completedCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* DETAILS BOX - shows the tasks for the selected day */}
      <div className="calendar-details">
        <h3>
          {selectedDate === todayKey
            ? "Today's tasks"
            : `Tasks for ${selectedDate}`}
        </h3>

        {selectedTasks.length === 0 ? (
          <p className="calendar-empty">No tasks on this day.</p>
        ) : (
          <ul className="calendar-task-list">
            {selectedTasks.map((task) => (
              <li key={task.id} className={getTaskItemClass(task)}>
                <span className="calendar-task-status">
                  {task.completed ? '\u2713' : '\u25CB'}
                </span>
                <span className="calendar-task-title">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
