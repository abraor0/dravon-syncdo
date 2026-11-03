export const Badge = ({ priority }: { priority: 'high' | 'medium' | 'low' | string }) => {
  const priorityStyles: Record<string, string> = {
    high: "bg-priority-high/15 text-priority-high border-priority-high/30",
    medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
    low: "bg-priority-low/15 text-priority-low border-priority-low/30",
  };

  const labels: Record<string, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const style = priorityStyles[priority] || priorityStyles.low;
  const label = labels[priority] || labels.low;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${style}`}>
      {label}
    </span>
  );
};
