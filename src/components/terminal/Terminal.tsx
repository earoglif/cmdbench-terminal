import { forwardRef } from 'react';

interface TerminalProps {
  className?: string;
}

const Terminal = forwardRef<HTMLDivElement, TerminalProps>(({ className = '' }, ref) => {
  return (
    <div className={`flex-1 overflow-hidden ${className}`}>
      <div ref={ref} className="h-full w-full" />
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;