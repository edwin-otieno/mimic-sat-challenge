
interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar = ({ current, total }: ProgressBarProps) => {
  const percentage = (current / total) * 100;
  
  return (
    <div className="w-full">
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1 text-sm text-gray-500">
        <span>Question {current} of {total}</span>
        <span>{Math.floor(percentage)}% Complete</span>
      </div>
    </div>
  );
};

export default ProgressBar;
