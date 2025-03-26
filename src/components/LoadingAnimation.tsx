import React from 'react';
import '../styles/LoadingAnimation.css';

interface LoadingAnimationProps {
  title?: string;
  subtitle?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  title = 'Loading',
  subtitle = 'Please wait...'
}) => {
  return (
    <div className="loading-container">
      <div className="loading-animation"></div>
      <div className="loading-title">{title}</div>
      <div className="loading-subtitle">{subtitle}</div>
    </div>
  );
};

export default LoadingAnimation; 