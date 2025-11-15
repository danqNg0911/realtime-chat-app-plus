import { useEffect, useRef } from 'react';
import './VietnamFlagEffect.css';

const VietnamFlagEffect = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Create stars
        const createStar = () => {
            const star = document.createElement('div');
            star.className = 'vietnam-star';
            star.innerHTML = '⭐';
            star.style.left = Math.random() * 100 + '%';
            star.style.animationDuration = (Math.random() * 2 + 3) + 's';
            star.style.opacity = Math.random() * 0.8 + 0.2;
            star.style.fontSize = (Math.random() * 15 + 20) + 'px';
            container.appendChild(star);

            setTimeout(() => {
                star.remove();
            }, 5000);
        };

        const interval = setInterval(createStar, 300);

        return () => {
            clearInterval(interval);
            container.innerHTML = '';
        };
    }, []);

    return (
        <div ref={containerRef} className="vietnam-flag-effect">
            <div className="flag-overlay" />
        </div>
    );
};

export default VietnamFlagEffect;
