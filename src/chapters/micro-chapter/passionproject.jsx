// ============================================================
// PASSION PROJECT DETAIL PAGE
// ============================================================
// This is the main "detail view" for a single passion project.
// It shows:
//   1. Project overview (title, category, description, goal)
//   2. Reflection note (a textarea to save thoughts)
//   3. SCORING PANEL - points, streaks, and progress
//   4. CALENDAR PANEL - tasks shown on a month calendar
//   5. Task list - with checkboxes and a delete button
// ============================================================

import { useEffect, useState } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import NewTaskForm from './newtaskform'
import Scoring from './scoring'
import Calendar from './calendar'

// One day in milliseconds (24 hours).
const DAY_MS = 24 * 60 * 60 * 1000

// How many days are left until a task's due date.
const getDaysRemaining = (dueDate, now) => {
  if (!dueDate) return null
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day) // start of the due day
  const today = new Date(now)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - todayStart) / DAY_MS)
}

// Builds a friendly text like "Due in 3 days" or "Overdue by 1 day".
const getCountdownLabel = (task, now) => {
  if (!task.dueDate) {
    return `Due in ${task.dueValue || 0} ${task.dueUnit || 'days'}`
  }

  const days = getDaysRemaining(task.dueDate, now)

  if (days < 0) {
    const overdue = Math.abs(days)
    return `Overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}`
  }
  if (days === 0) {
    return 'Due today'
  }
  if (days >= 30) {
    const months = Math.floor(days / 30)
    return `Due in ${months} ${months === 1 ? 'month' : 'months'}`
  }
  if (days >= 7) {
    const weeks = Math.floor(days / 7)
    return `Due in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  return `Due in ${days} ${days === 1 ? 'day' : 'days'}`
}

// PassionProject receives the selected project plus two functions.
export default function PassionProject({ project, onBack, onProjectUpdate }) {
  // State the page needs to remember:
  const [showTaskForm, setShowTaskForm] = useState(false)       // Show the add-task form?
  const [showDeleteModal, setShowDeleteModal] = useState(false) // Show delete confirmation?
  const [localProject, setLocalProject] = useState(project)     // The project, updated locally
  const [noteText, setNoteText] = useState(project.note || '')
  const [now, setNow] = useState(() => Date.now())

  // Update "now" every second so due dates count down live.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // localProject is always an object here, but these fallbacks keep
  // the page friendly even if a field is missing.
  const projectData = localProject || {}
  const projectTitle = projectData.title || 'Untitled passion project'
  const projectCategory = projectData.category || 'General'
  const projectDescription =
    projectData.description || 'Add a clear description to capture the vision behind this project.'
  const projectGoal = projectData.goal || 'Define your next meaningful milestone.'
  const projectTimeline = projectData.timeline || 'Flexible timeline'
  const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : []

  // Save the reflection note to Firebase.
  const addNote = async (noteContent) => {
    if (!localProject || !localProject.id) return
    try {
      const projectRef = doc(db, 'projects', localProject.id)
      await updateDoc(projectRef, { note: noteContent })

      const updatedProject = { ...localProject, note: noteContent }
      setLocalProject(updatedProject)
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject)
      }
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  // Remove a task from the project.
  const deleteTask = async (taskId) => {
    if (!localProject || !localProject.id) return

    const updatedTasks = tasks.filter((task) => task.id !== taskId)
    const updatedProject = { ...localProject, tasks: updatedTasks }
    setLocalProject(updatedProject)
    if (onProjectUpdate) {
      onProjectUpdate(updatedProject)
    }

    try {
      await updateDoc(doc(db, 'projects', localProject.id), {
        tasks: updatedTasks,
      })
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // Delete the whole project (called from the confirmation modal).
  const handleProjectDelete = async () => {
    if (!localProject || !localProject.id) return
    try {
      await deleteDoc(doc(db, 'projects', localProject.id))
      setShowDeleteModal(false)
      if (onProjectUpdate) {
        onProjectUpdate(null)
      }
      if (onBack) {
        onBack()
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  // Called after a new task is saved (by NewTaskForm).
  const handleTaskSaved = (updatedProject) => {
    setLocalProject(updatedProject)
    if (onProjectUpdate) {
      onProjectUpdate(updatedProject)
    }
    setShowTaskForm(false)
  }

  // Toggle a task between "done" and "not done".
  // We also save "completedAt" (the date it was finished) because
  // the Scoring panel uses those dates to calculate your streak.
  const toggleTaskCompletion = async (taskId) => {
    if (!localProject || !localProject.id) return

    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) return task // not the one we want - keep it

      const completed = !task.completed // flip true->false or false->true
      return {
        ...task,
        completed,
        // If we just finished it, store the time. If we un-finished
        // it, store null (no date).
        completedAt: completed ? new Date().toISOString() : null,
      }
    })

    const updatedProject = { ...localProject, tasks: updatedTasks }
    setLocalProject(updatedProject)
    if (onProjectUpdate) {
      onProjectUpdate(updatedProject)
    }

    try {
      await updateDoc(doc(db, 'projects', localProject.id), {
        tasks: updatedTasks,
      })
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  // CSS class for the due-date text (turns red when it's getting close).
  const getTaskDueClass = (task) => {
    const days = getDaysRemaining(task.dueDate, now)
    if (days !== null && days < 3) {
      return 'task-due task-due-urgent'
    }
    return 'task-due'
  }

  // Show the Add Task form if the user asked for it.
  if (showTaskForm) {
    return (
      <NewTaskForm
        project={localProject}
        onBack={() => setShowTaskForm(false)}
        onProjectUpdate={handleTaskSaved}
      />
    )
  }
  return (
    <main className="passion-project-page">
      <div className="passion-project-shell">
        <header className="passion-header">
          <div>
            <p className="page-tag">Passion Project</p>
            <h1>{projectTitle}</h1>
            <div className="passion-header-meta">
              <span>{projectCategory}</span>
              <span>{projectTimeline}</span>
            </div>
          </div>

          <div className="buttons-container">
            <button type="button" className="back-button" onClick={onBack}>
              &larr; Back
            </button>
            <button type="button" className="addtask-button" onClick={() => setShowTaskForm(true)}>
              + Add task/goal
            </button>
            <button type="button" className="delete-project-button" onClick={() => setShowDeleteModal(true)}>
              Delete project
            </button>
          </div>
        </header>

        <section className="content-grid">
          <article className="panel panel-wide">
            <h2>Project overview</h2>
            <p>{projectDescription}</p>
            <div className="goal-box">
              <h3>Main goal</h3>
              <p>{projectGoal}</p>
            </div>
          </article>

          <article className="panel panel-wide">
            <h2>Reflection</h2>
            <textarea
              className="project-note"
              placeholder="Write a quick note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button onClick={() => addNote(noteText)} className="save-note-button">
              Save Note
            </button>
          </article>
        </section>

        {/* SCORING & CALENDAR - we pass the tasks to both components. */}
        <section className="metrics-grid">
          <Scoring tasks={tasks} projectId={localProject.id} />
          <Calendar tasks={tasks} />
        </section>

        <section className="task-panel">
          <div className="section-heading">
            <h2>Goals & checklist</h2>
          </div>

          {tasks.length === 0 ? (
            <p className="empty-state">No tasks yet. Add your first goal.</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-card-top">
                    <label className="task-check">
                      <input
                        className="task-checkbox"
                        type="checkbox"
                        checked={Boolean(task.completed)}
                        onChange={() => toggleTaskCompletion(task.id)}
                      />
                      <span>{task.title}</span>
                    </label>
                    <button type="button" onClick={() => deleteTask(task.id)} className="delete-task-button">
                      Delete
                    </button>
                    <span className={getTaskDueClass(task)}>
                      {getCountdownLabel(task, now)}
                    </span>
                  </div>
                  {task.note && <p className="task-note">{task.note}</p>}
                  {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                    <ul className="checklist">
                      {task.checklist.map((item, index) => (
                        <li className="check-note" key={`${task.id}-${index}`}>
                          &check; {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ==============================
          DELETE CONFIRMATION MODAL
          ============================== */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">&#128465;</div>
            <h2 className="modal-title">Delete project?</h2>
            <p className="modal-message">
              Are you sure you want to delete <strong>{projectTitle}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button modal-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-button modal-confirm"
                onClick={handleProjectDelete}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
