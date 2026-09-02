// ============================================================
// NEW PROJECT FORM
// ============================================================
// This page lets the user create a new passion project. It
// collects a title, a category, a description, and a goal,
// then saves the project to Firebase (the database).
// ============================================================

import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase'

// The list of categories you can pick from in the dropdown.
const CATEGORY_OPTIONS = [
  'Learning', 'Animation', 'Art', 'Writing', 'Coding',
  'Music', 'Fitness', 'Photography', 'Design', 'Gaming',
  'Sustainability', 'Travel', 'Cooking', 'Podcasting',
  'Film', 'Robotics', 'Startups', 'Languages', 'Wellness',
  'Community',
]

// NewProject receives "onBack" (a function to return to Home) and "user" (the logged-in user).
export default function NewProject({ onBack, user }) {
  // One piece of state for each box on the form.
  // Keeping them separate is simpler to read than one big object.
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [timeline, setTimeline] = useState('')
  const [message, setMessage] = useState('')
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)

  // Keeps the title to 50 characters max.
  const handleTitleChange = (event) => {
    setTitle(event.target.value.slice(0, 50))
  }

  // Runs when the user presses "Save Project".
  const handleProject = async (event) => {
    event.preventDefault()

    // Make sure the title and category are filled in.
    if (!title.trim() || !category.trim()) {
      setMessage('Please add a project title and category.')
      return
    }

    // Add the new project to Firebase.
    try {
      await addDoc(collection(db, 'projects'), {
        // uid = the owner of this project (the logged-in user's uid).
        // home.jsx and firestore.rules use this field to only grant access
        // to the user who created the project.
        uid: user && user.uid ? user.uid : null,
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        goal: goal.trim(),
        timeline: timeline.trim(),
        createdAt: serverTimestamp(),
      })

      setMessage('Project saved successfully!')

      // Clear the form after saving.
      setTitle('')
      setCategory('')
      setDescription('')
      setGoal('')
      setTimeline('')

      // Go back to the home page.
      if (onBack) {
        await onBack()
      }
    } catch (error) {
      // Show a friendly message if Firebase blocks the save.
      if (error.code === 'permission-denied') {
        setMessage(
          'Permission denied: Firebase is blocking this write. ' +
            'Please make sure your Firestore Security Rules allow authenticated users to write ' +
            'to the "projects" collection (see firestore.rules in this project).'
        )
      } else {
        setMessage(error.message)
      }
    }
  }

  return (
    <main className="new-project-page">
      <div className="new-project-card">
        <p className="page-tag">New Project</p>
        <h1>Create your next passion project</h1>

        <p className="form-note">
          How it works: add a title, pick one of the 20 passion categories from the
          dropdown, then save your project. The category button is the menu itself -
          click it to open the list and choose your niche.
        </p>

        <button type="button" onClick={onBack} className="back-button">
          &larr; Back to Home
        </button>

        <form onSubmit={handleProject} className="new-project-form">
          <label>
            Project title
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              maxLength={50}
              placeholder="Ex: Morning Run Habit"
              required
            />
          </label>

          <label>
            Category
            <div className="category-picker">
              <button
                type="button"
                className={category ? 'category-toggle selected' : 'category-toggle'}
                onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
                aria-expanded={categoryMenuOpen}
              >
                <span>{category || 'Select a category'}</span>
                <span className="category-arrow">&#9660;</span>
              </button>

              {categoryMenuOpen && (
                <div className="category-menu">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="category-option"
                      onClick={() => {
                        setCategory(option)
                        setCategoryMenuOpen(false)
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project about?"
            />
          </label>

          <label>
            Goal
            <input
              type="text"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Ex: Build a 30-day writing streak"
            />
          </label>

          <button type="submit" className="save-button">
            Save Project
          </button>
        </form>

        {message && <p className="form-message">{message}</p>}
      </div>
    </main>
  )
}
