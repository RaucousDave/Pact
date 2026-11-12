import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Heart,
  Palette,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export function CreatorPreview({ compact = false }: { compact?: boolean }) {
  const [amount, setAmount] = useState(5);
  const reducedMotion = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 100, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 100, damping: 20 });
  return (
    <div className={`creator-stage${compact ? " creator-stage-compact" : ""}`}>
      <div className="stage-orbit orbit-one" aria-hidden="true" />
      <div className="stage-orbit orbit-two" aria-hidden="true" />
      <span className="stage-spark spark-one" aria-hidden="true">
        ✳
      </span>
      <span className="stage-spark spark-two" aria-hidden="true">
        ✦
      </span>
      <motion.div
        className="preview-card"
        style={{ rotateX, rotateY }}
        onPointerMove={(event) => {
          if (reducedMotion || event.pointerType !== "mouse") return;
          const rect = event.currentTarget.getBoundingClientRect();
          rotateX.set((0.5 - (event.clientY - rect.top) / rect.height) * 5);
          rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 5);
        }}
        onPointerLeave={() => {
          rotateX.set(0);
          rotateY.set(0);
        }}
        initial={{
          opacity: 0,
          y: reducedMotion ? 0 : 24,
          rotate: reducedMotion ? 0 : -4,
        }}
        animate={{ opacity: 1, y: 0, rotate: reducedMotion ? 0 : -2 }}
        transition={{ type: "spring", duration: 1.1, bounce: 0.15 }}
      >
        <div className="preview-browser">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>pact / irecreates</span>
          <ArrowUpRight size={13} />
        </div>
        <div className="preview-cover" aria-hidden="true">
          <div className="art-arch" />
          <div className="art-flower">✳</div>
          <div className="art-circle" />
          <span>
            made of
            <br />
            good things.
          </span>
        </div>
        <div className="preview-body">
          <div className="creator-avatar">
            <img src="/creator.jpg" alt="" />
            <span>
              <Check size={11} strokeWidth={3} />
            </span>
          </div>
          <h3>
            Ire Adebayo <span>✦</span>
          </h3>
          <p className="creator-discipline">
            Illustrator & a little bit of a dreamer
          </p>
          <p className="creator-bio">
            Making colourful things from Lagos.
            <br />
            Your support keeps the ideas flowing.
          </p>
          <div className="support-widget">
            <div className="support-label">
              <Heart size={16} />
              <span>Send a little love</span>
            </div>
            <div className="amount-options" aria-label="Preview support amount">
              {[1, 5, 10].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={amount === value}
                  onClick={() => setAmount(value)}
                  className={amount === value ? "selected" : ""}
                >
                  {amount === value && (
                    <motion.span
                      className="amount-highlight"
                      layoutId={compact ? "auth-amount" : "hero-amount"}
                      transition={{
                        type: "spring",
                        duration: 0.5,
                        bounce: 0.1,
                      }}
                    />
                  )}
                  <span>${value}</span>
                </button>
              ))}
            </div>
            <Link to="/signup" className="preview-support">
              Support Ire <Heart size={14} />
            </Link>
            <small>Example page · No payment is made</small>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="floating-receipt"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.75 }}
      >
        <span className="receipt-icon">
          <ArrowDownLeft size={22} />
        </span>
        <div>
          <span>Creator receives</span>
          <strong>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={amount}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                transition={{ duration: 0.35 }}
              >
                ${amount}.00
              </motion.span>
            </AnimatePresence>{" "}
            <small>USDC</small>
          </strong>
        </div>
        <span className="receipt-check">
          <Check size={13} />
        </span>
      </motion.div>
      <motion.div
        className="floating-label"
        initial={{ opacity: 0, x: reducedMotion ? 0 : -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.65, duration: 0.6 }}
      >
        <Palette size={17} />
        <span>
          A little page.
          <br />
          <strong>A world of possibility.</strong>
        </span>
        <Sparkles size={15} />
      </motion.div>
      <p className="preview-caption">Your own corner of the internet.</p>
    </div>
  );
}
