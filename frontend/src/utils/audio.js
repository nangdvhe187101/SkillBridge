// Lightweight Web Audio API Notification Chime
export function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const now = ctx.currentTime;
        
        // Gentle bell chime: Two harmonious sine waves (E5 & B5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.15);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(987.77, now + 0.05); // B5

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.05);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
    } catch {
        // Ignore audio policy errors if autoplay is restricted
    }
}
