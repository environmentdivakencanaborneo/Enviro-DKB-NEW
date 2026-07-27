import { createPortal } from 'react-dom';
import { ReactNode } from 'react';

export default function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
