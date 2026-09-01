// ============================================================
// ADD TASK FORM
// ============================================================
// This page lets the user add a new task (goal) to a project.
// Each task has a title and a "due" date (in days/weeks/months).
// ============================================================

import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'

// Turn a Date into "YYYY-MM-DD" text so we can save it as a string.
const toLocalDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Figure out a due date from a number plus a unit (days/weeks/months).
const getDueDateFromPeriod = (amount, unit) => {
  const safeAmount = Number(amount) || 0
  const nextDate = new Date()

  if (unit === 'days') {
    nextDate.setDate(nextDate.getDate() + safeAmount)
  }
  if (unit === 'weeks') {
    nextDate.setDate(nextDate.getDate() + safeAmount * 7)
  }
  if (unit === 'months') {
    nextDate.setMonth(nextDate.getMonth() + safeAmount)
  }

  return toLocalDateString(nextDate)
}

// The choices for the "Period" dropdown.
const DUE_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
]

// NewTaskForm receives: project (the open project), onBack, onProjectUpdate.
export default function NewTaskForm({ project, onBack, onProjectUpdate }) {
  // One state for each input on the form.
  const [title, setTitle] = useState('')
  const [checklistInput, setChecklistInput] = useState('')
  const [dueValue, setDueValue] = useState('7')
  const [dueUnit, setDueUnit] = useState('days')
  const [message, setMessage] = useState('')
  const [unitMenuOpen, setUnitMenuOpen] = useState(false)

  // Close the unit dropdown when the user clicks outside of it.
  // (event.target.closest(".due-dropdown") checks if the click
  //  happened INSIDE the dropdown. If it did not, we close it.)
  useEffect(() => {
    if (!unitMenuOpen) return

    const handleClickOutside = (event) => {
      if (!event.target.closest('.due-dropdown')) {
        setUnitMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [unitMenuOpen])

  // Called when the user picks a unit (Days / Weeks / Months).
  const handleUnitSelect = (unit) => {
    setDueUnit(unit)
    setUnitMenuOpen(false)
  }

  // The dropdown button shows the label of the current unit.
  const chosenUnit = DUE_UNITS.find((u) => u.value === dueUnit)
  const chosenUnitLabel = chosenUnit ? chosenUnit.label : 'Days'

  // Which CSS classes each dropdown button should get.
  const getChevronClass = () =>
    unitMenuOpen ? 'due-chevron due-chevron-open' : 'due-chevron'
  const getUnitItemClass = (unit) =>
    dueUnit === unit.value ? 'due-menu-item due-menu-item-active' : 'due-menu-item'

  // Runs when the user presses "Save task".
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!title.trim()) {
      setMessage('Please add a task title before saving.')
      return
    }

    // Split the checklist box (if filled) into one item per line.
    const checklist = checklistInput
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item !== '')

    const newTask = {
      id: String(Date.now()),
      title: title.trim(),
      checklist,
      dueValue: Number(dueValue) || 0,
      dueUnit,
      dueDate: getDueDateFromPeriod(dueValue, dueUnit),
      completed: false,
      createdAt: new Date().toISOString(),
    }

    // Start with the project's existing tasks (or an empty list).
    const currentTasks = Array.isArray(project.tasks) ? project.tasks : []
    const updatedTasks = [...currentTasks, newTask]
    const updatedProject = {
      ...project,
      tasks: updatedTasks,
    }

    try {
      // Save the new task list to Firebase.
      await updateDoc(doc(db, 'projects', project.id), {
        tasks: updatedTasks,
      })

      // Tell the parent (PassionProject) that the project changed.
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject)
      }

      // Clear the form and show a success message.
      setTitle('')
      setChecklistInput('')
      setDueValue('7')
      setDueUnit('days')
      setMessage('Task saved successfully.')

      // Go back to the project page.
      if (onBack) {
        onBack()
      }
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="new-project-page">
      <div className="new-project-card">
        <p className="page-tag">Add task</p>
        <h1>{project.title || 'New goal'}</h1>

        <button type="button" onClick={onBack} className="back-button">
          &larr; Back
        </button>

        <form onSubmit={handleSubmit} className="new-project-form">
          <label>
            Task Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Finish first draft"
            />
          </label>

          <div className="due-row">
            <label className="due-field">
              <span>Due in</span>
              <input
                type="number"
                min="1"
                value={dueValue}
                onChange={(event) => setDueValue(event.target.value)}
                className="due-number"
              />
            </label>

            <div className="due-field">
              <span>Period</span>
              <div className="due-dropdown">
                <button
                  type="button"
                  className="due-select"
                  onClick={() => setUnitMenuOpen(!unitMenuOpen)}
                >
                  <span>{chosenUnitLabel}</span>
                  <span className={getChevronClass()}>&#9662;</span>
                </button>

                {unitMenuOpen && (
                  <div className="due-menu">
                    {DUE_UNITS.map((unit) => (
                      <button
                        type="button"
                        key={unit.value}
                        className={getUnitItemClass(unit)}
                        onClick={() => handleUnitSelect(unit.value)}
                      >
                        {unit.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="save-button">
            Save task
          </button>
        </form>

        {message && <p className="form-message">{message}</p>}
      </div>
    </main>
  )
}
