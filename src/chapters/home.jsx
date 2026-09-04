// ============================================================
// HOME PAGE (Dashboard)
// ============================================================
// This page greets the user and shows a grid of their passion
// projects. From here you can:
//   - Click "+ New Project" to create a new project
//   - Click any project card to open that project's detail page
// ============================================================

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, increment, limit, maximum, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase'
import NewProject from './micro-chapter/newproject'
import PassionProject from './micro-chapter/passionproject'
import Users from './social-chapter/users'

// Home receives the logged-in "user" from App.jsx.
export default function Home({ user }) {
  // State the page needs to remember:
  const [projects, setProjects] = useState([])            // The list of projects
  const [showNewProject, setShowNewProject] = useState(false) // Show the new-project form?
  const [selectedProject, setSelectedProject] = useState(null) // The open project (if any)
  const [universalPoints, setUniversalPoints] = useState(1) // The user's total points (from all projects)  
  const [displayName, setDisplayName] = useState('Guest')      // The name used in the greeting
  const [mapUsers, setMapUsers] = useState([]) // List of users for the "Meet Other Users" section
  const [selectedUser, setSelectedUser] = useState(null) // The user whose profile is being viewed

  // Load the list of projects from Firebase.
  const fetchProjects = async () => {
    try {
      // Only show projects owned by the currently logged-in user.
      // New projects are saved with a "uid" field (see newproject.jsx),
      // so we match it against the authenticated user's uid here.
      if (!user || !user.uid) {
        setProjects([])
        return
      }
      // The device doc uses the user's uid as its document ID, so setDoc
      // is idempotent: running it twice just re-creates the SAME doc
      // instead of adding duplicates the way addDoc did.
      const deviceRef = doc(db, 'devices', user.uid)
      let deviceSnap = await getDoc(deviceRef)
      if (!deviceSnap.exists()) {
        await setDoc(deviceRef, {
          uid: user.uid,
          points: 0,
          displayName: user.displayName || 'Guest',
        })
        deviceSnap = await getDoc(deviceRef)
      }
      // Read points + display name from the one doc we just ensured exists.
      if (deviceSnap.exists()) {
        const deviceData = deviceSnap.data()
          setUniversalPoints(deviceData.points || 0)
        setDisplayName(deviceData.displayName || user.displayName || 'Guest')
        }
      const q = query(
        collection(db, 'projects'),
        where('uid', '==', user.uid), // only this user's projects
        limit(10)
      )
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,        // Firebase document ID
        ...doc.data(),     // all the fields (title, description, etc.)
      }))
      setProjects(list)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }
//Get other users from the devices collection to display in the "Meet Other Users" section.
  const fetchOtherUser = async () => {
    try {
      const q = query(
        collection(db, 'devices'),
        where("uid", "!=", user.uid), // exclude current user
        limit(5)
      )
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
        ...doc.data(),
      }))
      setMapUsers(list)
    } catch (error) {
      console.error('Failed to load other users:', error)
    }
  }

  // Load a display name to greet the user when there is no logged-in user.
  // (For logged-in users, the name comes from their devices/{uid} doc in fetchProjects.)
  const fetchGuestDisplay = async () => {
    try {
      if (user) return // logged in — fetchProjects handles the name
      const guestSnap = await getDoc(doc(db, 'devices', 'guest'))
        if (guestSnap.exists()) {
          const guestData = guestSnap.data()
          setDisplayName(guestData.displayName || 'Guest')
      } else {
        setDisplayName('Guest')
      }
    } catch (error) {
      console.error('Failed to load user display:', error)
    }
  }

  // Runs once when the page first loads.
  useEffect(() => {
    fetchGuestDisplay()
    fetchProjects()
    fetchOtherUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Called when we come back from the New Project form.
  const handleBackFromNewProject = async () => {
    await fetchProjects()     // refresh the list
    setShowNewProject(false)  // hide the form
  }

  // Called when a project is updated or deleted on its detail page.
  const handleProjectUpdate = (updatedProject) => {
    // updatedProject === null means the project was deleted.
    if (!updatedProject) {
      const selectedId = selectedProject ? selectedProject.id : null
      setProjects(projects.filter((p) => p.id !== selectedId))
      setSelectedProject(null)
      return
    }
    // Otherwise replace the updated project inside the list.
    setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
    setSelectedProject(updatedProject)
  }

  // Show the New Project form if the user asked for it.
  if (showNewProject) {
    return <NewProject onBack={handleBackFromNewProject} user={user} />
  }

  // Called by Scoring (through PassionProject) whenever the user earns
  // points by completing tasks. Adds the delta to devices/{uid}.points
  // in Firebase AND to the local state shown in the header.
  const handlePointsEarned = (pointsDelta) => {
    if (!user || !user.uid || !pointsDelta) return
    setUniversalPoints((prev) => prev + pointsDelta)
    updateDoc(doc(db, 'devices', user.uid), { points: increment(pointsDelta) }).catch((error) => {
      console.error('Failed to update universal points:', error)
    })
  }

  // Show the project detail page if a project is open.
  if (selectedProject) {
    return (
      <PassionProject
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onProjectUpdate={handleProjectUpdate}
        onPointsEarned={handlePointsEarned}
      />
    )
  }

  // Otherwise show the dashboard grid.
  return (
    <main className="home-page">
      <section className="home-header">
        <div className="home-hero">
          <p className="home-tag">Dashboard</p>
          <h1>Welcome back, {displayName}</h1>
          <p>Bring your passion project to life with consistent action.</p>
        </div>
        <div className="home-scores">
          <span className="home-scores-icon" aria-hidden="true">&#11088;</span>
          <div className="home-scores-text">
            <span className="home-scores-label">Total Points</span>
            <strong className="home-scores-value">{universalPoints} pts</strong>
          </div>
        </div>
      </section>

      <section className="projects-section">
        <div className="section-heading">
          <h2>Your Passions</h2>
          <button type="button" onClick={() => setShowNewProject(true)}>
            + New Project
          </button>
        </div>

        <div className="project-grid">
          {projects.length === 0 ? (
            <p>No projects yet. Create your first one.</p>
          ) : (
            projects.map((project) => (
              <article
                className="project-card"
                key={project.id}
                onClick={() => setSelectedProject(project)}
              >
                <h3>{project.title}</h3>
                <span>{project.category || 'General'}</span>
                <p>{project.description || 'No description yet.'}</p>
              </article>
            ))
          )}
        </div>
      </section>
      <section className="meet-users">
          <div>
            <h2>Meet Other Users</h2>
            <p>Connect with other users and share your passion projects.</p>
          </div>
          <div className="user-grid">
            {mapUsers.slice(0, 5).map((user) => (
              <div key={user.id} className="user-card" onClick={() => setSelectedUser(user)}>
                <h3>{user.displayName}</h3>
              </div>
            ))}
          </div>
          <div className="to-user-profile">
          <Users selectedUser={selectedUser} />
          </div>
      </section>
    </main>
  )
}
