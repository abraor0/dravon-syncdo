import { Check } from 'lucide-react';

export const TaskCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`
        relative w-5 h-5 rounded flex items-center justify-center transition-all duration-200 border cursor-pointer
        ${checked
          ? 'bg-brand border-brand text-bg-main'
          : 'bg-transparent border-border text-transparent hover:border-brand/50'
        }
      `}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <Check size={14} strokeWidth={3} />}
    </button>
  );
};
