// ranks.js

export const RANKS = [
    // --- LIGA: RECRUIT ---
    { threshold: 0, title: "WASHED UP", color: "#666" },
    { threshold: 100, title: "SCRAP COLLECTOR", color: "#777" },
    { threshold: 300, title: "DECK HAND", color: "#888" },
    { threshold: 600, title: "RECRUIT", color: "#999" },

    // --- LIGA: NEON PILOT ---
    { threshold: 1000, title: "CADET", color: "#00f2ff" },
    { threshold: 1500, title: "SQUADRON LEAD", color: "#00f2ff" },
    { threshold: 2200, title: "INTERCEPTOR", color: "#00f2ff" },
    { threshold: 3000, title: "VOID RUNNER", color: "#00f2ff" },

    // --- LIGA: ELITE ---
    { threshold: 4500, title: "VANGUARD", color: "#7000ff" },
    { threshold: 6000, title: "STAR FIGHTER", color: "#7000ff" },
    { threshold: 8000, title: "PHANTOM", color: "#7000ff" },
    { threshold: 10500, title: "NEBULA GHOST", color: "#b537ff" },

    // --- LIGA: VETERAN ---
    { threshold: 14000, title: "WARLORD", color: "#ff00e5" },
    { threshold: 18000, title: "ECLIPSE PILOT", color: "#ff00e5" },
    { threshold: 23000, title: "ORBITAL REAPER", color: "#ff00e5" },
    { threshold: 30000, title: "ZENITH ACE", color: "#ff006e" },

    // --- LIGA: LEGENDARY ---
    { threshold: 40000, title: "COMMANDER", color: "#ffcf00" },
    { threshold: 55000, title: "GALAXY GUARDIAN", color: "#ffcf00" },
    { threshold: 75000, title: "TITAN SLAYER", color: "#ffea00" },
    { threshold: 100000, title: "SYSTEM ARCHITECT", color: "#ffea00", animated: true }
];

/**
 * Возвращает объект ранга на основе текущего счета, используя массив RANKS
 */
export function getRankByScore(score) {
    // Разворачиваем массив и находим первый ранг, порог которого меньше или равен счету
    const currentRank = [...RANKS].reverse().find(rank => score >= rank.threshold);
    
    // Если ничего не нашли (хотя 0 всегда есть), возвращаем дефолт
    if (!currentRank) return { name: "UNKNOWN", color: "#666" };

    return {
        name: currentRank.title,
        color: currentRank.color,
        animated: currentRank.animated || false
    };
}