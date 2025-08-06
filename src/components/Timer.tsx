import React, { useState, useEffect } from 'react';

interface TimerProps {
  initialTime: number;
  onTimeUp: () => void;
  running?: boolean;
  autoSubmit?: boolean;
}

const Timer: React.FC<TimerProps> = ({ initialTime, onTimeUp, running = true, autoSubmit = false }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      if (autoSubmit) {
        onTimeUp();
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (autoSubmit) {
            onTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, timeLeft, onTimeUp, autoSubmit]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = minutes <= 5;
  const isTimeUp = timeLeft <= 0;

  return (
    <div className={`text-[2rem] font-bold ${isTimeUp ? 'text-red-600' : isWarning ? 'text-red-600 animate-pulse' : ''}`}>
      {isTimeUp ? '00:00' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
    </div>
  );
};

export default Timer;
