import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import DashboardHeader from '../components/DashboardHeader'
import useEnsureProfile from '../hooks/useEnsureProfile'
import { FaCalendar, FaClock, FaEye, FaHeart, FaComment, FaUser, FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
import { formatDistanceToNow } from 'date-fns'
import './Dashboard.css'

const Dashboard = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('for-you')
  const [featuredPosts, setFeaturedPosts] = useState([])
  const [myPosts, setMyPosts] = useState([])
  const [filter, setFilter] = useState('all') // for My Posts tab
  const navigate = useNavigate()

  // Ensure user has a profile
  useEnsureProfile(user)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    // Check for tab query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'featured') {
      setActiveTab('featured')
    }
  }, [])

  useEffect(() => {
    if (user) {
      if (activeTab === 'for-you') {
        fetchPublicPosts()
      } else if (activeTab === 'featured') {
        fetchFeaturedPosts()
      } else if (activeTab === 'my-posts') {
        fetchMyPosts()
      }
    }
  }, [user, activeTab, filter])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
      } else {
        navigate('/login')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicPosts = async () => {
    try {
      setPostsLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // Fetch author details from profiles table for each post
      const postsWithAuthors = await Promise.all(
        (data || []).map(async (post) => {
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
                author: {
                  username: profile.username,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                  display_name: profile.full_name || profile.username || 'Anonymous'
                }
              }
            }

            // Fallback if no profile exists
            return {
              ...post,
              author: {
                username: 'Anonymous',
                full_name: null,
                avatar_url: null,
                display_name: 'Anonymous'
              }
            }
          } catch (err) {
            console.error('Error fetching author for post:', post.id, err)
            return {
              ...post,
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

      setPosts(postsWithAuthors)
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchMyPosts = async () => {
    try {
      setPostsLoading(true)
      let query = supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setMyPosts(data || [])
    } catch (error) {
      console.error('Error fetching my posts:', error)
      toast.error('Failed to load your posts')
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchFeaturedPosts = async () => {
    try {
      setPostsLoading(true)
      
      // First, get the list of users that the current user follows
      const { data: followedUsers, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      // If no follows or error, show empty state
      if (followError) {
        console.error('Error fetching follows:', followError)
        setFeaturedPosts([])
        setPostsLoading(false)
        return
      }

      if (!followedUsers || followedUsers.length === 0) {
        console.log('User is not following anyone yet')
        setFeaturedPosts([])
        setPostsLoading(false)
        return
      }

      // Get posts from followed users only
      const followingIds = followedUsers.map(f => f.following_id)
      
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .in('user_id', followingIds)
        .order('published_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const postsWithAuthors = await Promise.all(
        (data || []).map(async (post) => await addAuthorToPost(post))
      )
      
      setFeaturedPosts(postsWithAuthors)
    } catch (error) {
      console.error('Error fetching featured posts:', error)
      setFeaturedPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const addAuthorToPost = async (post) => {
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
          author: {
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            display_name: profile.full_name || profile.username || 'Anonymous'
          }
        }
      }

      // Fallback if no profile exists
      return {
        ...post,
        author: {
          username: 'Anonymous',
          full_name: null,
          avatar_url: null,
          display_name: 'Anonymous'
        }
      }
    } catch (err) {
      console.error('Error fetching author for post:', post.id, err)
      return {
        ...post,
        author: {
          username: 'Anonymous',
          full_name: null,
          avatar_url: null,
          display_name: 'Anonymous'
        }
      }
    }
  }

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text
    return text.substr(0, maxLength) + '...'
  }

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const getCurrentPosts = () => {
    switch (activeTab) {
      case 'for-you':
        return posts
      case 'featured':
        return featuredPosts
      case 'my-posts':
        return myPosts
      default:
        return posts
    }
  }

  const getCurrentDescription = () => {
    switch (activeTab) {
      case 'for-you':
        return 'Discover amazing stories from writers around the world'
      case 'featured':
        return 'Posts from authors you follow and trending content'
      case 'my-posts':
        return 'Manage your published posts and drafts'
      default:
        return 'Discover amazing stories from writers around the world'
    }
  }

  const handleDelete = async (postId, postTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${postTitle}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast.success('Post deleted successfully')
      setMyPosts(myPosts.filter(post => post.id !== postId))
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    }
  }

  const getStatusBadge = (status) => {
    return status === 'published' 
      ? <span className="status-badge published">Published</span>
      : <span className="status-badge draft">Draft</span>
  }

  return (
    <div className="dashboard-container">
      <DashboardHeader user={user} />

      <main className="dashboard-content">
        <div className="dashboard-tabs">
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'for-you' ? 'active' : ''}`}
              onClick={() => setActiveTab('for-you')}
            >
              For You
            </button>
            <button 
              className={`tab-btn ${activeTab === 'featured' ? 'active' : ''}`}
              onClick={() => setActiveTab('featured')}
            >
              Featured
            </button>
            <button 
              className={`tab-btn ${activeTab === 'my-posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-posts')}
            >
              My Posts
            </button>
          </div>
        </div>

        <div className="posts-section">
          <div className="section-header">
            <p>{getCurrentDescription()}</p>
          </div>

          {/* My Posts Tab Filter Buttons */}
          {activeTab === 'my-posts' && (
            <div className="posts-filters">
              <button 
                className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setFilter('all')}
              >
                All ({myPosts.length})
              </button>
              <button 
                className={filter === 'published' ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setFilter('published')}
              >
                Published
              </button>
              <button 
                className={filter === 'draft' ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setFilter('draft')}
              >
                Drafts
              </button>
            </div>
          )}

          {postsLoading ? (
            <div className="posts-loading">
              <div className="loading-spinner"></div>
              <p>Loading posts...</p>
            </div>
          ) : getCurrentPosts().length === 0 ? (
            <div className="no-posts">
              {activeTab === 'my-posts' ? (
                <>
                  <h2>No posts yet</h2>
                  <p>Start writing your first blog post!</p>
                  <button 
                    className="btn-primary"
                    onClick={() => navigate('/create-post')}
                  >
                    <FaPlus /> Create Your First Post
                  </button>
                </>
              ) : activeTab === 'featured' ? (
                <>
                  <h2>No featured posts yet</h2>
                  <p>Featured posts show content from authors you follow.</p>
                  <p>Explore the "For You" section to discover and follow interesting authors!</p>
                </>
              ) : (
                <>
                  <p>No posts available yet. Be the first to create one!</p>
                  <button 
                    className="btn-primary"
                    onClick={() => navigate('/create-post')}
                  >
                    Create First Post
                  </button>
                </>
              )}
            </div>
          ) : activeTab === 'my-posts' ? (
            <div className="posts-grid my-posts-grid">
              {getCurrentPosts().map((post) => (
                <div key={post.id} className="post-card my-post-card">
                  {post.cover_image && (
                    <div className="post-cover">
                      <img 
                        src={post.cover_image} 
                        alt={post.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="post-content">
                    <div className="post-header">
                      <h3>{post.title}</h3>
                      {getStatusBadge(post.status)}
                    </div>
                    
                    {post.excerpt && (
                      <p className="post-excerpt">{post.excerpt}</p>
                    )}

                    <div className="post-meta">
                      <span>
                        <FaClock />
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      <span>
                        <FaEye />
                        {post.views} views
                      </span>
                      {post.reading_time > 0 && (
                        <span>{post.reading_time} min read</span>
                      )}
                    </div>

                    <div className="post-actions">
                      <button 
                        className="btn-action btn-edit"
                        onClick={() => navigate(`/edit-post/${post.id}`)}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button 
                        className="btn-action btn-view"
                        onClick={() => navigate(`/post/${post.slug}`)}
                      >
                        <FaEye /> View
                      </button>
                      <button 
                        className="btn-action btn-delete"
                        onClick={() => handleDelete(post.id, post.title)}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="posts-grid">
              {getCurrentPosts().map((post) => (
                <article 
                  key={post.id} 
                  className="post-card"
                  onClick={() => navigate(`/post/${post.slug}`)}
                >
                  {post.cover_image && (
                    <div className="post-card-image">
                      <img 
                        src={post.cover_image} 
                        alt={post.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="post-card-content">
                    <h3 className="post-card-title">{post.title}</h3>
                    
                    <p className="post-card-excerpt">
                      {post.excerpt || truncateText(stripHtml(post.content), 150)}
                    </p>

                    <div className="post-card-footer">
                      <div className="author-info">
                        {post.author?.avatar_url ? (
                          <img 
                            src={post.author.avatar_url} 
                            alt={post.author.username}
                            className="author-avatar"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const placeholder = e.target.nextElementSibling;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div className="author-avatar-placeholder">
                            <FaUser />
                          </div>
                        )}
                        <div className="author-details">
                          <span 
                            className="author-name clickable"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (post.author?.username) {
                                navigate(`/profile/${post.author.username}`)
                              }
                            }}
                            style={{ cursor: post.author?.username ? 'pointer' : 'default' }}
                          >
                            {post.author?.display_name || post.author?.full_name || post.author?.username || 'Unknown Author'}
                          </span>
                          <div className="post-meta">
                            <span className="meta-item">
                              <FaCalendar />
                              {formatDistanceToNow(new Date(post.published_at || post.created_at), { addSuffix: true })}
                            </span>
                            <span className="meta-item">
                              <FaClock />
                              {post.reading_time} min
                            </span>
                            {post.views > 0 && (
                              <span className="meta-item">
                                <FaEye />
                                {post.views}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
