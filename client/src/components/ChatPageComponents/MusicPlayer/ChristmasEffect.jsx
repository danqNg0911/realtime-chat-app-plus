import { useEffect, useRef } from 'react';
import './ChristmasEffect.css';

const ChristmasEffect = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Create snowflakes
        const createSnowflake = () => {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄';
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            snowflake.style.opacity = Math.random();
            snowflake.style.fontSize = (Math.random() * 10 + 10) + 'px';
            container.appendChild(snowflake);

            setTimeout(() => {
                snowflake.remove();
            }, 5000);
        };

        const interval = setInterval(createSnowflake, 200);

        return () => {
            clearInterval(interval);
            container.innerHTML = '';
        };
    }, []);

    return <div ref={containerRef} className="christmas-effect" />;
};

export default ChristmasEffect;
