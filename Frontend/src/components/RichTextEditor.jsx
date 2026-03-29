import React, { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { 
  FaBold, FaItalic, FaStrikethrough, FaCode, FaListUl, FaListOl, 
  FaQuoteRight, FaUndo, FaRedo, FaLink, FaImage, FaHeading
} from 'react-icons/fa'
import { supabase } from '../supabaseClient'
import { toast } from 'react-toastify'
import './RichTextEditor.css'

const RichTextEditor = ({ content, onChange }) => {
  const fileInputRef = useRef(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Remove the default Link extension from StarterKit
        // to avoid conflicts with our custom Link configuration
      }),
      Placeholder.configure({
        placeholder: 'Start writing your blog post...'
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image'
        }
      })
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none'
      }
    },
    autofocus: 'start' // Focus at the beginning of the content
  })

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      toast.info('Uploading image...')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to upload images')
        return
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `content-images/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath)

      // Insert image into editor
      editor.chain().focus().setImage({ src: publicUrl }).run()
      toast.success('Image uploaded successfully!')

    } catch (error) {
      console.error('Error uploading image:', error)
      
      if (error.message?.includes('Bucket not found')) {
        toast.error('Storage bucket not found. Please create "blog-images" bucket in Supabase Storage.')
      } else if (error.message?.includes('permission')) {
        toast.error('Permission denied. Please check storage policies.')
      } else {
        toast.error('Failed to upload image. Please try again.')
      }
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const addImage = () => {
    // Trigger file input click
    fileInputRef.current?.click()
  }

  const setHeading = (level) => {
    editor.chain().focus().toggleHeading({ level }).run()
  }

  return (
    <div className="rich-text-editor">
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
      
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold"
            type="button"
          >
            <FaBold />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic"
            type="button"
          >
            <FaItalic />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title="Strikethrough"
            type="button"
          >
            <FaStrikethrough />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active' : ''}
            title="Inline Code"
            type="button"
          >
            <FaCode />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            onClick={() => setHeading(1)}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            title="Heading 1"
            type="button"
          >
            H1
          </button>
          <button
            onClick={() => setHeading(2)}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            title="Heading 2"
            type="button"
          >
            H2
          </button>
          <button
            onClick={() => setHeading(3)}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            title="Heading 3"
            type="button"
          >
            H3
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
            type="button"
          >
            <FaListUl />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Ordered List"
            type="button"
          >
            <FaListOl />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Quote"
            type="button"
          >
            <FaQuoteRight />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            onClick={addLink}
            className={editor.isActive('link') ? 'is-active' : ''}
            title="Add Link"
            type="button"
          >
            <FaLink />
          </button>
          <button
            onClick={addImage}
            title="Add Image"
            type="button"
          >
            <FaImage />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
            type="button"
          >
            <FaUndo />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
            type="button"
          >
            <FaRedo />
          </button>
        </div>
      </div>

      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}

export default RichTextEditor
