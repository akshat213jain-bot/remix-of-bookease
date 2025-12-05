
"use client";

import { useState } from 'react';

export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    props: {
      open: isOpen,
      onOpenChange: setIsOpen,
    },
  };
}
