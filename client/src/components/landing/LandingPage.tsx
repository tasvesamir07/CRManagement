import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Megaphone, MessageSquare, ClipboardList, ArrowRight, BookOpen, 
  Sparkles, CheckCircle2, Zap, ShieldCheck, Layers, Radio, Globe, Calendar, Users
} from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Platform Broadcast',
    badge: 'Instant Sync',
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400',
    borderColor: 'hover:border-emerald-500/40',
    description: 'Dispatch class announcements to WhatsApp Groups, Telegram Channels, and Messenger simultaneously from one central hub.',
  },
  {
    icon: Megaphone,
    title: 'Rich Notice Editor',
    badge: 'Tiptap Powered',
    color: 'from-indigo-500/20 to-purple-500/10 text-indigo-400',
    borderColor: 'hover:border-indigo-500/40',
    description: 'Compose high-impact notices with rich markdown formatting, embedded images, file attachments, and customizable design templates.',
  },
  {
    icon: ClipboardList,
    title: 'Class & Attendance Hub',
    badge: 'Smart Tracker',
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400',
    borderColor: 'hover:border-cyan-500/40',
    description: 'Effortlessly track routine schedules, student records, daily attendance, room changes, and exam countdowns in real time.',
  },
  {
    icon: BookOpen,
    title: 'Resource Cloud & Sync',
    badge: 'Offline Drafts',
    color: 'from-purple-500/20 to-pink-500/10 text-purple-400',
    borderColor: 'hover:border-purple-500/40',
    description: 'Share PDFs, slides, and study notes directly with batchmates. Draft announcements offline with automatic background sync.',
  },
];

const stats = [
  { label: 'Platform Delivery Rate', value: '99.9%', icon: ShieldCheck },
  { label: 'Broadcasting Speed', value: '< 2 Sec', icon: Zap },
  { label: 'Supported Channels', value: 'WhatsApp + Telegram + Messenger', icon: Radio },
  { label: 'Class Operations', value: '100% Unified', icon: Layers },
];

const LandingPage = () => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'editor' | 'schedule'>('broadcast');

  return (
    <div className="min-h-screen bg-canvas cyber-grid text-ink relative overflow-hidden transition-colors duration-300">
      {/* Ambient Futuristic Background Light Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[140px] pointer-events-none animate-float-slow"></div>
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-accent-violet/20 rounded-full blur-[160px] pointer-events-none animate-float-reverse"></div>
      <div className="absolute bottom-[-10%] left-[30%] w-[550px] h-[550px] bg-accent-cyan/15 rounded-full blur-[150px] pointer-events-none animate-pulse-glow"></div>

      {/* Top Floating Glass Header */}
      <header className="sticky top-4 z-50 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="glass-panel rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-2xl backdrop-blur-xl border border-white/20 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-emerald-400 to-accent-cyan flex items-center justify-center text-on-primary font-extrabold text-lg shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                CR
              </div>
              <div className="absolute -inset-1 bg-primary/30 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-300 pointer-events-none"></div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-ink flex items-center gap-1.5">
                CR Dashboard
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold">
                  v2.0 PRO
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-ink-mute hover:text-ink transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="relative group inline-flex items-center text-sm font-semibold bg-gradient-to-r from-primary via-primary-deep to-accent-violet text-on-dark px-5 py-2.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200"
            >
              <span>Get Started</span>
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
        <section className="text-center animate-slide-up">
          {/* Futuristic Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-primary/30 text-xs font-semibold text-ink mb-8 shadow-inner hover:border-primary/60 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="gradient-text font-bold">NEXT-GEN CLASS ANNOUNCEMENT ECOSYSTEM</span>
          </div>

          {/* Main Title */}
          <h1 className="text-display-xxl text-ink max-w-4xl mx-auto tracking-tight font-extrabold">
            Course Announcements,{' '}
            <span className="gradient-text drop-shadow-sm">Reimagined for the Future</span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-ink-mute max-w-2xl mx-auto leading-relaxed font-normal">
            Broadcast class notices to WhatsApp, Telegram, and Messenger simultaneously in seconds. 
            Built for Class Representatives with real-time multi-channel delivery and routine tracking.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan text-on-primary text-base font-bold rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span>Launch Dashboard Free</span>
              <ArrowRight className="ml-2.5 w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 glass-panel text-base font-semibold text-ink rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 hover:border-primary/40 transition-all duration-200"
            >
              <span>Access Existing Account</span>
            </Link>
          </div>
        </section>

        {/* Live Glass Mockup / Feature Interactive Preview */}
        <section className="mt-16 sm:mt-24 animate-slide-up">
          <div className="relative rounded-3xl p-1 bg-gradient-to-r from-primary/40 via-accent-violet/40 to-accent-cyan/40 shadow-2xl">
            <div className="glass-panel rounded-[22px] p-6 sm:p-10 backdrop-blur-2xl bg-canvas/80 relative overflow-hidden">
              {/* Interactive Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="ml-2 text-xs font-mono text-ink-mute">LIVE BROADCAST CONSOLE</span>
                </div>

                <div className="flex items-center gap-2 bg-canvas-soft p-1.5 rounded-xl border border-hairline">
                  <button
                    onClick={() => setActiveTab('broadcast')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'broadcast'
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    Multi-Broadcast
                  </button>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'editor'
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    Tiptap Editor
                  </button>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'schedule'
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    Schedules & Rooms
                  </button>
                </div>
              </div>

              {/* Dynamic Tab Content Preview */}
              {activeTab === 'broadcast' && (
                <div className="grid md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-4">
                    <div className="glass-card rounded-2xl p-5 border border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold">
                          CSE-301 • ALGORITHMS
                        </span>
                        <span className="text-xs text-ink-mute flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Live Sync Active
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-ink mb-2">📢 Midterm Exam Routine & Syllabus Update</h4>
                      <p className="text-sm text-ink-mute leading-relaxed">
                        Attention class! The exam has been scheduled for Thursday 10:00 AM in Room 402. Please review chapters 3 & 4.
                      </p>
                      <div className="mt-4 pt-4 border-t border-hairline flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-canvas-soft text-ink-secondary font-medium">📎 syllabus_v2.pdf</span>
                        <span className="px-2.5 py-1 rounded-lg bg-canvas-soft text-ink-secondary font-medium">📊 marks_distribution.xlsx</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-ink-mute mb-2">Connected Targets</div>
                    
                    <div className="glass-card rounded-xl p-3.5 flex items-center justify-between border-l-4 border-l-[#25D366]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 flex items-center justify-center">
                          <FaWhatsapp className="w-4 h-4 text-[#25D366]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">WhatsApp Batch Group</div>
                          <div className="text-[10px] text-ink-mute">Status: Sent (48 members)</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">DELIVERED</span>
                    </div>

                    <div className="glass-card rounded-xl p-3.5 flex items-center justify-between border-l-4 border-l-[#0088CC]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0088CC]/15 flex items-center justify-center">
                          <FaTelegram className="w-4 h-4 text-[#0088CC]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">Telegram Notice Channel</div>
                          <div className="text-[10px] text-ink-mute">Status: Sent (62 subscribers)</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">DELIVERED</span>
                    </div>

                    <div className="glass-card rounded-xl p-3.5 flex items-center justify-between border-l-4 border-l-[#00B2FF]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00B2FF]/15 flex items-center justify-center">
                          <FaFacebookMessenger className="w-4 h-4 text-[#00B2FF]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">Messenger Group Chat</div>
                          <div className="text-[10px] text-ink-mute">Status: Sent (35 members)</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">DELIVERED</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'editor' && (
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-6 border border-accent-violet/30">
                    <div className="flex items-center gap-2 mb-4 text-xs text-ink-mute border-b border-hairline pb-3">
                      <span className="font-bold text-ink">Formatting Toolbar:</span>
                      <span className="px-2 py-1 bg-canvas-soft rounded font-bold text-ink">B</span>
                      <span className="px-2 py-1 bg-canvas-soft rounded italic font-bold text-ink">I</span>
                      <span className="px-2 py-1 bg-canvas-soft rounded underline font-bold text-ink">U</span>
                      <span className="px-2 py-1 bg-canvas-soft rounded font-mono text-ink">&lt;&gt;</span>
                      <span className="px-2 py-1 bg-primary/10 text-primary font-semibold rounded ml-auto">✨ Smart Templates</span>
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2">Class Schedule Adjustment & Make-up Class Announcement</h3>
                    <p className="text-sm text-ink-mute leading-relaxed">
                      Dear Students, please note that tomorrow's <strong>Database Management Systems</strong> lecture has been shifted from 11:00 AM to <strong>2:00 PM</strong> in <em>Building B, Lab 3</em>.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="glass-card p-4 rounded-xl border border-cyan-500/20">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
                      <Calendar className="w-4 h-4" /> Today's Routine
                    </div>
                    <div className="text-sm font-bold text-ink">Software Engineering</div>
                    <div className="text-xs text-ink-mute">09:00 AM - 10:30 AM • Room 301</div>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                      <Users className="w-4 h-4" /> Attendance Tracker
                    </div>
                    <div className="text-sm font-bold text-ink">45 / 48 Present</div>
                    <div className="text-xs text-ink-mute">93.7% Attendance Rate</div>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-2">
                      <Globe className="w-4 h-4" /> Exam Countdown
                    </div>
                    <div className="text-sm font-bold text-ink">Final Exams in 12 Days</div>
                    <div className="text-xs text-ink-mute">Routine Published</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 animate-slide-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-display-lg text-ink font-extrabold tracking-tight">
              Engineered for Ultimate Efficiency
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ink-mute">
              Everything Class Representatives need to keep batchmates informed without repeated copy-pasting.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`glass-card rounded-2xl p-6 relative group border ${feature.borderColor} transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-inner`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-canvas-soft text-ink-mute border border-hairline">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-mute leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* High Tech Stats Section */}
        <section className="pb-20">
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-ink gradient-text">
                      {item.value}
                    </div>
                    <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="pb-24 animate-slide-up">
          <div className="relative rounded-3xl p-1 bg-gradient-to-r from-primary via-emerald-400 to-accent-violet shadow-2xl overflow-hidden">
            <div className="glass-panel rounded-[22px] px-8 py-14 sm:py-16 text-center backdrop-blur-2xl bg-canvas/90">
              <h2 className="text-display-md text-ink font-extrabold max-w-xl mx-auto">
                Ready to Upgrade Your Class Representation?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-ink-mute max-w-md mx-auto">
                Join Class Representatives managing their course routines, notices, and student updates from one powerful dashboard.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary via-emerald-400 to-accent-cyan text-on-primary text-base font-bold rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all duration-200"
                >
                  Create Free CR Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Futuristic Glass Footer */}
      <footer className="relative z-10 border-t border-hairline py-8 backdrop-blur-md bg-canvas/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold text-xs">
              CR
            </div>
            <span className="text-xs font-bold text-ink">CR Announcement Dashboard</span>
          </div>
          <p className="text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} CR Announcement Dashboard. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-mute">
            <Link to="/login" className="hover:text-primary transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-primary transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;