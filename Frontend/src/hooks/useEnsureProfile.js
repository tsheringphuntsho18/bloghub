import { useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Custom hook to ensure user has a profile
 * Automatically creates a profile if one doesn't exist
 */
export const useEnsureProfile = (user) => {
  useEffect(() => {
    const ensureProfile = async () => {
      if (!user) return

      try {
        // Check if profile exists
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) {
          console.error('Error checking profile:', fetchError)
          return
        }

        // If profile doesn't exist, create it
        if (!profile) {
          console.log('Creating profile for user:', user.id)

          // Generate username from email or user metadata
          const baseUsername = user.user_metadata?.username || 
                              user.email?.split('@')[0] || 
                              'user'
          
          // Check if username already exists
          let username = baseUsername
          let attempts = 0
          let usernameExists = true

          while (usernameExists && attempts < 10) {
            const { data: existingUser } = await supabase
              .from('profiles')
              .select('id')
              .eq('username', username)
              .maybeSingle()

            if (!existingUser) {
              usernameExists = false
            } else {
              attempts++
              username = `${baseUsername}${Math.floor(Math.random() * 10000)}`
            }
          }

          // Create the profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              username: username,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || null,
              bio: null,
              website: null,
              twitter: null,
              github: null,
              linkedin: null
            }])

          if (insertError) {
            console.error('Error creating profile:', insertError)
          } else {
            console.log('Profile created successfully for:', username)
          }
        }
      } catch (error) {
        console.error('Error in ensureProfile:', error)
      }
    }

    ensureProfile()
  }, [user])
}

export default useEnsureProfile
