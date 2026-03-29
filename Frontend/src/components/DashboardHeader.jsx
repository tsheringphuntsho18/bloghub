import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import { FaUser, FaSignOutAlt, FaCog, FaPen, FaSearch, FaTimes } from 'react-icons/fa'
import './DashboardHeader.css'

const DashboardHeader = ({ user }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [username, setUsername] = useState(null)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)
  const navigate = useNavigate()

  // Get username for profile navigation
  useEffect(() => {
    const getUserProfile = async () => {
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile && profile.username) {
          setUsername(profile.username)
        } else if (error) {
          console.error('Error fetching username:', error)
        }
      }
    }
    getUserProfile()
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        // Only close search dropdown, don't clear the query for desktop
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery.trim())
      }, 300) // Debounce search
      
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const performSearch = async (query) => {
    try {
      setSearchLoading(true)
      
      // Search in posts
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, slug, excerpt, created_at, user_id')
        .eq('status', 'published')
        .or(`title.ilike.%${query}%, content.ilike.%${query}%, excerpt.ilike.%${query}%`)
        .limit(5)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get author info for each post
      const postsWithAuthors = await Promise.all(
        (posts || []).map(async (post) => {
          try {
            // Get from profiles table
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', post.user_id)
              .maybeSingle()

            if (profile) {
              return {
                ...post,
                type: 'post',
                author: {
                  username: profile.username,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                  display_name: profile.full_name || profile.username || 'Anonymous'
                }
              }
            }

            // Fallback if no profile
            return {
              ...post,
              type: 'post',
              author: {
                username: 'Anonymous',
                full_name: null,
                avatar_url: null,
                display_name: 'Anonymous'
              }
            }
          } catch (err) {
            return {
              ...post,
              type: 'post',
              author: {
                username: 'Anonymous',
                full_name: null,
                avatar_url: null,
                display_name: 'Anonymous'
              }
            }
          }
        })
      )

      setSearchResults(postsWithAuthors)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen)
    if (!searchOpen) {
      // On mobile, focus the mobile search input after dropdown opens
      setTimeout(() => {
        const mobileInput = document.querySelector('.search-mobile-only .search-input')
        if (mobileInput) {
          mobileInput.focus()
        }
      }, 100)
    } else {
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const handleDesktopSearchFocus = () => {
    setSearchOpen(true)
  }

  const handleSearchResultClick = (result) => {
    if (result.type === 'post') {
      navigate(`/post/${result.slug}`)
    }
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast.success('Logged out successfully!')
      navigate('/')
    } catch (error) {
      toast.error('Failed to logout. Please try again.')
    }
  }

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen)
  }

  const getInitials = (email, username) => {
    if (username) {
      return username.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="dashboard-header">
      <h1 className="dashboard-logo" onClick={() => navigate('/dashboard')}>
        <span className="logo-blog">Blog</span>
        <span className="logo-hub">hub</span>
      </h1>

      <div className="header-actions">
        <div className="search-container" ref={searchRef}>
          {/* Desktop search bar */}
          <div className="search-bar-desktop">
            <FaSearch className="search-bar-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-bar-input"
              onFocus={handleDesktopSearchFocus}
            />
          </div>

          {/* Mobile search button */}
          <button 
            className="search-btn-mobile"
            onClick={handleSearchToggle}
            title="Search posts"
          >
            {searchOpen ? <FaTimes /> : <FaSearch />}
          </button>
          
          {searchOpen && (
            <div className="search-dropdown">
              {/* Mobile search input */}
              <div className="search-input-container search-mobile-only">
                <FaSearch className="search-input-icon" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  autoFocus
                />
              </div>
              
              {searchLoading && (
                <div className="search-loading">
                  <div className="search-spinner"></div>
                  <span>Searching...</span>
                </div>
              )}
              
              {searchResults.length > 0 && !searchLoading && (
                <div className="search-results">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="search-result-item"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className="search-result-content">
                        <h4 className="search-result-title">{result.title}</h4>
                        {result.excerpt && (
                          <p className="search-result-excerpt">{result.excerpt}</p>
                        )}
                        <div className="search-result-meta">
                          <span className="search-result-author">
                            by {result.author?.display_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery.length > 2 && searchResults.length === 0 && !searchLoading && (
                <div className="search-no-results">
                  <p>No posts found for "{searchQuery}"</p>
                </div>
              )}
              
              {searchQuery.length > 0 && searchQuery.length <= 2 && (
                <div className="search-hint">
                  <p>Type at least 3 characters to search</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          className="write-btn"
          onClick={() => navigate('/create-post')}
          title="Write a new post"
        >
          <FaPen />
          <span>Write</span>
        </button>

        <div className="user-menu" ref={dropdownRef}>
          <div className="avatar-container" onClick={toggleDropdown}>
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="User Avatar" 
                className="user-avatar-img"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {getInitials(user?.email, user?.user_metadata?.username)}
              </div>
            )}
          </div>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {user?.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="User Avatar" 
                      className="dropdown-avatar-img"
                    />
                  ) : (
                    <div className="dropdown-avatar-placeholder">
                      {getInitials(user?.email, user?.user_metadata?.username)}
                    </div>
                  )}
                </div>
                <div className="dropdown-user-info">
                  <p className="dropdown-name">
                    {user?.user_metadata?.full_name || user?.user_metadata?.username || 'User'}
                  </p>
                  <p className="dropdown-email">{user?.email}</p>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-items">
                <button 
                  className="dropdown-item" 
                  onClick={() => username ? navigate(`/profile/${username}`) : toast.error('Profile not available')}
                >
                  <FaUser />
                  <span>Profile</span>
                </button>
                <button className="dropdown-item" onClick={() => navigate('/settings')}>
                  <FaCog />
                  <span>Settings</span>
                </button>
              </div>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
