// ranks.js

export const RANKS = [
    // --- LIGA: RECRUIT (Серый/Тусклый) ---
    { threshold: 0, title: "WASHED UP", color: "#666" },
    { threshold: 100, title: "SCRAP COLLECTOR", color: "#777" },
    { threshold: 300, title: "DECK HAND", color: "#888" },
    { threshold: 600, title: "RECRUIT", color: "#999" },

    // --- LIGA: NEON PILOT (Твой основной неоновый --n) ---
    { threshold: 1000, title: "CADET", color: "#00f2ff" },
    { threshold: 1500, title: "SQUADRON LEAD", color: "#00f2ff" },
    { threshold: 2200, title: "INTERCEPTOR", color: "#00f2ff" },
    { threshold: 3000, title: "VOID RUNNER", color: "#00f2ff" },

    // --- LIGA: ELITE (Глубокий синий/Фиолетовый) ---
    { threshold: 4500, title: "VANGUARD", color: "#7000ff" },
    { threshold: 6000, title: "STAR FIGHTER", color: "#7000ff" },
    { threshold: 8000, title: "PHANTOM", color: "#7000ff" },
    { threshold: 10500, title: "NEBULA GHOST", color: "#b537ff" },

    // --- LIGA: VETERAN (Розовый/Яркий --p) ---
    { threshold: 14000, title: "WARLORD", color: "#ff00e5" },
    { threshold: 18000, title: "ECLIPSE PILOT", color: "#ff00e5" },
    { threshold: 23000, title: "ORBITAL REAPER", color: "#ff00e5" },
    { threshold: 30000, title: "ZENITH ACE", color: "#ff006e" },

    // --- LIGA: LEGENDARY (Золото и спецэффекты) ---
    { threshold: 40000, title: "COMMANDER", color: "#ffcf00" },
    { threshold: 55000, title: "GALAXY GUARDIAN", color: "#ffcf00" },
    { threshold: 75000, title: "TITAN SLAYER", color: "#ffea00" },
    { threshold: 100000, title: "SYSTEM ARCHITECT", color: "#ffea00", animated: true }
];

/**
 * Возвращает объект ранга на основе текущего счета
 */
export function getRankByScore(score) {
    // Идем с конца массива, чтобы найти максимально доступный ранг
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (score >= RANKS[i].threshold) {
            return RANKS[i];
        }
    }
    return RANKS[0];
}