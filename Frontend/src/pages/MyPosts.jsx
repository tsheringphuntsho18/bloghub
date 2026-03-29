import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import DashboardHeader from '../components/DashboardHeader'
import { FaPlus, FaEdit, FaTrash, FaEye, FaClock, FaHeart } from 'react-icons/fa'
import { formatDistanceToNow } from 'date-fns'
import './MyPosts.css'

const MyPosts = () => {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, published, draft
  const navigate = useNavigate()

  useEffect(() => {
    checkUserAndFetchPosts()
  }, [filter])

  const checkUserAndFetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      setUser(user)
      await fetchPosts(user.id)
    } catch (error) {
      console.error('Error:', error)
      navigate('/login')
    }
  }

  const fetchPosts = async (userId) => {
    try {
      setLoading(true)
      let query = supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
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
      setPosts(posts.filter(post => post.id !== postId))
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

  if (loading) {
    return (
      <div className="dashboard-container">
        <DashboardHeader user={user} />
        <div className="loading">Loading your posts...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <DashboardHeader user={user} />

      <main className="my-posts-content">
        {/* Tab Navigation - Same as Dashboard */}
        <div className="dashboard-tabs">
          <div className="tab-navigation">
            <button 
              className="tab-btn"
              onClick={() => navigate('/dashboard')}
            >
              For You
            </button>
            <button 
              className="tab-btn"
              onClick={() => navigate('/dashboard?tab=featured')}
            >
              Featured
            </button>
            <button 
              className="tab-btn active"
            >
              My Posts
            </button>
          </div>
        </div>

        <div className="posts-filters">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All ({posts.length})
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

        {posts.length === 0 ? (
          <div className="no-posts">
            <h2>No posts yet</h2>
            <p>Start writing your first blog post!</p>
            <button 
              className="btn-create-post" 
              onClick={() => navigate('/create-post')}
            >
              <FaPlus /> Create Your First Post
            </button>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post.id} className="post-card">
                {post.cover_image && (
                  <div className="post-cover">
                    <img src={post.cover_image} alt={post.title} />
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
                    <span><FaClock /> {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    <span><FaEye /> {post.views} views</span>
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
        )}
      </main>
    </div>
  )
}

export default MyPosts
