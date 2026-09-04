// ============================================================
// SCORING MECHANICS - "How many points am I getting?"
// ============================================================
// This panel shows how well you are doing. Every task you
// complete earns points, and a daily streak earns bonus points.
//
// HOW SCORING WORKS:
//   1. BASE POINTS - 10 points for EVERY task you complete.
//   2. STREAK BONUS - 5 EXTRA points for every day in a row
//      that you complete at least one task.
//   3. TOTAL SCORE = Base Points + Streak Bonus
//
// The score is saved to Firebase, so points stay even if a
// task is later deleted. Deleting a task does NOT remove its
// earned points.
// ============================================================

import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore'
import { db } from '../../../firebase'

// ------------------------------------------------------------
// SCORING CONSTANTS - the "rules of the game"
// ------------------------------------------------------------
const POINTS_PER_TASK = 15  // Base XP for completing one task
const BONUS_STREAK = 5      // EXTRA XP per day in your streak
const UNDO_POINTS = 15      // Points removed by "Undo Scores"
const MIN_SCORE = 0         // Lowest allowed score (cannot go below 0)

// ------------------------------------------------------------
// DATE HELPER FUNCTIONS
// ------------------------------------------------------------

// Turn a Date into "YYYY-MM-DD" text so it can be saved as a string.
const toLocalDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDateKey = (date) => toLocalDateString(date)

// ------------------------------------------------------------
// STREAK CALCULATION
// ------------------------------------------------------------
// Walk BACKWARDS from today, counting consecutive days that
// appear in the completedDates list.
const getStreak = (completedDates) => {
  const dateSet = new Set(completedDates || [])
  let streak = 0
  const today = new Date()
  const cursor = new Date(today)

  // Count today, then each day before it.
  while (dateSet.has(getDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // If today has no completions yet, give credit for up to yesterday.
  if (streak === 0) {
    cursor.setDate(today.getDate() - 1)
    while (dateSet.has(getDateKey(cursor))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return streak
}

// ------------------------------------------------------------
// THE SCORING COMPONENT
// ------------------------------------------------------------
// Receives "tasks" (current tasks) and "projectId" (the Firebase
// document id used to read and save the persistent score).
export default function Scoring({ tasks = [], projectId, onPointsEarned }) {
  // STATE
  const [now, setNow] = useState(() => Date.now())          // current time (for due/overdue)
  const [undoMessage, setUndoMessage] = useState('')        // confirmation after undo
  const [subtractAmount, setSubtractAmount] = useState('')  // points the user wants to remove
  const [completedCountTask, setCompletedCountTask] = useState(0)

  // scoreState = the persistent score saved in Firebase.
  // It keeps points even if a task is deleted later.
  const [scoreState, setScoreState] = useState({
    points: 0,          // total accumulated points
    completedCount: 0,  // total completed (including deleted)
    completedDates: [], // list of "YYYY-MM-DD" completion dates
    trackedTaskIds: [], // ids of tasks already counted
  })

  const [universalPoints] = useState(1) // kept for display compat; real sync lives in home.jsx

  // isLoaded = true once we have loaded the score from Firebase.
  const [isLoaded, setIsLoaded] = useState(false)

  // Load the persistent completed count from the project's "score" field.
  const completedTaskCountBegin = async () => {
    try {
      const projectRef = doc(db, 'projects', projectId)
      const docSnap = await getDoc(projectRef)
      if (docSnap.exists() && docSnap.data().score) {
        const saved = docSnap.data().score
        setCompletedCountTask(saved.completedCount || 0)
      }
    } catch (error) {
      console.error('Failed to load completed count:', error)
    }
  }

  // Update "now" every 60 seconds.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  // EFFECT 1: Load the persistent score from Firebase on mount.
  useEffect(() => {
    if (!projectId) return

    const loadScore = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId)
        const docSnap = await getDoc(projectRef)

        if (docSnap.exists() && docSnap.data().score) {
          const saved = docSnap.data().score
          setScoreState({
            points: Math.max(MIN_SCORE, saved.points || 0),
            completedCount: saved.completedCount || 0,
            completedDates: saved.completedDates || [],
            trackedTaskIds: saved.trackedTaskIds || [],
          })
        }
      } catch (error) {
        console.error('Failed to load score:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadScore()
  }, [projectId])

  // Load the persistent completed count on mount.
  useEffect(() => {
    if (!projectId) return
    completedTaskCountBegin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ------------------------------------------------------------
  // EFFECT 2: DETECT NEWLY COMPLETED TASKS AND SAVE POINTS
  // ------------------------------------------------------------
  // When a task is marked complete, its points are added to the
  // saved score. We keep a list of "trackedTaskIds" (inside
  // scoreState) so each task is only counted ONCE.
  //
  // We read the tracked ids straight from scoreState (no ref),
  // and we include scoreState in the dependency list so the
  // effect re-checks after saving. That prevents double-counting.
  useEffect(() => {
    if (!projectId || !isLoaded) return

    const trackedIds = scoreState.trackedTaskIds

    // Find completed tasks whose id is NOT in our tracked list.
    const newlyCompleted = tasks.filter(
      (task) => task.completed && !trackedIds.includes(task.id),
    )

    // Nothing new to count.
    if (newlyCompleted.length === 0) return

    const todayStr = toLocalDateString(new Date())

    // Use each task's own completion date if it has one, else today.
    const newDates = newlyCompleted.map((task) => {
      if (task.completedAt) return task.completedAt.split('T')[0]
      return todayStr
    })

    const newTracked = [...trackedIds, ...newlyCompleted.map((task) => task.id)]

    const updatedScore = {
      points: Math.max(MIN_SCORE, scoreState.points + newlyCompleted.length * POINTS_PER_TASK),
      completedCount: scoreState.completedCount + newlyCompleted.length,
      completedDates: [...scoreState.completedDates, ...newDates],
      trackedTaskIds: newTracked,
    }

    // Update local state right away.
    setScoreState(updatedScore)

    // Persist the score to the project doc (survives refresh/delete).
    updateDoc(doc(db, 'projects', projectId), { score: updatedScore }).catch((error) => {
      console.error('Failed to save score:', error)
    })

    // Push the newly earned points UP to the dashboard, which adds
    // them to the user's devices/{uid}.points in Firebase.
    const earned = newlyCompleted.length * POINTS_PER_TASK
    if (onPointsEarned) onPointsEarned(earned)
  })

 

  // ------------------------------------------------------------
  // UNDO SCORES: remove 15 points (down to 0) and save.
  // ------------------------------------------------------------
  const handleUndo = () => {
    const newPoints = Math.max(MIN_SCORE, scoreState.points - UNDO_POINTS)
    const updatedScore = {
      ...scoreState,
      points: newPoints,
    }

    setScoreState(updatedScore)

    updateDoc(doc(db, 'projects', projectId), { score: updatedScore }).catch((error) => {
      console.error('Failed to save reverted score:', error)
    })

    setUndoMessage(`Score reverted! Removed ${UNDO_POINTS} points. New score: ${newPoints} pts`)
  }

  // ------------------------------------------------------------
  // SUBTRACT SPECIFIC POINTS: type a number and remove that many.
  // ------------------------------------------------------------
  const handleSubtractPoints = () => {
    const amount = Number(subtractAmount)

    // Validate: must be a positive number.
    if (!amount || amount <= 0) {
      setUndoMessage('Enter a positive number of points to remove.')
      return
    }

    // Don't let the score go below 0.
    const newPoints = Math.max(MIN_SCORE, scoreState.points - amount)
    const updatedScore = {
      ...scoreState,
      points: newPoints,
    }

    setScoreState(updatedScore)

    updateDoc(doc(db, 'projects', projectId), { score: updatedScore }).catch((error) => {
      console.error('Failed to save subtracted score:', error)
    })

    setUndoMessage(`Removed ${amount} points. New score: ${newPoints} pts`)
    setSubtractAmount('')
  }

  // ------------------------------------------------------------
  // LIVE STATS (from the CURRENT tasks)
  // ------------------------------------------------------------
  const totalTasks = tasks.length
  const completedNow = tasks.filter((task) => task.completed).length
  const pendingTasks = totalTasks - completedNow
  const progress = totalTasks === 0 ? 0 : Math.round((completedNow / totalTasks) * 100)

  // ------------------------------------------------------------
  // PERSISTENT SCORE VALUES (survive task deletion)
  // ------------------------------------------------------------
  const basePoints = scoreState.points
  const streak = getStreak(scoreState.completedDates)
  const streakBonus = streak * BONUS_STREAK
  const totalPoints = Math.max(MIN_SCORE, basePoints + streakBonus)

  // ------------------------------------------------------------
  // OVERDUE / UPCOMING (live, from current tasks)
  // ------------------------------------------------------------
  const today = now ? new Date(now) : new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const overdueTasks = tasks.filter((task) => {
    if (task.completed || !task.dueDate) return false
    const [year, month, day] = task.dueDate.split('-').map(Number)
    const due = new Date(year, month - 1, day)
    return due < todayStart
  }).length

  const upcomingTasks = tasks.filter((task) => {
    if (task.completed || !task.dueDate) return false
    const [year, month, day] = task.dueDate.split('-').map(Number)
    const due = new Date(year, month - 1, day)
    return due >= todayStart
  }).length
  
  // ------------------------------------------------------------
  // RENDER THE SCORING UI
  // ------------------------------------------------------------
  // NOTE: universal (cross-project) points are handled by home.jsx.
  // Never call setState directly in the render body (e.g.
  // setUniversalPoints(...) here) — it causes an infinite
  // re-render loop that crashes the component.
  return (
    <div className="scoring-panel">
      {/* HEADER: title and total score badge */}
      <div className="scoring-header">
        <h2>Your Score</h2>
        <span className="scoring-total">{totalPoints} pts</span>
      </div>

      {/* UNDO MESSAGE: confirmation text */}
      {undoMessage && <p className="scoring-undo-message">{undoMessage}</p>}

      {/* SUBTRACT POINTS: type a number to remove that many */}
      <div className="scoring-subtract">
        <input
          type="number"
          min="1"
          value={subtractAmount}
          onChange={(event) => setSubtractAmount(event.target.value)}
          placeholder="Points to remove"
          className="scoring-subtract-input"
        />
        <button onClick={handleSubtractPoints} className="scoring-subtract-button">
          Remove Points
        </button>
      </div>

      {/* STATS GRID: four quick numbers */}
      <div className="scoring-stats">
        <div className="scoring-stat">
          <span className="scoring-stat-value">{pendingTasks}</span>
          <span className="scoring-stat-label">Pending</span>
        </div>
        <div className="scoring-stat">
          <span className="scoring-stat-value">{overdueTasks}</span>
          <span className="scoring-stat-label">Overdue</span>
        </div>
        <div className="scoring-stat">
          <span className="scoring-stat-value">{upcomingTasks}</span>
          <span className="scoring-stat-label">Upcoming</span>
        </div>
        <div className="scoring-stat">
          <span className="scoring-stat-value">{completedNow}</span>
          <span className="scoring-stat-label">Completed</span>
        </div>
      </div>

      {/* PROGRESS BAR: completion percentage */}
      <div className="scoring-progress">
        <div className="scoring-progress-bar">
          <div
            className="scoring-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="scoring-progress-label">{progress}% complete</span>
      </div>

      {/* POINTS BREAKDOWN: how the score was calculated */}
      <div className="scoring-breakdown">
        <div className="scoring-breakdown-row">
          <span>Base points ({scoreState.completedCount} &times; {POINTS_PER_TASK})</span>
          <span>+{basePoints}</span>
        </div>
        <div className="scoring-breakdown-row">
          <span>Streak bonus ({streak} day{streak === 1 ? '' : 's'} &times; {BONUS_STREAK})</span>
          <span>+{streakBonus}</span>
        </div>
        <div className="scoring-breakdown-row scoring-breakdown-total">
          <span>Total</span>
          <span>{totalPoints} pts</span>
        </div>
      </div>

      {/* STREAK DISPLAY: fire emoji + streak message */}
      <div className="scoring-streak">
        <span className="scoring-streak-flame">&#128293;</span>
        <span className="scoring-streak-text">
          {streak > 0
            ? `${streak} day${streak === 1 ? '' : 's'} streak!`
            : 'Complete a task today to start a streak!'}
        </span>
      </div>
    </div>
  )
  }