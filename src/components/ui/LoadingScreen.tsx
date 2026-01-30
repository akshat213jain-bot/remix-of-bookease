import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Loading...',
    fullScreen = true
}) => {
    return (
        <div className={`loading-screen ${fullScreen ? 'loading-screen--fullscreen' : ''}`}>
            <div className="loading-container">
                {/* Orbital Animation Container */}
                <div className="orbital-loader">
                    {/* Outer Ring */}
                    <div className="orbital-ring orbital-ring--outer">
                        <div className="ring-gradient"></div>
                    </div>

                    {/* Middle Ring */}
                    <div className="orbital-ring orbital-ring--middle">
                        <div className="ring-gradient"></div>
                    </div>

                    {/* Inner Ring */}
                    <div className="orbital-ring orbital-ring--inner">
                        <div className="ring-gradient"></div>
                    </div>

                    {/* Center Clock */}
                    <div className="clock-center">
                        <div className="clock-face">
                            <div className="clock-hand clock-hand--hour"></div>
                            <div className="clock-hand clock-hand--minute"></div>
                            <div className="clock-dot"></div>
                        </div>
                    </div>

                    {/* Glow Effect */}
                    <div className="orbital-glow"></div>
                </div>

                {/* Loading Message */}
                <p className="loading-message">{message}</p>
            </div>
        </div>
    );
};

export default LoadingScreen;
