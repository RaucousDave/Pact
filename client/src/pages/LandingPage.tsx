import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Globe2,
  Heart,
  Landmark,
  LockKeyhole,
  Music2,
  Palette,
  PenTool,
  Play,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { Brand, TestnetBadge } from "../components/Brand";
import { CreatorPreview } from "../components/CreatorPreview";
import { PaymentPlayground } from "../components/PaymentPlayground";
import { ThemeToggle } from "../components/ThemeToggle";
import { ClosingArtwork, ReadingProgress } from "../components/MotionEffects";
import { useSession } from "../lib/session";

const faqs = [
  [
    "What is Pact?",
    "Pact is being built for Nigerian creators to receive support and get paid for commissions. Fans will pay in NGNT or XLM, while creators receive USDC. This early testnet demo starts with your creator account.",
  ],
  [
    "Do I need a crypto wallet to get started?",
    "No wallet extension or seed phrase is needed for this demo. When you sign up, Pact creates and funds an app-managed Stellar testnet wallet and sets up its USDC trustline. Testnet assets have no real monetary value.",
  ],
  [
    "Can my supporters pay in naira?",
    "The planned payment flow uses test NGNT, an NGN-pegged token, or XLM. It does not accept bank transfers or card payments yet. A real naira deposit flow would need a supported on-ramp.",
  ],
  [
    "Can I withdraw to my Nigerian bank account?",
    "Not in this release. Bank withdrawals are planned as a simulated SEP-24 flow. Real withdrawals would require an anchor that supports NGN, identity verification, and any applicable fees or exchange spreads.",
  ],
  [
    "What does it cost?",
    "Creating a testnet account is free. Stellar network fees are small, but they are separate from any future platform fees, conversion spreads, or bank withdrawal charges. Real-money pricing has not been announced.",
  ],
];

export function LandingPage() {
  const token = useSession();
  const reducedMotion = useReducedMotion();
  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.23, 1, 0.32, 1] as const },
  });
  const reveal = (delay = 0) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.9, delay, ease: [0.23, 1, 0.32, 1] as const },
  });
  return (
    <>
      <ReadingProgress />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header container">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#why-pact">Why Pact</a>
          <a href="#questions">FAQs</a>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          {token ? (
            <Link to="/account" className="button button-small button-primary">
              My account <ArrowUpRight size={16} />
            </Link>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Log in
              </Link>
              <Link to="/signup" className="button button-small button-primary">
                Get started <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>
      <main id="main">
        <section className="hero-section container">
          <div className="hero-copy">
            <motion.div {...entrance(0)} className="audience-label">
              <span className="nigeria-flag" aria-hidden="true" />
              Made for creators. Rooted in Nigeria.
            </motion.div>
            <h1 aria-label="A living from what you love.">
              {["A living from", "what you love."].map((line, index) => (
                <span className="headline-mask" aria-hidden="true" key={line}>
                  <motion.span
                    initial={{ y: reducedMotion ? 0 : "105%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 1.1,
                      delay: 0.08 * index,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p {...entrance(0.12)} className="hero-description">
              Your ideas deserve more than a like. Turn support from your people
              into possibility, wherever in the world they are.
            </motion.p>
            <motion.div {...entrance(0.18)} className="hero-actions">
              <Link to="/signup" className="button button-primary">
                Start creating with Pact <ArrowUpRight size={18} />
              </Link>
              <a className="text-link" href="#how-it-works">
                <span className="play-icon">
                  <Play size={12} fill="currentColor" />
                </span>
                See how it works
              </a>
            </motion.div>
            <motion.div {...entrance(0.24)} className="hero-footnote">
              <div className="creative-icons" aria-hidden="true">
                <span>
                  <Palette size={16} />
                </span>
                <span>
                  <Code2 size={16} />
                </span>
                <span>
                  <Music2 size={16} />
                </span>
              </div>
              <span>
                For the beautifully independent.
                <br />
                <strong>No foreign merchant bank required.</strong>
              </span>
            </motion.div>
          </div>
        </section>
        <div className="container playground-container">
          <PaymentPlayground />
        </div>
        <div className="creator-ribbon">
          <div className="container ribbon-inner">
            <span>Whatever you create, there’s a place for you.</span>
            <div>
              <span>
                <Palette />
                Artists
              </span>
              <span>
                <PenTool />
                Writers
              </span>
              <span>
                <Code2 />
                Builders
              </span>
              <span>
                <Music2 />
                Musicians
              </span>
              <span>
                <Sparkles />
                You.
              </span>
            </div>
          </div>
        </div>
        <section className="creator-page-story container">
          <div className="creator-story-copy">
            <span className="section-kicker">
              <span />
              Your work. Your world.
            </span>
            <h2>
              A small page.
              <br />A bigger possibility.
            </h2>
            <p>
              For the art you stay up late making. The words you can’t keep to
              yourself. The ideas that deserve to see the light.
            </p>
            <p>
              We’re building a home for your work and the people who believe in
              it.
            </p>
            <Link to="/signup" className="button button-outline">
              Make your first Pact <ArrowUpRight size={17} />
            </Link>
            <span className="story-preview-note">
              Creator page preview · Account creation available now
            </span>
          </div>
          <CreatorPreview />
        </section>
        <section className="features-section container" id="why-pact">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                <span />
                Less friction. More creating.
              </span>
              <h2>
                Your talent has no borders.
                <br />
                Your income shouldn’t either.
              </h2>
            </div>
            <p>
              Built around your work, your community,
              <br className="desktop-break" /> and the freedom to keep going.
            </p>
          </div>
          <div className="feature-grid">
            <motion.article
              {...reveal()}
              className="feature-card conversion-feature"
            >
              <div className="feature-symbol">
                <Globe2 size={23} />
              </div>
              <h3>
                Local love.
                <br />
                Dollar value.
              </h3>
              <p>
                Fans pay in what they hold. You receive USDC, with conversion in
                one Stellar transaction.
              </p>
              <div className="conversion-visual">
                <div>
                  <span className="currency-symbol">₦</span>
                  <span>NGNT</span>
                </div>
                <motion.span
                  className="conversion-arrow"
                  whileInView={reducedMotion ? undefined : { x: [0, 5, 0] }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1 }}
                >
                  <ArrowRight size={22} />
                </motion.span>
                <div>
                  <span className="currency-symbol dollar-symbol">$</span>
                  <span>USDC</span>
                </div>
              </div>
              <span className="feature-status">Payment flow preview</span>
            </motion.article>
            <motion.article
              {...reveal(0.06)}
              className="feature-card escrow-feature"
            >
              <div className="feature-symbol">
                <ShieldCheck size={23} />
              </div>
              <h3>
                Good work.
                <br />
                Kept promises.
              </h3>
              <p>
                Commission payments held in escrow, with a clear path to
                approval, release, or dispute.
              </p>
              <div className="mini-commission">
                <span>
                  <i />
                  <strong>Custom illustration</strong>
                  <span>$50</span>
                </span>
                <div>
                  <span>
                    <Check size={12} /> Funded
                  </span>
                  <span className="commission-line" />
                  <span>
                    <LockKeyhole size={12} /> In escrow
                  </span>
                </div>
              </div>
              <span className="feature-status">Commission flow preview</span>
            </motion.article>
            <motion.article
              {...reveal(0.12)}
              className="feature-card bank-feature"
            >
              <div className="feature-symbol">
                <Landmark size={23} />
              </div>
              <h3>
                From your craft
                <br />
                to your everyday.
              </h3>
              <p>
                A path from your creator wallet to your local bank, so your
                creativity can support real life.
              </p>
              <div className="bank-visual">
                <div>
                  <Wallet size={19} />
                  <span>Your creator wallet</span>
                </div>
                <ArrowDown size={17} />
                <div>
                  <Landmark size={19} />
                  <span>Your Nigerian bank</span>
                </div>
              </div>
              <span className="feature-status">
                Simulated withdrawal planned
              </span>
            </motion.article>
          </div>
          <p className="preview-note">
            A look at what we’re building. Account creation is live; payments,
            commissions, and withdrawals are coming next.
          </p>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="container how-inner">
            <div className="how-intro">
              <span className="section-kicker">
                <span />A small start. A big possibility.
              </span>
              <h2>
                Make something.
                <br />
                Mean something.
                <br />
                Get supported.
              </h2>
              <p>
                Your people already love what you do.
                <br />
                Give them a way to be part of it.
              </p>
              <Link to="/signup" className="text-link">
                Create your account <ArrowUpRight size={18} />
              </Link>
            </div>
            <motion.ol
              className="steps"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.16 } },
              }}
            >
              <motion.li
                variants={{
                  hidden: { opacity: 0, x: reducedMotion ? 0 : 20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.75, ease: [0.23, 1, 0.32, 1] },
                  },
                }}
              >
                <span className="step-number">01</span>
                <div>
                  <span className="step-status">Start here</span>
                  <h3>Make it yours.</h3>
                  <p>
                    Choose a handle and create your account. We’ll take care of
                    your testnet wallet in the background.
                  </p>
                </div>
              </motion.li>
              <motion.li
                variants={{
                  hidden: { opacity: 0, x: reducedMotion ? 0 : 20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.75, ease: [0.23, 1, 0.32, 1] },
                  },
                }}
              >
                <span className="step-number">02</span>
                <div>
                  <span className="step-status muted-status">Coming next</span>
                  <h3>Bring your people.</h3>
                  <p>
                    A personal creator page for your work, your story, and the
                    people who want to support it.
                  </p>
                </div>
              </motion.li>
              <motion.li
                variants={{
                  hidden: { opacity: 0, x: reducedMotion ? 0 : 20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.75, ease: [0.23, 1, 0.32, 1] },
                  },
                }}
              >
                <span className="step-number">03</span>
                <div>
                  <span className="step-status muted-status">Coming next</span>
                  <h3>Keep the good things going.</h3>
                  <p>
                    Receive support in USDC and take on commissions with a
                    little more peace of mind.
                  </p>
                </div>
              </motion.li>
            </motion.ol>
          </div>
        </section>
        <section className="faq-section container" id="questions">
          <div>
            <span className="section-kicker">
              <span />A little clarity
            </span>
            <h2>
              Good questions.
              <br />
              Straight answers.
            </h2>
            <p>
              We’re building in the open.
              <br />
              Here’s where things stand.
            </p>
            <TestnetBadge />
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing-section container">
          <div className="closing-panel">
            <div>
              <span className="closing-star" aria-hidden="true">
                ✳
              </span>
              <h2>
                The world needs
                <br />
                more of your thing.
              </h2>
              <p>Let’s make it easier to keep creating.</p>
              <Link to="/signup" className="button button-light">
                Find your people. Start your Pact. <ArrowUpRight size={18} />
              </Link>
              <span className="closing-note">
                Free to start. Testnet only. All you.
              </span>
            </div>
            <ClosingArtwork />
          </div>
        </section>
      </main>
      <footer className="site-footer container">
        <div>
          <Brand />
          <p>Made for the beautifully independent.</p>
        </div>
        <div className="footer-right">
          <TestnetBadge />
          <span>
            Built on Stellar{" "}
            <span className="stellar-symbol" aria-hidden="true">
              ◉
            </span>
          </span>
          <a href="#main" aria-label="Back to top">
            <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Pact. Made with purpose.</span>
          <span>
            Demo assets have no real value. Bank withdrawals are simulated.
          </span>
          <span>
            From Nigeria, with <Heart size={12} />
          </span>
        </div>
      </footer>
    </>
  );
}
