// ============================================================
// HOME PAGE (Dashboard)
// ============================================================
// This page greets the user and shows a grid of their passion
// projects. From here you can:
//   - Click "+ New Project" to create a new project
//   - Click any project card to open that project's detail page
// ============================================================

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore'
import { db } from '../../firebase'
import NewProject from './micro-chapter/newproject'
import PassionProject from './micro-chapter/passionproject'

// Home receives the logged-in "user" from App.jsx.
export default function Home({ user }) {
  // State the page needs to remember:
  const [projects, setProjects] = useState([])            // The list of projects
  const [showNewProject, setShowNewProject] = useState(false) // Show the new-project form?
  const [selectedProject, setSelectedProject] = useState(null) // The open project (if any)
  const [displayName, setDisplayName] = useState('Guest')      // The name used in the greeting

  // Load the list of projects from Firebase.
  const fetchProjects = async () => {
    try {
      const q = query(collection(db, 'projects'), limit(10))
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

  // Load a display name to greet the user. We read THIS user's own document
  // (userDevices/{uid}) instead of the first doc in the collection, so the
  // greeting is always correct for the person who is logged in.
  const fetchUserDisplay = async () => {
    try {
      if (!user) {
        const docref = doc(db, 'userDevices', 'guest')
        const guestSnap = await getDoc(docref)
        if (guestSnap.exists()) {
          const guestData = guestSnap.data()
          setDisplayName(guestData.displayName || 'Guest')
        }
        setDisplayName('Guest')
        return
      }
      const userSnap = await getDoc(doc(db, 'userDevices', user.uid))
      if (userSnap.exists()) {
        const userData = userSnap.data()
        setDisplayName(userData.displayName || user.displayName || 'Guest')
      } else {
        setDisplayName(user.displayName || 'Guest')
      }
    } catch (error) {
      console.error('Failed to load user display:', error)
    }
  }

  // Runs once when the page first loads.
  useEffect(() => {
    fetchUserDisplay()
    fetchProjects()
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
    return <NewProject onBack={handleBackFromNewProject} />
  }

  // Show the project detail page if a project is open.
  if (selectedProject) {
    return (
      <PassionProject
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onProjectUpdate={handleProjectUpdate}
      />
    )
  }

  // Otherwise show the dashboard grid.
  return (
    <main className="home-page">
      <section className="home-hero">
        <p className="home-tag">Dashboard</p>
        <h1>Welcome back, {displayName}</h1>
        <p>Bring your passion project to life with consistent action.</p>
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
    </main>
  )
}
