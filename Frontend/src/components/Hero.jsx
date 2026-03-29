import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Hero.css'

const Hero = () => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/login')
  }

  return (
    <main className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="logo-text"><span className="logo-blog">Blog</span><span className="logo-hub">hub</span></span>
          </h1>
          <p className="hero-subtitle">
            Your ultimate platform for sharing ideas, stories, and creativity
          </p>
          <p className="hero-description">
            Join thousands of writers and readers in our vibrant community. 
            Create, share, and discover amazing content every day.
          </p>
          <button className="btn-get-started" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </div>
    </main>
  )
}

export default Hero
