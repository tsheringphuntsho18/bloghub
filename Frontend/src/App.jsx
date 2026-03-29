import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LandingPage from './components/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import MyPosts from './pages/MyPosts'
import CreateEditPost from './pages/CreateEditPost'
import ViewPost from './pages/ViewPost'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/create-post" element={<CreateEditPost />} />
          <Route path="/edit-post/:id" element={<CreateEditPost />} />
          <Route path="/post/:slug" element={<ViewPost />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  )
}

export default App

