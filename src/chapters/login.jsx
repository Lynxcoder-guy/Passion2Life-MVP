import { useState } from 'react'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'

export default function Login({ onSuccess }) {
  const [name, setName] = useState('Guest')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLogin, setIsLogin] = useState(true)

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
      await setPersistence(auth, browserLocalPersistence)

      let result
      if (isLogin) {
        result = await signInWithEmailAndPassword(auth, email, password)
        setMessage(`Logged in successfully: ${result.user.email}`)
      } else {
        result = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() })
        }
        setMessage(`Account created: ${result.user.email}`)
      }

      // Generate a stable deviceId per browser (no external import needed)
      const deviceId =
        localStorage.getItem('deviceId') || crypto.randomUUID()
      localStorage.setItem('deviceId', deviceId)

      const displayName = (isLogin ? result.user.displayName : '') || name.trim()

      try {
        await setDoc(doc(db, 'devices', deviceId), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: name,
          deviceId,
          lastLoginAt: new Date(),
        })
      } catch (deviceError) {
        console.warn('Could not save device info (non-blocking):', deviceError)
      }

      if (onSuccess) {
        onSuccess({
          ...result.user,
          displayName: name || 'User',
        })
      }
    } catch (error) {
      setMessage(String(error.message))
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
