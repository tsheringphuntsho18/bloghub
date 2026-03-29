import React from 'react'
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">
              <span className="logo-blog">Blog</span>
              <span className="logo-hub">hub</span>
            </h3>
            <div className="social-icons">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <FaGithub />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <FaLinkedin />
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#about">About Us</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Community</h4>
            <ul className="footer-links">
              <li><a href="#blog">Blog</a></li>
              <li><a href="#writers">Writers</a></li>
              <li><a href="#guidelines">Guidelines</a></li>
              <li><a href="#support">Support</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul className="footer-links">
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#cookies">Cookie Policy</a></li>
              <li><a href="#dmca">DMCA</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} Bloghub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
