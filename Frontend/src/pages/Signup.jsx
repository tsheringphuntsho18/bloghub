import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import { FcGoogle } from 'react-icons/fc'
import './Auth.css'

const Signup = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleEmailSignup = async (e) => {
    e.preventDefault()

    // Validate username
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters long!')
      return
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }

    // Validate password length
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long!')
      return
    }

    setLoading(true)

    try {
      const base = import.meta.env.VITE_APP_BASE_URL || window.location.origin
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${base}/dashboard`,
          data: {
            username: username,
            full_name: username,
            display_name: username
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create user profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username: username,
              full_name: username,
              avatar_url: null
            }
          ])

        if (profileError) {
          console.error('Error creating profile:', profileError)
        }

        toast.success('Signup successful! Please check your email to verify your account.')
        // Clear form
        setUsername('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        // Redirect to login after a delay
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.')
      } else {
        toast.error(error.message || 'Failed to sign up. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const base = import.meta.env.VITE_APP_BASE_URL || window.location.origin
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${base}/dashboard`
        }
      })

      if (error) throw error
      
      toast.info('Redirecting to Google...')
    } catch (error) {
      toast.error(error.message || 'Failed to sign up with Google.')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1 className="auth-logo">
            <span className="logo-blog">Blog</span>
            <span className="logo-hub">hub</span>
          </h1>
          <h2>Create Account</h2>
          <p>Sign up to get started with Bloghub</p>
        </div>

        <form onSubmit={handleEmailSignup} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password (min 6 characters)"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button 
          onClick={handleGoogleSignup} 
          className="btn-google"
        >
          <FcGoogle size={24} />
          Continue with Google
        </button>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
