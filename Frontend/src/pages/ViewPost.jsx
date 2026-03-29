import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import DashboardHeader from '../components/DashboardHeader'
import { FaCalendar, FaClock, FaEye, FaUser, FaArrowLeft, FaHeart, FaRegHeart, FaComment, FaBookmark, FaRegBookmark, FaUserPlus, FaUserCheck } from 'react-icons/fa'
import { formatDistanceToNow, format } from 'date-fns'
import './ViewPost.css'

const ViewPost = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [post, setPost] = useState(null)
  const [author, setAuthor] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Engagement states
  const [claps, setClaps] = useState(0)
  const [userClaps, setUserClaps] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    checkUserAndLoadPost()
  }, [slug])

  useEffect(() => {
    if (post && user) {
      loadEngagementData()
      loadAuthorInfo()
      checkIfFollowing()
    }
  }, [post, user])

  const checkUserAndLoadPost = async () => {
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Load the post
      await loadPost()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const loadPost = async () => {
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) throw error

      if (!post) {
        toast.error('Post not found')
        navigate('/')
        return
      }

      // Check if post is published or user is the author
      if (post.status !== 'published' && (!user || post.user_id !== user.id)) {
        toast.error('This post is not available')
        navigate('/')
        return
      }

      setPost(post)

      // Increment view count
      if (user?.id !== post.user_id) {
        await supabase.rpc('increment_post_views', { post_id: post.id })
      }
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Failed to load post')
      navigate('/')
    }
  }

  const loadAuthorInfo = async () => {
    if (!post) return

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .eq('id', post.user_id)
        .maybeSingle()

      if (error) throw error

      setAuthor(profile || {
        id: post.user_id,
        username: 'Anonymous',
        full_name: null,
        avatar_url: null,
        bio: null
      })
    } catch (error) {
      console.error('Error loading author:', error)
      setAuthor({
        id: post.user_id,
        username: 'Anonymous',
        full_name: null,
        avatar_url: null,
        bio: null
      })
    }
  }

  const checkIfFollowing = async () => {
    if (!user || !post || user.id === post.user_id) return

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', post.user_id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error)
      }

      setIsFollowing(!!data)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please login to follow')
      return
    }

    if (user.id === post.user_id) {
      toast.info('You cannot follow yourself')
      return
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', post.user_id)

        if (error) throw error

        setIsFollowing(false)
        toast.success('Unfollowed successfully')
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert([{
            follower_id: user.id,
            following_id: post.user_id
          }])

        if (error) throw error

        setIsFollowing(true)
        toast.success('Following successfully')
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error)
      toast.error('Failed to update follow status')
    }
  }

  const loadEngagementData = async () => {
    if (!post) return

    try {
      // Load total claps using RPC function
      const { data: clapsData, error: clapsError } = await supabase
        .rpc('get_post_claps', { post_id: post.id })
      
      if (clapsError) {
        console.error('Error loading claps:', clapsError)
      } else {
        setClaps(clapsData || 0)
      }

      // Load user's claps
      if (user) {
        const { data: userClapsData, error: userClapsError } = await supabase
          .from('claps')
          .select('count')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (userClapsError) {
          console.error('Error loading user claps:', userClapsError)
        } else {
          setUserClaps(userClapsData?.count || 0)
        }

        // Check if bookmarked
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (bookmarkError) {
          console.error('Error checking bookmark:', bookmarkError)
        } else {
          setIsBookmarked(!!bookmarkData)
        }
      }

      // Load comments - Get comments with author info from auth.users using RPC
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (commentsError) {
        console.error('Error loading comments:', commentsError)
      } else {
        // Get author info for each comment
        const commentsWithAuthors = await Promise.all(
          (commentsData || []).map(async (comment) => {
            try {
              // Get from profiles table
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, full_name, avatar_url')
                .eq('id', comment.user_id)
                .maybeSingle()

              if (profile) {
                return {
                  ...comment,
                  profiles: profile
                }
              }

              // Fallback if no profile
              return {
                ...comment,
                profiles: {
                  username: 'Anonymous',
                  full_name: null,
                  avatar_url: null
                }
              }
            } catch (err) {
              console.error('Error fetching comment author:', err)
              return {
                ...comment,
                profiles: {
                  username: 'Anonymous',
                  full_name: null,
                  avatar_url: null
                }
              }
            }
          })
        )

        setComments(commentsWithAuthors)
      }
    } catch (error) {
      console.error('Error loading engagement data:', error)
    }
  }

  const handleClap = async () => {
    if (!user) {
      toast.error('Please login to clap')
      return
    }

    try {
      if (userClaps >= 50) {
        toast.info('Maximum 50 claps per post reached')
        return
      }

      const newCount = userClaps + 1

      if (userClaps === 0) {
        // Insert new clap record
        await supabase
          .from('claps')
          .insert([{ post_id: post.id, user_id: user.id, count: newCount }])
      } else {
        // Update existing clap record
        await supabase
          .from('claps')
          .update({ count: newCount })
          .eq('post_id', post.id)
          .eq('user_id', user.id)
      }

      setUserClaps(newCount)
      setClaps(claps + 1)
      toast.success('👏 Clapped!')
    } catch (error) {
      console.error('Error clapping:', error)
      toast.error('Failed to clap')
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please login to bookmark')
      return
    }

    try {
      if (isBookmarked) {
        // Remove bookmark
        await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
        
        setIsBookmarked(false)
        toast.success('Bookmark removed')
      } else {
        // Add bookmark
        await supabase
          .from('bookmarks')
          .insert([{ post_id: post.id, user_id: user.id }])
        
        setIsBookmarked(true)
        toast.success('Post bookmarked!')
      }
    } catch (error) {
      console.error('Error bookmarking:', error)
      toast.error('Failed to bookmark')
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Please login to comment')
      return
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment')
      return
    }

    try {
      setCommentLoading(true)

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        }])
        .select('*')
        .single()

      if (error) throw error

      // Get author info for the new comment
      try {
        // Get from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        let commentWithAuthor = { ...data }

        if (profile) {
          commentWithAuthor.profiles = profile
        } else {
          // Fallback if no profile
          commentWithAuthor.profiles = {
            username: 'Anonymous',
            full_name: null,
            avatar_url: null
          }
        }

        setComments([commentWithAuthor, ...comments])
      } catch (authorError) {
        console.error('Error fetching comment author:', authorError)
        // Add comment without author info
        setComments([{ ...data, profiles: { username: 'Anonymous', full_name: null, avatar_url: null } }, ...comments])
      }

      setNewComment('')
      toast.success('Comment posted!')
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error('Failed to post comment')
    } finally {
      setCommentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="view-post-page">
        {user && <DashboardHeader user={user} />}
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading post...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="view-post-page">
        {user && <DashboardHeader user={user} />}
        <div className="error-state">
          <h2>Post not found</h2>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="view-post-page">
      {user && <DashboardHeader user={user} />}

      <div className="view-post-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        <article className="post-article">
          {/* Cover Image */}
          {post.cover_image && (
            <div className="post-cover">
              <img src={post.cover_image} alt={post.title} />
            </div>
          )}

          {/* Post Header */}
          <header className="post-header">
            <h1 className="post-title">{post.title}</h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="post-excerpt">{post.excerpt}</p>
            )}

            {/* Author Info */}
            {author && (
              <div className="author-section">
                <div className="author-info-row">
                  <div 
                    className="author-avatar-large"
                    onClick={() => author.username && navigate(`/profile/${author.username}`)}
                    style={{ cursor: author.username ? 'pointer' : 'default' }}
                  >
                    {author.avatar_url ? (
                      <img src={author.avatar_url} alt={author.username} />
                    ) : (
                      <div className="avatar-placeholder-large">
                        <FaUser />
                      </div>
                    )}
                  </div>
                  <div className="author-details-large">
                    <span 
                      className="author-name-large"
                      onClick={() => author.username && navigate(`/profile/${author.username}`)}
                      style={{ cursor: author.username ? 'pointer' : 'default' }}
                    >
                      {author.full_name || author.username || 'Anonymous'}
                    </span>
                    {user && user.id !== post.user_id && (
                      <button 
                        className={`follow-btn ${isFollowing ? 'following' : ''}`}
                        onClick={handleFollow}
                      >
                        {isFollowing ? (
                          <>
                            <FaUserCheck /> Following
                          </>
                        ) : (
                          <>
                            <FaUserPlus /> Follow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Post Meta */}
            <div className="post-meta">
              <div className="meta-item">
                <FaClock />
                <span>{post.reading_time} min read</span>
              </div>
              <div className="meta-item">
                <FaCalendar />
                <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </header>

          {/* Post Content */}
          <div 
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Engagement Bar */}
          <div className="engagement-bar">
            <button 
              className={`engagement-btn clap-btn ${userClaps > 0 ? 'active' : ''}`}
              onClick={handleClap}
              disabled={!user}
              title={user ? `Clap for this post (${userClaps}/50)` : 'Login to clap'}
            >
              {userClaps > 0 ? <FaHeart /> : <FaRegHeart />}
              <span>{claps} {claps === 1 ? 'clap' : 'claps'}</span>
            </button>

            <button 
              className={`engagement-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
              onClick={handleBookmark}
              disabled={!user}
              title={user ? (isBookmarked ? 'Remove bookmark' : 'Bookmark this post') : 'Login to bookmark'}
            >
              {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>

            <div className="engagement-stat">
              <FaComment />
              <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <h2 className="comments-title">Comments ({comments.length})</h2>

            {/* Comment Form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="comment-form">
                <div className="comment-input-group">
                  <div className="comment-avatar">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Your avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        <FaUser />
                      </div>
                    )}
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="comment-textarea"
                    rows="3"
                    disabled={commentLoading}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn-comment-submit"
                  disabled={commentLoading || !newComment.trim()}
                >
                  {commentLoading ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            ) : (
              <div className="comment-login-prompt">
                <p>Please <button onClick={() => navigate('/login')} className="link-btn">login</button> to comment</p>
              </div>
            )}

            {/* Comments List */}
            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="no-comments">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.profiles?.avatar_url ? (
                        <img src={comment.profiles.avatar_url} alt={comment.profiles.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          <FaUser />
                        </div>
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span 
                          className="comment-author clickable"
                          onClick={() => comment.profiles?.username && navigate(`/profile/${comment.profiles.username}`)}
                          style={{ cursor: comment.profiles?.username ? 'pointer' : 'default' }}
                        >
                          {comment.profiles?.full_name || comment.profiles?.username || 'Anonymous'}
                        </span>
                        <span className="comment-date">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Edit Button (if user is author) */}
          {user && user.id === post.user_id && (
            <div className="post-actions">
              <button 
                className="btn-edit"
                onClick={() => navigate(`/edit-post/${post.id}`)}
              >
                Edit Post
              </button>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

export default ViewPost
