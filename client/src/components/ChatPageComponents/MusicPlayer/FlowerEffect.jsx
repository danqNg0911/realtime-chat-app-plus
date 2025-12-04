import { useEffect, useRef } from "react";
import "./FlowerEffect.css";

const FlowerEffect = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createFlower = () => {
      const flower = document.createElement("div");
      flower.className = "flower-petal";
      flower.textContent = "✿";
      flower.style.left = `${Math.random() * 100}%`;
      flower.style.animationDuration = `${3 + Math.random() * 3}s`;
      flower.style.animationDelay = `${Math.random() * 2}s`;
      flower.style.opacity = (0.4 + Math.random() * 0.6).toFixed(2);
      flower.style.fontSize = `${16 + Math.random() * 10}px`;
      container.appendChild(flower);

      setTimeout(() => flower.remove(), 6000);
    };

    const interval = setInterval(createFlower, 250);

    return () => {
      clearInterval(interval);
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} className="flower-effect" />;
};

export default FlowerEffect;
