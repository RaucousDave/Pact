import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="reading-progress"
      aria-hidden="true"
      style={{ scaleX: reducedMotion ? scrollYProgress : scaleX }}
    />
  );
}

export function ClosingArtwork() {
  const target = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start end", "end start"],
  });
  const rotation = useTransform(scrollYProgress, [0, 1], [-30, 45]);
  const rotate = useSpring(rotation, { stiffness: 100, damping: 30 });
  return (
    <div ref={target} className="closing-art" aria-hidden="true">
      <div className="art-stem" />
      <motion.div
        className="big-flower"
        style={{ rotate: reducedMotion ? 10 : rotate }}
      >
        ✳
      </motion.div>
      <span>
        Keep
        <br />
        making.
      </span>
    </div>
  );
}
