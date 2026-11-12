import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "../lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Dark mode"
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={theme}
          aria-hidden="true"
          initial={{
            opacity: 0,
            rotate: reduce ? 0 : -60,
            scale: reduce ? 1 : 0.9,
          }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{
            opacity: 0,
            rotate: reduce ? 0 : 60,
            scale: reduce ? 1 : 0.9,
          }}
          transition={{ duration: 0.3 }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
