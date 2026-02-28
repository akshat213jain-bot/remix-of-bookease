import { useState, useEffect } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    minDisplayTime?: number;
}

const LoadingScreen = ({ message = 'Loading...', fullScreen = true, minDisplayTime = 1500 }: LoadingScreenProps) => {
    const [isVisible, setIsVisible] = useState(true);
    const [hasMinTimeElapsed, setHasMinTimeElapsed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMinTimeElapsed(true);
        }, minDisplayTime);

        return () => clearTimeout(timer);
    }, [minDisplayTime]);

    return (
        <div className={`loading-screen ${fullScreen ? 'loading-screen--fullscreen' : ''}`}>
            <div className="loading-container">
                <div className="orbital-loader">
                    <div className="orbital-ring orbital-ring--outer">
                        <div className="ring-gradient"></div>
                    </div>
                    <div className="orbital-ring orbital-ring--middle">
                        <div className="ring-gradient"></div>
                    </div>
                    <div className="orbital-ring orbital-ring--inner">
                        <div className="ring-gradient"></div>
                    </div>
                    <div className="clock-center">
                        <div className="clock-face">
                            <div className="clock-hand clock-hand--hour"></div>
                            <div className="clock-hand clock-hand--minute"></div>
                            <div className="clock-dot"></div>
                        </div>
                    </div>
                    <div className="orbital-glow"></div>
                </div>
                <p className="loading-message">{message}</p>
            </div>
        </div>
    );
};

export default LoadingScreen;
