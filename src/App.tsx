import { ArrowRight, Check } from 'lucide-react';
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue
} from 'framer-motion';
import { useEffect, useRef, type MouseEvent } from 'react';
import ParticleHeadline from './components/ParticleHeadline';

const PRIMARY_TEXT = '#FED7AA';

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#experience' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' }
];

const introParagraphs = [
  'As a second-year student at the University of Sydney, I’m diving deep into the world of Advanced Computing. I’m passionate about crafting tailored digital solutions that seamlessly blend innovation with practicality.',
  'Currently, I’m sharpening my skills as a Cybersecurity Intern at INK IT Solutions in Melbourne, where I’m dedicated to safeguarding the digital frontier. A natural people person, I thrive on building connections and am always open to collaborating on projects that push the boundaries of what’s possible in tech.'
];

const experienceItems = [
  {
    number: '01',
    title: 'INK IT Solutions',
    role: 'Cybersecurity Intern',
    details: 'Melbourne, Australia (Remote)',
    description:
      'Dedicated to safeguarding the digital frontier and crafting tailored digital solutions.'
  },
  {
    number: '02',
    title: 'Pennant Technologies',
    role: 'Software Intern',
    details: 'Aug 2025 - Present · Remote',
    description:
      'Developing software solutions and gaining hands-on industry experience in a dynamic environment.'
  },
  {
    number: '03',
    title: 'Engineering Int. Students Assoc.',
    role: 'Professional & Academic Director',
    details: 'Oct 2025 - Present · Sydney, On-site',
    description:
      'Leading academic initiatives and professional development opportunities for international engineering students.'
  },
  {
    number: '04',
    title: 'Bush To Bridge Tutoring',
    role: 'Academic Tutor',
    details: 'Oct 2023 - Present · Remote',
    description:
      'Simplifying complex ideas and sparking a passion for technology in future innovators.'
  }
];

const educationItems = [
  {
    title: 'University of Sydney',
    description: 'Bachelor of Advanced Computing (2023 - 2027)',
    detail: 'Majors: Cybersecurity & Software Development'
  },
  {
    title: "The Women's College",
    description: 'Resident & Student Ambassador (2023 - 2024)',
    detail: ''
  }
];

type StyledSegment = {
  text: string;
  className?: string;
};

function handleNavEnter(event: MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.color = PRIMARY_TEXT;
}

function handleNavLeave(event: MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.color = 'rgba(254, 215, 170, 0.8)';
}

function WordsPullUpMultiStyle({
  segments,
  className = ''
}: {
  segments: StyledSegment[];
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const words = segments.flatMap((segment) =>
    segment.text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({
        word,
        className: segment.className ?? ''
      }))
  );

  return (
    <span
      ref={ref}
      className={`inline-flex flex-wrap justify-center ${className}`}
    >
      {words.map(({ word, className: wordClassName }, index) => (
        <motion.span
          className={`mr-[0.22em] inline-block ${wordClassName}`}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{
            delay: index * 0.08,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1]
          }}
          key={`${word}-${index}`}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function AnimatedLetter({
  letter,
  index,
  totalChars,
  scrollYProgress
}: {
  letter: string;
  index: number;
  totalChars: number;
  scrollYProgress: MotionValue<number>;
}) {
  const charProgress = index / totalChars;
  const opacity = useTransform(
    scrollYProgress,
    [Math.max(0, charProgress - 0.1), Math.min(1, charProgress + 0.05)],
    [0.35, 1]
  );

  return (
    <motion.span style={{ opacity }} className="inline">
      {letter}
    </motion.span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase text-primary sm:text-xs">
      {children}
    </div>
  );
}

function Hero() {
  return (
    <section
      className="h-screen bg-ink p-4 md:p-6"
      aria-label="Rutika Bhasme hero"
    >
      <div className="relative h-full overflow-hidden rounded-2xl bg-ink md:rounded-[2rem]">
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center px-2">
          <nav
            className="w-[calc(100%-0.5rem)] max-w-fit overflow-hidden rounded-b-2xl bg-ink px-4 py-2 sm:w-auto md:rounded-b-3xl md:px-8"
            aria-label="Primary navigation"
          >
            <ul className="flex items-center justify-center gap-5 text-[10px] sm:gap-8 sm:text-xs md:gap-12 md:text-sm">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="whitespace-nowrap transition-colors duration-300"
                    style={{ color: 'rgba(254, 215, 170, 0.8)' }}
                    onMouseEnter={handleNavEnter}
                    onMouseLeave={handleNavLeave}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="absolute inset-x-0 top-0 z-10 px-5 pt-14 sm:px-6 sm:pt-16 md:px-8 md:pt-20 lg:px-10">
          {/* Sized in vw with nowrap so "rutika bhasme" always holds one line. */}
          <ParticleHeadline
            text="rutika bhasme"
            showAsterisk
            className="whitespace-nowrap text-center text-[10.5vw] font-bold leading-[0.9] text-primary"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 sm:px-6 sm:pb-8 md:px-8 md:pb-8 lg:px-10">
          <div className="grid items-end gap-5 md:grid-cols-12 md:gap-6">
            <div className="max-w-xl md:col-span-4 md:col-start-9 md:pb-3 lg:pb-6">
              <motion.p
                className="text-sm leading-[1.25] text-primary/85 sm:text-base md:text-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.5,
                  duration: 0.85,
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                Advanced Computing Student based in Sydney. Cybersecurity &
                Software Development Major.
              </motion.p>
              <motion.a
                href="mailto:bhasmerutika@gmail.com?subject=Inquiry%20from%20Portfolio&body=Hi%20Rue,%0A%0AI'd%20like%20to%20get%20in%20touch%20regarding..."
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-primary py-1.5 pl-5 pr-1.5 text-sm font-medium text-ink transition-[gap] duration-300 hover:gap-3 sm:text-base"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.7,
                  duration: 0.85,
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                <span>Get in Touch</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                </span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  const textRef = useRef<HTMLDivElement>(null);
  const revealText = introParagraphs.join(' ');
  const { scrollYProgress } = useScroll({
    target: textRef,
    offset: ['start 0.8', 'end 0.2']
  });

  return (
    <section
      id="about"
      className="bg-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-6xl rounded-[1.5rem] bg-surface px-5 py-14 text-center sm:px-8 sm:py-20 md:py-24 lg:px-12">
        <SectionLabel>Intro</SectionLabel>
        <h2
          className="mx-auto mt-8 max-w-4xl text-3xl font-normal leading-[0.95] sm:text-4xl sm:leading-[0.9] md:text-5xl lg:text-6xl"
          style={{ color: PRIMARY_TEXT }}
        >
          <WordsPullUpMultiStyle
            segments={[
              { text: 'Advanced Computing student', className: 'font-normal' },
              {
                text: 'building practical digital solutions.',
                className: 'font-serif italic'
              }
            ]}
          />
        </h2>
        <div
          ref={textRef}
          className="mx-auto mt-10 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-primary sm:mt-12 md:text-base"
        >
          {revealText.split('').map((letter, index) => (
            <AnimatedLetter
              letter={letter}
              index={index}
              totalChars={revealText.length}
              scrollYProgress={scrollYProgress}
              key={`${letter}-${index}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Experience() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="experience"
      className="relative overflow-hidden bg-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28"
    >
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.13]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-[0.35fr_1fr] md:gap-12">
          <div>
            <SectionLabel>Work</SectionLabel>
            <h2
              className="mt-5 max-w-sm text-3xl font-normal leading-tight sm:text-4xl md:text-5xl"
              style={{ color: PRIMARY_TEXT }}
            >
              Experience built across security, software, and community.
            </h2>
          </div>
          <div ref={ref} className="grid gap-3">
            {experienceItems.map((item, index) => (
              <motion.article
                className="grid gap-5 rounded-[0.5rem] bg-surface2 p-5 sm:p-6 md:grid-cols-[0.18fr_1fr]"
                initial={{ scale: 0.98, opacity: 0, y: 16 }}
                animate={
                  isInView
                    ? { scale: 1, opacity: 1, y: 0 }
                    : { scale: 0.98, opacity: 0, y: 16 }
                }
                transition={{
                  delay: index * 0.12,
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1]
                }}
                key={item.title}
              >
                <div className="text-xs text-primary/55">{item.number}</div>
                <div>
                  <h3 className="text-2xl font-normal text-primary sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-lg font-light text-primary/80">
                    {item.role}
                  </p>
                  <p className="mt-2 text-sm text-primary/55">{item.details}</p>
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-primary/70 sm:text-base">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Education() {
  return (
    <section
      id="education"
      className="bg-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.35fr_1fr] md:gap-12">
        <div>
          <SectionLabel>Education</SectionLabel>
          <h2
            className="mt-5 max-w-sm text-3xl font-normal leading-tight sm:text-4xl md:text-5xl"
            style={{ color: PRIMARY_TEXT }}
          >
            Academic foundation, sharpened through hands-on roles.
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {educationItems.map((item) => (
            <article
              className="rounded-[0.5rem] bg-surface p-6"
              key={item.title}
            >
              <h3 className="text-2xl font-normal text-primary">{item.title}</h3>
              <p className="mt-5 text-base leading-relaxed text-primary/70">
                {item.description}
              </p>
              {item.detail ? (
                <p className="mt-3 text-sm text-primary/70">{item.detail}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <footer
      id="contact"
      className="border-t border-primary/15 bg-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionLabel>Contact</SectionLabel>
          <p className="max-w-sm text-sm text-primary/70 sm:text-right">
            Looking for collaboration? Let&apos;s talk.
          </p>
        </div>
        <a
          href="mailto:bhasmerutika@gmail.com?subject=Inquiry%20from%20Portfolio&body=Hi%20Rue,%0A%0AI'd%20like%20to%20get%20in%20touch%20regarding..."
          className="mt-10 inline-flex items-center gap-3 text-5xl font-normal leading-none text-primary transition-colors duration-300 hover:text-ember sm:text-7xl"
          title="Send an email"
        >
          <span>Get in Touch.</span>
          <ArrowRight className="h-9 w-9 -rotate-45 sm:h-12 sm:w-12" />
        </a>
        <div className="mt-14 grid gap-8 text-sm text-primary/70 md:grid-cols-3">
          <div>
            <h4 className="mb-3 text-primary">Rutika (Rue) Bhasme</h4>
            <p>Advanced Computing Student</p>
          </div>
          <div>
            <h4 className="mb-3 text-primary">Location</h4>
            <p>Sydney, New South Wales</p>
            <p>Australia</p>
          </div>
          <div>
            <h4 className="mb-3 text-primary">Connect</h4>
            <p>
              <a
                className="inline-flex items-center gap-2 transition-colors hover:text-primary"
                href="mailto:bhasmerutika@gmail.com?subject=Inquiry%20from%20Portfolio"
              >
                <Check className="h-3.5 w-3.5 text-primary" />
                Email Me
              </a>
            </p>
            <p className="mt-2">
              <a
                className="inline-flex items-center gap-2 transition-colors hover:text-primary"
                href="https://www.linkedin.com/in/rutika-bhasme-284856287/"
              >
                <Check className="h-3.5 w-3.5 text-primary" />
                LinkedIn
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;

      document.getElementById(id)?.scrollIntoView();
    };

    requestAnimationFrame(scrollToHash);
    window.addEventListener('hashchange', scrollToHash);

    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return (
    <main className="min-h-screen bg-ink">
      <Hero />
      <About />
      <Experience />
      <Education />
      <Contact />
    </main>
  );
}
