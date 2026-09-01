import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import './App.css'
import Login from './chapters/login'
import Home from './chapters/home'
import { auth } from '../firebase'

function App() {
  // These state values control what the app shows to the user.
  // showLogin = should we show the login form instead of the intro screen?
  // isLoggedIn = has Firebase already restored a saved user session?
  // currentUser = the authenticated user object returned by Firebase.
  const [showLogin, setShowLogin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  // This runs once when the app loads.
  // Firebase checks if a user is still signed in from the browser's local storage.
  // If yes, we automatically show the Home page without asking the user to log in again.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          ...user,
          displayName: user.displayName || 'User',
        })
        setIsLoggedIn(true)
        setShowLogin(false)
      } else {
        setCurrentUser(null)
        setIsLoggedIn(false)
      }
    })

    // Clean up the listener when the component unmounts.
    return () => unsubscribe()
  }, [])

  if (isLoggedIn) {
    return <Home user={currentUser} />
  }

  if (showLogin) {
    return (
      <Login
        onSuccess={(loggedInUser) => {
          setCurrentUser(loggedInUser)
          setIsLoggedIn(true)
          setShowLogin(false)
        }}
      />
    )
  }

  return (
    <main className="introsection">
      <div className="intro-card">
        <span className="intro-tag">Passion2Life</span>
        <h1>Welcome to Passion2Life</h1>
        <p>Bring your Passion Project and Goals to reality with consistency</p>
      </div>
      <button className="intro-button" onClick={() => setShowLogin(true)}>
        Get Started
      </button>
    </main>
  )
}

export default App
