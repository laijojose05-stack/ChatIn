import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Image as ImageIcon,
  CheckCheck,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Smile,
  Paperclip,
  Bell,
  Smartphone,
  Palette,
  Reply,
  Edit3,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import '../landing.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  const coreFeatures = [
    {
      icon: <MessageSquare size={22} className="text-primary" />,
      title: 'Instant 1-on-1 Messaging',
      desc: 'Seamless private conversations with real-time delivery, live typing status, and read receipts.',
      badge: 'Real-Time',
    },
    {
      icon: <Users size={22} className="text-success" />,
      title: 'Group Channels & Communities',
      desc: 'Create multi-person channels for friends or teams with custom descriptions, member management, and admin roles.',
      badge: 'Collaboration',
    },
    {
      icon: <Search size={22} className="text-info" />,
      title: 'Privacy-First Handle Search',
      desc: 'Connect with people by exact @username handle without ever having to share personal phone numbers.',
      badge: 'Privacy',
    },
    {
      icon: <ImageIcon size={22} className="text-warning" />,
      title: 'Rich Media & File Sharing',
      desc: 'Exchange high-res photos, documents, and files seamlessly with instant inline previews and downloads.',
      badge: 'Media',
    },
    {
      icon: <Reply size={22} className="text-primary" />,
      title: 'Quoted Replies & Message Editing',
      desc: 'Reply directly to specific messages in a thread, edit sent messages in-line, or delete messages on demand.',
      badge: 'Controls',
    },
    {
      icon: <Palette size={22} className="text-danger" />,
      title: 'High-Contrast Themes & Profiles',
      desc: 'Comfortable day and night viewing with crisp Light and AMOLED Dark modes, custom avatars, and bio statuses.',
      badge: 'Personalized',
    },
  ];

  return (
    <div className="chatin-original-landing min-vh-100 d-flex flex-column">
      {/* Background Ambient Glow Spheres */}
      <div className="chatin-glow-sphere sphere-top-left" />
      <div className="chatin-glow-sphere sphere-mid-right" />

      {/* 1. Header Navigation */}
      <header className="chatin-header-wrap">
        <div className="container-xl">
          <nav className="chatin-floating-nav d-flex align-items-center justify-content-between p-3 px-4 rounded-pill shadow-lg">
            {/* Logo */}
            <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
              <div className="chatin-logo-badge">
                <img src="/logo.svg" alt="ChatIn" width={28} height={28} />
              </div>
              <span className="chatin-brand-name">
                Chat<span className="chatin-brand-accent">In</span>
              </span>
            </Link>

            {/* Middle Nav Links */}
            <div className="d-none d-md-flex align-items-center gap-4 chatin-nav-links">
              <a href="#features" className="chatin-nav-anchor">App Features</a>
              <a href="#messaging" className="chatin-nav-anchor">Direct Chat</a>
              <a href="#groups" className="chatin-nav-anchor">Group Hubs</a>
              <a href="#privacy" className="chatin-nav-anchor">Privacy</a>
            </div>

            {/* Actions */}
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn-icon"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={18} className="text-warning" /> : <Moon size={18} />}
              </button>

              {isAuthenticated ? (
                <button
                  className="btn chatin-btn-gradient rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                  onClick={() => navigate('/chat')}
                >
                  <span>Open Chat</span>
                  <ArrowRight size={15} />
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn chatin-btn-ghost rounded-pill px-3 py-2 fw-semibold small d-none d-sm-inline-block"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn chatin-btn-gradient rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-1.5"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={15} />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="chatin-hero-section position-relative">
        <div className="container-xl text-center">
          {/* Badge */}
          <div className="mb-4">
            <span className="chatin-live-badge">
              <span className="chatin-pulse-dot" />
              <span>Modern Real-Time Messaging App</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="chatin-hero-title mx-auto mb-4">
            Conversations that flow.{' '}
            <span className="chatin-gradient-headline">Built for clarity and connection.</span>
          </h1>

          <p className="chatin-hero-desc mx-auto mb-5">
            A fast, beautiful chat workspace for 1-on-1 private messaging, active group channels, rich file sharing, and effortless discovery.
          </p>

          {/* Primary Action Buttons */}
          <div className="d-flex flex-wrap justify-content-center gap-3 mb-5">
            <Link
              to={isAuthenticated ? '/chat' : '/register'}
              className="btn chatin-btn-gradient rounded-pill px-5 py-3 fw-bold d-flex align-items-center gap-2 shadow-lg"
              style={{ fontSize: 'var(--text-base)' }}
            >
              <span>{isAuthenticated ? 'Open Messages' : 'Start Chatting — Free'}</span>
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="btn chatin-btn-glass rounded-pill px-4 py-3 fw-semibold d-flex align-items-center gap-2"
              style={{ fontSize: 'var(--text-base)' }}
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* App UI Showcase Card */}
          <div className="chatin-hero-preview-wrap mx-auto mt-2 mb-5">
            <div className="chatin-preview-window shadow-lg rounded-4 overflow-hidden border">
              {/* Window Bar */}
              <div className="p-3 d-flex align-items-center justify-content-between border-bottom" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="dot red" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span className="dot yellow" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <span className="dot green" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <span className="ms-2 fw-semibold small text-subtle">ChatIn Messenger Workspace</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-pill bg-success-subtle text-success small px-2.5 py-1">
                    ● Connected & Online
                  </span>
                </div>
              </div>

              {/* Chat Interface Mockup */}
              <div className="row g-0 text-start" style={{ height: '360px', backgroundColor: 'var(--bg-chat)' }}>
                {/* Sidebar Preview */}
                <div className="col-4 border-end d-none d-md-flex flex-column p-3" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-default)' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-semibold small">Chats</span>
                    <span className="badge rounded-pill bg-primary px-2 text-white" style={{ fontSize: '10px' }}>3 New</span>
                  </div>
                  <div className="d-flex flex-column gap-2 overflow-hidden">
                    <div className="p-2.5 rounded-2 d-flex align-items-center gap-2" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        AK
                      </div>
                      <div className="overflow-hidden flex-grow-1">
                        <div className="fw-semibold small text-truncate">Alex Kim</div>
                        <div className="text-subtle text-truncate" style={{ fontSize: '11px' }}>Sent the project review files</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2 d-flex align-items-center gap-2" style={{ opacity: 0.75 }}>
                      <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        DG
                      </div>
                      <div className="overflow-hidden flex-grow-1">
                        <div className="fw-semibold small text-truncate">Design Team (Channel)</div>
                        <div className="text-subtle text-truncate" style={{ fontSize: '11px' }}>Elena: Meeting at 3pm!</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversation Preview */}
                <div className="col-12 col-md-8 d-flex flex-column h-100 p-3 p-md-4">
                  <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '34px', height: '34px', fontSize: '12px' }}>
                        AK
                      </div>
                      <div>
                        <div className="fw-semibold small">Alex Kim</div>
                        <div className="text-success fw-medium" style={{ fontSize: '11px' }}>Active now</div>
                      </div>
                    </div>
                    <CheckCheck size={16} className="text-primary" />
                  </div>

                  {/* Messages Feed Mockup */}
                  <div className="flex-grow-1 d-flex flex-column justify-content-end gap-2.5 pb-3">
                    <div className="d-flex justify-content-start">
                      <div className="p-2.5 px-3 rounded-3 small" style={{ backgroundColor: 'var(--bubble-incoming)', color: 'var(--bubble-incoming-text)', border: '1px solid var(--bubble-incoming-border)', maxWidth: '75%' }}>
                        Hey! Did you get a chance to see the new channel updates?
                        <div className="text-end text-subtle mt-1" style={{ fontSize: '10px' }}>10:42 AM</div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end">
                      <div className="p-2.5 px-3 rounded-3 small" style={{ backgroundColor: 'var(--bubble-outgoing)', color: 'var(--bubble-outgoing-text)', border: '1px solid var(--bubble-outgoing-border)', maxWidth: '75%' }}>
                        Yes! The instant message replies and file sharing are working smoothly 🚀
                        <div className="d-flex align-items-center justify-content-end gap-1 text-end mt-1" style={{ fontSize: '10px', opacity: 0.85 }}>
                          <span>10:43 AM</span>
                          <CheckCheck size={12} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Composer Mockup */}
                  <div className="p-2 px-3 rounded-3 border d-flex align-items-center gap-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                    <Smile size={18} className="text-subtle" />
                    <Paperclip size={18} className="text-subtle" />
                    <input type="text" className="form-control border-0 p-1 bg-transparent small" placeholder="Type a message..." disabled style={{ fontSize: '13px' }} />
                    <button className="btn btn-primary-action btn-sm rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core App Features Grid */}
      <section id="features" className="py-5 position-relative">
        <div className="container-xl py-4">
          <div className="text-center mb-5">
            <span className="chatin-eyebrow text-uppercase fw-bold">Everything You Need</span>
            <h2 className="chatin-section-title mt-2">App Features Built for Seamless Messaging</h2>
            <p className="text-secondary small mx-auto" style={{ maxWidth: '520px', lineHeight: '1.6' }}>
              Every feature is designed to make staying in touch effortless, responsive, and private.
            </p>
          </div>

          <div className="row g-4">
            {coreFeatures.map((feat, idx) => (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className="chatin-feature-card h-100 p-4 rounded-3 shadow-sm d-flex flex-column">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="chatin-icon-box">
                      {feat.icon}
                    </div>
                    <span className="badge rounded-pill bg-primary-subtle text-primary" style={{ fontSize: '11px' }}>
                      {feat.badge}
                    </span>
                  </div>
                  <h5 className="fw-semibold mb-2" style={{ fontSize: 'var(--text-md)', letterSpacing: '-0.01em' }}>
                    {feat.title}
                  </h5>
                  <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Deep-Dive Feature: Direct Chats & Controls */}
      <section id="messaging" className="py-5 position-relative border-top" style={{ borderColor: 'var(--border-default)' }}>
        <div className="container-xl py-3">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="chatin-eyebrow text-uppercase fw-bold">Direct Messaging</span>
              <h2 className="chatin-section-title mt-2 mb-3">Fast, Fluid 1-on-1 Conversations</h2>
              <p className="text-secondary mb-4" style={{ lineHeight: '1.6', fontSize: 'var(--text-base)' }}>
                Experience private chats with instantaneous delivery. Keep up with who is typing and see exactly when your messages have been delivered and read.
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div className="chatin-icon-box flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                    <CheckCheck size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="fw-semibold small">Read Receipts & Double Checks</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>See real-time single check (sent), double checks (delivered), and blue checks (read).</div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="chatin-icon-box flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                    <Edit3 size={18} className="text-success" />
                  </div>
                  <div>
                    <div className="fw-semibold small">Edit Sent Messages & In-Line Reply</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Made a typo? Edit sent messages on the fly or quote any message in the chat with a single click.</div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="chatin-icon-box flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                    <Bell size={18} className="text-warning" />
                  </div>
                  <div>
                    <div className="fw-semibold small">Instant Sound Alerts & Push Notifications</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Subtle audio chimes and native browser notifications keep you informed when you receive messages.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-4 rounded-3 border shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="fw-semibold small">Message Actions Preview</div>
                  <span className="badge rounded-pill bg-primary text-white" style={{ fontSize: '10px' }}>In-Chat Controls</span>
                </div>
                <div className="p-3 rounded-2 mb-3" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="text-subtle mb-1" style={{ fontSize: '11px' }}>Quoted Reply Banner</div>
                  <div className="border-start border-2 border-primary ps-2 small">
                    <span className="fw-semibold text-primary">Replying to @laijojose:</span>{' '}
                    <span className="text-secondary">Let's review the new design files.</span>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between p-2 rounded-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                  <span className="small text-secondary">Hover on any message to reveal action toolbar</span>
                  <div className="d-flex gap-1">
                    <button className="btn-icon p-1" title="Reply"><Reply size={14} /></button>
                    <button className="btn-icon p-1" title="Edit"><Edit3 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Deep-Dive Feature: Group Channels & Admin Management */}
      <section id="groups" className="py-5 position-relative border-top" style={{ borderColor: 'var(--border-default)' }}>
        <div className="container-xl py-3">
          <div className="row align-items-center g-5 flex-lg-row-reverse">
            <div className="col-lg-6">
              <span className="chatin-eyebrow text-uppercase fw-bold">Group Collaboration</span>
              <h2 className="chatin-section-title mt-2 mb-3">Group Channels with Admin Control</h2>
              <p className="text-secondary mb-4" style={{ lineHeight: '1.6', fontSize: 'var(--text-base)' }}>
                Bring friends, project collaborators, or community members together. Manage participants, assign admin privileges, and browse shared files in one place.
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div className="chatin-icon-box flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                    <Users size={18} className="text-success" />
                  </div>
                  <div>
                    <div className="fw-semibold small">Multi-Member Channels</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Organize conversations by group with custom channel names, descriptions, and avatars.</div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="chatin-icon-box flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                    <ShieldCheck size={18} className="text-info" />
                  </div>
                  <div>
                    <div className="fw-semibold small">Admin Privileges & Member Controls</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Promote members to admins, remove participants, or update channel information anytime.</div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <div className="chatin-icon-box flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                    <ImageIcon size={18} className="text-warning" />
                  </div>
                  <div>
                    <div className="fw-semibold small">Collapsible Information & Media Panel</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Access all shared photos, documents, and participant rosters in a dedicated 3rd-pane sidebar.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-4 rounded-3 border shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                      PC
                    </div>
                    <div>
                      <div className="fw-semibold small">Product Core Channel</div>
                      <div className="text-subtle" style={{ fontSize: '11px' }}>6 participants</div>
                    </div>
                  </div>
                  <span className="badge rounded-pill bg-success-subtle text-success small px-2.5 py-1">Active Group</span>
                </div>

                <div className="p-2.5 rounded-2 mb-2 d-flex align-items-center justify-content-between" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                      G
                    </div>
                    <div>
                      <div className="fw-semibold small">@gourinanda</div>
                      <div className="text-subtle" style={{ fontSize: '10px' }}>Channel Creator</div>
                    </div>
                  </div>
                  <span className="badge bg-primary rounded-pill text-white" style={{ fontSize: '10px' }}>Admin</span>
                </div>

                <div className="p-2.5 rounded-2 d-flex align-items-center justify-content-between" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-info text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                      L
                    </div>
                    <div>
                      <div className="fw-semibold small">@laijojose</div>
                      <div className="text-subtle" style={{ fontSize: '10px' }}>Member</div>
                    </div>
                  </div>
                  <span className="text-subtle" style={{ fontSize: '11px' }}>Participant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Privacy & Exact Handle Discovery */}
      <section id="privacy" className="py-5 position-relative border-top" style={{ borderColor: 'var(--border-default)' }}>
        <div className="container-xl py-3">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="chatin-eyebrow text-uppercase fw-bold">Privacy First</span>
              <h2 className="chatin-section-title mt-2 mb-3">Connect Safely by Exact Username</h2>
              <p className="text-secondary mb-4" style={{ lineHeight: '1.6', fontSize: 'var(--text-base)' }}>
                Your private phone number is never needed. Discover and initiate chats with other users strictly by their exact `@username` handle, keeping your personal contact details confidential.
              </p>

              <div className="p-3 rounded-2 border mb-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                <div className="fw-semibold small mb-1">Strict Exact-Match Discovery</div>
                <div className="text-secondary small" style={{ lineHeight: '1.5' }}>
                  No broad public listings or unwanted contact suggestions. Other users can only connect when entering your exact handle.
                </div>
              </div>

              <div className="p-3 rounded-2 border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                <div className="fw-semibold small mb-1">Presence Privacy Control</div>
                <div className="text-secondary small" style={{ lineHeight: '1.5' }}>
                  Choose whether to share your live online status and read receipts in your privacy settings at any time.
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-4 rounded-3 border shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                <div className="fw-semibold small mb-3">Find User by Handle Dialog</div>
                <div className="p-2.5 rounded-2 d-flex align-items-center gap-2 mb-3 border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
                  <Search size={15} className="text-subtle" />
                  <input type="text" className="form-control border-0 p-0 bg-transparent small" value="@laijojose" disabled style={{ fontSize: '13px' }} />
                  <span className="badge bg-primary text-white px-2 py-1" style={{ fontSize: '11px' }}>Exact Match</span>
                </div>
                <div className="p-3 rounded-2 d-flex align-items-center justify-content-between" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                  <div className="d-flex align-items-center gap-2.5">
                    <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
                      L
                    </div>
                    <div>
                      <div className="fw-semibold small">@laijojose</div>
                      <div className="text-subtle" style={{ fontSize: '11px' }}>Hey there! I am using ChatIn.</div>
                    </div>
                  </div>
                  <button className="btn btn-primary-action btn-sm px-3 rounded-pill" style={{ fontSize: '12px' }}>Start Chat</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Call to Action Banner */}
      <section className="py-5 my-4">
        <div className="container-xl">
          <div className="chatin-cta-banner p-5 rounded-4 shadow-lg text-center mx-auto position-relative overflow-hidden">
            <h2 className="display-6 fw-bold mb-3 text-white">Start messaging with ChatIn today</h2>
            <p className="text-white-50 mb-4 mx-auto" style={{ maxWidth: '480px', lineHeight: '1.6' }}>
              Create your account in seconds. Message friends, collaborate in group channels, and share files without distractions.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link
                to={isAuthenticated ? '/chat' : '/register'}
                className="btn chatin-btn-white rounded-pill px-5 py-3 fw-bold d-flex align-items-center gap-2"
              >
                <span>{isAuthenticated ? 'Open Chat Workspace' : 'Create Free Account'}</span>
                <ArrowRight size={16} />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="btn chatin-btn-ghost-white rounded-pill px-4 py-3 fw-semibold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. App Footer */}
      <footer className="chatin-footer py-4 border-top mt-auto">
        <div className="container-xl d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 text-secondary small">
          <div className="d-flex align-items-center gap-2">
            <img src="/logo.svg" alt="ChatIn" width={22} height={22} />
            <span className="fw-semibold" style={{ color: 'var(--text-primary)' }}>ChatIn</span>
            <span>— Real-Time Messaging Platform</span>
          </div>

          <div className="d-flex align-items-center gap-4">
            <a href="#features" className="text-decoration-none text-secondary">Features</a>
            <a href="#messaging" className="text-decoration-none text-secondary">Direct Chats</a>
            <a href="#groups" className="text-decoration-none text-secondary">Group Hubs</a>
            <a href="#privacy" className="text-decoration-none text-secondary">Privacy</a>
            <Link to="/chat" className="text-decoration-none text-primary fw-medium">Open App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
