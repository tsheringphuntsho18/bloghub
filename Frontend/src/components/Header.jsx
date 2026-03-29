import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Header.css'

const Header = () => {
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate('/login')
  }

  const handleSignup = () => {
    navigate('/signup')
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo" onClick={() => navigate('/')}>
          <span className="logo-blog">Blog</span>
          <span className="logo-hub">hub</span>
        </div>
        <div className="auth-buttons">
          <button className="btn-login" onClick={handleLogin}>
            Login
          </button>
          <button className="btn-signup" onClick={handleSignup}>
            Sign Up
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
