
import { useState, useEffect } from "react";

interface TimerProps {
  initialTime: number; // in seconds
  onTimeUp: () => void;
}

const Timer = ({ initialTime, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const warningThreshold = initialTime * 0.2; // 20% of time left
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        
        // Set warning when less than 20% time left
        if (prevTime <= warningThreshold && !isWarning) {
          setIsWarning(true);
        }
        
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [initialTime, onTimeUp, isWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`text-2xl font-mono font-bold ${isWarning ? "timer-warning" : ""}`}>
      {formatTime(timeLeft)}
    </div>
  );
};

export default Timer;
