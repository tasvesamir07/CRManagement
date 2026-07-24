import { Link } from 'react-router-dom';
import { Megaphone, MessageSquare, ClipboardList, ArrowRight, BookOpen } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Platform Broadcast',
    description: 'Send announcements to WhatsApp, Telegram, and Messenger simultaneously from a single dashboard.',
  },
  {
    icon: Megaphone,
    title: 'Rich Notice Editor',
    description: 'Compose beautiful announcements with Tiptap-powered formatting, images, and attachments.',
  },
  {
    icon: ClipboardList,
    title: 'Class Management',
    description: 'Manage courses, routines, attendance, student records, and exam schedules all in one place.',
  },
  {
    icon: BookOpen,
    title: 'File & Resource Sharing',
    description: 'Upload and share study materials, PDFs, and resources directly with your batchmates.',
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/[0.03] via-canvas to-accent-violet/[0.03] dark:from-primary/[0.08] dark:via-canvas dark:to-accent-violet/[0.08] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-accent-violet/5 rounded-full blur-3xl pointer-events-none translate-x-1/4 translate-y-1/4"></div>

      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-base">
            CR
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">CR Dashboard</span>
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
            className="inline-flex items-center text-sm font-medium bg-ink text-on-dark dark:bg-primary dark:text-on-primary px-4 py-2 rounded-sm hover:opacity-90 transition-all duration-150"
          >
            Get Started
            <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <section className="pt-20 sm:pt-32 pb-16 text-center animate-slide-up">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-sm bg-ink flex items-center justify-center text-primary font-bold text-3xl shadow-sm">
              CR
            </div>
          </div>
          <h1 className="text-display-xxl text-ink max-w-3xl mx-auto">
            Course Announcements,{' '}
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-ink-mute max-w-xl mx-auto leading-relaxed">
            Broadcast class notices to WhatsApp, Telegram, and Messenger — all from one dashboard. 
            Built for Class Representatives, by Class Representatives.
          </p>
          <div className="mt-8 sm:mt-10 flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center px-6 py-3 bg-ink text-on-dark dark:bg-primary dark:text-on-primary text-sm font-medium rounded-sm hover:opacity-90 transition-all duration-150 shadow-sm"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 border border-hairline text-sm font-medium text-ink rounded-sm hover:bg-canvas-soft transition-all duration-150"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="pb-24 animate-slide-up">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass-panel rounded-sm p-6 hover:bg-canvas/80 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink mb-2">{feature.title}</h3>
                  <p className="text-sm text-ink-mute leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-hairline py-6">
        <p className="text-center text-xs text-ink-faint">
          &copy; {new Date().getFullYear()} CR Announcement Dashboard
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;