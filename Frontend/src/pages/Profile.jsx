import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import DashboardHeader from '../components/DashboardHeader'
import useEnsureProfile from '../hooks/useEnsureProfile'
import { FaGlobe, FaTwitter, FaGithub, FaLinkedin, FaCalendarAlt, FaUserPlus, FaUserCheck } from 'react-icons/fa'
import { formatDistanceToNow } from 'date-fns'
import './Profile.css'

const Profile = () => {
  const { username } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalClaps: 0
  })

  // Ensure user has a profile
  useEnsureProfile(user)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (username) {
      loadProfile()
    }
  }, [username])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadProfile = async () => {
    try {
      setLoading(true)

      // Get profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }

      if (!profileData) {
        toast.error('Profile not found')
        navigate('/dashboard')
        return
      }

      setProfile(profileData)

      // Calculate stats - get post count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileData.id)
        .eq('status', 'published')

      setStats({
        totalPosts: postsCount || 0,
        totalViews: 0,
        totalClaps: 0
      })

      // Check if current user is following this profile
      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle()

        setIsFollowing(!!followData)
      }

      // Get followers and following counts
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id)

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id)

      setFollowersCount(followersCount || 0)
      setFollowingCount(followingCount || 0)

    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please login to follow')
      return
    }

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)

        setIsFollowing(false)
        setFollowersCount(followersCount - 1)
        toast.success('Unfollowed')
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_id: profile.id }])

        setIsFollowing(true)
        setFollowersCount(followersCount + 1)
        toast.success('Following!')
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      toast.error('Failed to update follow status')
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        {user && <DashboardHeader user={user} />}
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page">
        {user && <DashboardHeader user={user} />}
        <div className="error-state">
          <h2>Profile not found</h2>
          <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </div>
      </div>
    )
  }

  const isOwnProfile = user && user.id === profile.id

  return (
    <div className="profile-page">
      {user && <DashboardHeader user={user} />}
      
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar-large">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || profile.username} />
              ) : (
                <div className="avatar-placeholder-large">
                  {(profile.full_name || profile.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="profile-info">
              <h1>{profile.full_name || profile.username}</h1>
              <p className="profile-username">@{profile.username}</p>
              
              {profile.bio && (
                <p className="profile-bio">{profile.bio}</p>
              )}

              <div className="profile-meta">
                <div className="meta-item">
                  <FaCalendarAlt />
                  <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="profile-social">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="social-link">
                    <FaGlobe /> Website
                  </a>
                )}
                {profile.twitter && (
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="social-link">
                    <FaTwitter /> Twitter
                  </a>
                )}
                {profile.github && (
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="social-link">
                    <FaGithub /> GitHub
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">
                    <FaLinkedin /> LinkedIn
                  </a>
                )}
              </div>

              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-value">{stats.totalPosts}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{followersCount}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{followingCount}</span>
                  <span className="stat-label">Following</span>
                </div>
              </div>

              {!isOwnProfile && user && (
                <button className={`follow-btn ${isFollowing ? 'following' : ''}`} onClick={handleFollow}>
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

              {isOwnProfile && (
                <button className="edit-profile-btn" onClick={() => navigate('/settings')}>
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
