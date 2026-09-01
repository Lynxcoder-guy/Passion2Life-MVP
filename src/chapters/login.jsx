import { useState } from 'react'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { getDeviceId } from '../../device'

export default function Login({ onSuccess }) {
  // These are the form inputs that let the user type email/password and optional name.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  // This function runs when the user presses Login or Sign Up.
  // It validates the form, signs the user in with Firebase,
  // saves the device info, and then tells the parent app that login succeeded.
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email || !password) {
      setMessage('Please enter both email and password.')
      return
    }

    if (!isLogin && !name.trim()) {
      setMessage('Please enter your name.')
      return
    }

    try {
      // This tells Firebase to keep the login session saved in the browser.
      // That is what allows auto-login after refresh or reopening the app.
      await setPersistence(auth, browserLocalPersistence)

      let result

      if (isLogin) {
        // Sign in with the user-provided email and password.
        result = await signInWithEmailAndPassword(auth, email, password)
        setMessage(`Logged in successfully: ${result.user.email}`)
      } else {
        // Create a new Firebase account for the user.
        result = await createUserWithEmailAndPassword(auth, email, password)
        setMessage(`Account created: ${result.user.email}`)
      }

      // Create or reuse a stable device ID for this browser.
      const deviceId = getDeviceId()

      // Save the device ID in Firestore so we know which device belongs to this user.
      // NOTE: These writes are best-effort. If they fail (e.g. security rules
      // don't allow them yet), login should still succeed so the user can
      // reach the app. Without this, a rules problem here would block login.
      try {
        await setDoc(doc(db, 'devices', deviceId), {
          uid: result.user.uid,
          email: result.user.email,
          deviceId,
          lastLoginAt: new Date(),
        })

        // Also store a user-to-device link for easier lookup later.
        await setDoc(doc(db, 'userDevices', result.user.uid), {
          deviceId,
          email: result.user.email,
          lastLoginAt: new Date(),
        })
      } catch (deviceError) {
        console.warn('Could not save device info (non-blocking):', deviceError)
      }

      // Let the parent app know the user is now logged in.
      if (onSuccess) {
        onSuccess({
          ...result.user,
          displayName: isLogin ? result.user.displayName || name || 'User' : name.trim(),
        })
      }
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <span className="login-tag">{isLogin ? 'Login' : 'Sign Up'}</span>
        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" className="login-button">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {/* This shows errors and success messages. Without this, login
            failures (wrong password, provider not enabled, network problems)
            are invisible — it looks like the button does nothing. */}
        {message && <p className="login-message" role="status">{message}</p>}

        <button
          type="button"
          className="toggle-button"
          onClick={() => setIsLogin((prev) => !prev)}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
      </div>
    </main>
  )
}