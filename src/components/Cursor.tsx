'use client';
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function Cursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 300 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  const isHovering = useRef(false);
  const scale = useSpring(1, { damping: 20, stiffness: 300 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
      dotX.set(e.clientX - 3);
      dotY.set(e.clientY - 3);
    };

    const enter = () => {
      isHovering.current = true;
      scale.set(2);
    };
    const leave = () => {
      isHovering.current = false;
      scale.set(1);
    };

    window.addEventListener('mousemove', move);

    const interactives = document.querySelectorAll('a, button, [role="button"], input, textarea, select, label');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    return () => {
      window.removeEventListener('mousemove', move);
    };
  }, [cursorX, cursorY, dotX, dotY, scale]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-gold-400 pointer-events-none z-[9999] mix-blend-multiply"
        style={{ x, y, scale }}
        transition={{ type: 'spring' }}
      />
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-gold-500 pointer-events-none z-[9999]"
        style={{ x: dotX, y: dotY }}
      />
    </>
  );
}
