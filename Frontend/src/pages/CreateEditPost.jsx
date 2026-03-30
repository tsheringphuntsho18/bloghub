import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import DashboardHeader from '../components/DashboardHeader'
const RichTextEditor = React.lazy(() => import('../components/RichTextEditor'))
import slugify from 'slugify'
import { FaSave, FaEye, FaTimes, FaImage } from 'react-icons/fa'
import './CreateEditPost.css'

const CreateEditPost = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    checkUserAndLoadData()
  }, [id])

  const checkUserAndLoadData = async () => {
    try {
      console.log('Checking user...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('User:', user)
      
      if (!user) {
        console.log('No user found, redirecting to login')
        navigate('/login')
        return
      }

      setUser(user)

      if (isEditMode) {
        console.log('Loading post for editing...')
        await loadPost(id, user)
      }
      
      console.log('Done loading!')
    } catch (error) {
      console.error('Error:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadPost = async (postId, currentUser) => {
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) throw error

      if (post.user_id !== currentUser.id) {
        toast.error('You do not have permission to edit this post')
        navigate('/my-posts')
        return
      }

      setTitle(post.title)
      setSlug(post.slug)
      setContent(post.content)
      setExcerpt(post.excerpt || '')
      setCoverImage(post.cover_image || '')
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Failed to load post')
      navigate('/my-posts')
    }
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    
    // Auto-generate slug from title
    const newSlug = slugify(newTitle, { 
      lower: true, 
      strict: true,
      remove: /[*+~.()'"!:@]/g 
    })
    setSlug(newSlug)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      setCoverImageFile(file)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setCoverImage(previewUrl)
    }
  }

  const uploadCoverImage = async () => {
    if (!coverImageFile) return coverImage

    try {
      setUploadingImage(true)

      // Create unique filename
      const fileExt = coverImageFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `covers/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, coverImageFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      
      if (error.message?.includes('Bucket not found')) {
        toast.error('Storage bucket not found. Please create "blog-images" bucket in Supabase Storage.')
      } else if (error.message?.includes('permission')) {
        toast.error('Permission denied. Please check storage policies.')
      } else {
        toast.error('Failed to upload cover image. Please try again.')
      }
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200
    const words = text.trim().split(/\s+/).length
    return Math.ceil(words / wordsPerMinute)
  }

  const handleSave = async (publishNow = false) => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!content.trim()) {
      toast.error('Please write some content')
      return
    }

    setSaving(true)

    try {
      // Upload cover image if there's a new one
      let finalCoverImage = coverImage
      if (coverImageFile) {
        const uploadedUrl = await uploadCoverImage()
        if (uploadedUrl) {
          finalCoverImage = uploadedUrl
        }
      }

      const readingTime = calculateReadingTime(content)
      const postStatus = publishNow ? 'published' : 'draft'

      const postData = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || content.substring(0, 200) + '...',
        cover_image: finalCoverImage || null,
        status: postStatus,
        reading_time: readingTime,
        user_id: user.id,
        published_at: publishNow && !isEditMode ? new Date().toISOString() : undefined
      }

      let postId = id

      if (isEditMode) {
        // Update existing post
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', id)

        if (error) throw error
      } else {
        // Create new post
        const { data, error } = await supabase
          .from('posts')
          .insert([postData])
          .select()
          .single()

        if (error) throw error
        postId = data.id
      }

      toast.success(
        publishNow 
          ? 'Post published successfully!' 
          : isEditMode 
            ? 'Post updated successfully!' 
            : 'Post saved as draft!'
      )
      
      navigate('/my-posts')
    } catch (error) {
      console.error('Error saving post:', error)
      if (error.message.includes('duplicate key value violates unique constraint')) {
        toast.error('A post with this slug already exists. Please use a different slug.')
      } else {
        toast.error('Failed to save post. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    console.log('Loading state...')
    return (
      <div className="create-edit-post">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('No user after loading')
    return null
  }

  return (
    <div className="create-edit-post">
      <DashboardHeader user={user} />

      <div className="create-edit-post-container">
        <div className="post-form">
          <div className="form-main">
            {/* Cover Image Upload - At the top */}
            <div className="form-group cover-image-group">
              <label>
                <FaImage /> Cover Image
              </label>
              <div className="image-upload-area">
                <input
                  type="file"
                  id="cover-image-upload"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="cover-image-upload" className="upload-btn">
                  <FaImage /> Choose Image
                </label>
                <span className="upload-hint">JPG, PNG, or GIF. Max size 5MB</span>
              </div>
              {coverImage && (
                <div className="image-preview">
                  <img src={coverImage} alt="Cover preview" />
                  <button 
                    className="remove-image-btn"
                    onClick={() => {
                      setCoverImage('')
                      setCoverImageFile(null)
                    }}
                  >
                    <FaTimes /> Remove
                  </button>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="form-group">
              <label>
                Title <span className="required">*</span>
              </label>
              <input
                type="text"
                className="title-input"
                placeholder="Enter your post title..."
                value={title}
                onChange={handleTitleChange}
              />
            </div>

            {/* Rich Text Editor */}
            <div className="form-group content-group">
              <label>
                Content <span className="required">*</span>
              </label>
              <React.Suspense fallback={<div>Loading editor...</div>}>
                <RichTextEditor 
                  content={content}
                  onChange={setContent}
                />
              </React.Suspense>
            </div>

            {/* Excerpt */}
            <div className="form-group">
              <label>Excerpt (Optional)</label>
              <textarea
                className="excerpt-textarea"
                placeholder="Brief description of your post..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value.slice(0, 200))}
                rows="3"
              />
              <small>{excerpt.length}/200 characters</small>
            </div>

            {/* Action Buttons - At the bottom */}
            <div className="form-actions-bottom">
              <button 
                className="btn-secondary"
                onClick={() => handleSave(false)}
                disabled={saving || uploadingImage}
              >
                <FaSave /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button 
                className="btn-primary"
                onClick={() => handleSave(true)}
                disabled={saving || uploadingImage}
              >
                <FaEye /> {saving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateEditPost
