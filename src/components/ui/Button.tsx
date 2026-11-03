import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) => {
  const baseStyles = "font-semibold py-2 px-4 transition-all duration-200 outline-none flex items-center justify-center gap-2 hover:cursor-pointer";

  // As per Design System: 4px for small buttons, 8px base. Let's use rounded-md (which is 8px in our token).
  const variants = {
    primary: "bg-brand text-bg-main rounded-md hover:brightness-110 shadow-[0_0_15px_var(--color-brand-muted)] focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-bg-main",
    secondary: "bg-transparent text-text-primary border border-border rounded-md hover:bg-bg-hover focus:ring-2 focus:ring-border focus:ring-offset-2 focus:ring-offset-bg-main",
    danger: "bg-priority-high/10 text-priority-high border border-priority-high/30 rounded-md hover:bg-priority-high/20 focus:ring-2 focus:ring-priority-high",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
