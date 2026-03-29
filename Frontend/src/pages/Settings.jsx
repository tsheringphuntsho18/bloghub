import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import DashboardHeader from '../components/DashboardHeader'
import useEnsureProfile from '../hooks/useEnsureProfile'
import { FaUser, FaLock, FaTrash, FaSave } from 'react-icons/fa'
import './Settings.css'

const Settings = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile') // profile, account, security
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Ensure user has a profile
  useEnsureProfile(user)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      setUser(user)

      // Load profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile:', error)
        throw error
      }

      if (profile) {
        setProfileForm({
          username: profile.username || '',
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || ''
        })
        setAvatarPreview(profile.avatar_url)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Avatar file size must be less than 2MB')
        return
      }

      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return profileForm.avatar_url

    try {
      setUploadingAvatar(true)

      // Create unique filename
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, avatarFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
      return profileForm.avatar_url
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()

    if (!profileForm.username.trim()) {
      toast.error('Username is required')
      return
    }

    try {
      setSaving(true)

      // Upload avatar if changed
      const avatarUrl = avatarFile ? await uploadAvatar() : profileForm.avatar_url

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profileForm,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
      setAvatarFile(null)
    } catch (error) {
      console.error('Error updating profile:', error)
      if (error.code === '23505') {
        toast.error('Username already taken')
      } else {
        toast.error('Failed to update profile')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      toast.success('Password changed successfully!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your posts will be deleted.'
    )

    if (!confirmed) return

    const doubleConfirm = window.confirm(
      'This is your last chance. Are you absolutely sure you want to delete your account permanently?'
    )

    if (!doubleConfirm) return

    try {
      setSaving(true)

      // Delete user's posts
      await supabase
        .from('posts')
        .delete()
        .eq('user_id', user.id)

      // Delete profile (cascade will handle other data)
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      // Sign out
      await supabase.auth.signOut()

      toast.success('Account deleted')
      navigate('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <DashboardHeader user={user} />
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <DashboardHeader user={user} />
      
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUser /> Profile
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FaLock /> Security
          </button>
          <button
            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <FaTrash /> Account
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {activeTab === 'profile' && (
            <form className="settings-form" onSubmit={handleSaveProfile}>
              <div className="form-section">
                <h2>Profile Information</h2>
                
                {/* Avatar Upload */}
                <div className="avatar-upload-section">
                  <div className="avatar-preview">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        {(profileForm.full_name || profileForm.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="avatar-upload-actions">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="avatar-upload" className="upload-btn">
                      Choose Photo
                    </label>
                    <p className="upload-hint">JPG, PNG or GIF. Max size 2MB</p>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profileForm.username}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={profileForm.full_name}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={profileForm.bio}
                    onChange={handleProfileChange}
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving || uploadingAvatar}>
                  <FaSave /> {saving || uploadingAvatar ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form className="settings-form" onSubmit={handleChangePassword}>
              <div className="form-section">
                <h2>Change Password</h2>
                <p className="section-description">
                  Update your password to keep your account secure
                </p>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    minLength="6"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    minLength="6"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  <FaSave /> {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'account' && (
            <div className="danger-zone">
              <div className="form-section">
                <h2>Delete Account</h2>
                <p className="section-description danger-text">
                  Once you delete your account, there is no going back. All your posts, comments, and data will be permanently deleted.
                </p>

                <button className="danger-btn" onClick={handleDeleteAccount} disabled={saving}>
                  <FaTrash /> {saving ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
