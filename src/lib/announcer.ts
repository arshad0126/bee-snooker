import { FrameEvent, Player, FramePlayer } from './store';

// Helper to check for browser speech synthesis support
const getSpeechUtterance = (text: string): SpeechSynthesisUtterance | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  
  // Cancel any active speech to avoid queuing delay
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // slightly slower, professional referee pace
  utterance.pitch = 0.9; // deeper voice
  
  // Try to find a nice English voice (pref British)
  const voices = window.speechSynthesis.getVoices();
  const britishVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-US'));
  if (britishVoice) {
    utterance.voice = britishVoice;
  }
  
  return utterance;
};

export const announceEvent = (
  events: FrameEvent[],
  lastEvent: FrameEvent,
  players: (FramePlayer & { player: Player })[],
  scores: Record<string, number>
) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // 1. Resolve active events list (filter out undone events)
  const undoneEventIds = new Set<string>();
  events.forEach(e => {
    if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
      undoneEventIds.add(e.metadata.undoes_event_id);
      undoneEventIds.add(e.id);
    }
  });
  
  const activeEvents = events
    .filter(e => !undoneEventIds.has(e.id) && e.event_type !== 'undo')
    .sort((a, b) => a.sequence_no - b.sequence_no);

  const shooterId = lastEvent.player_id;
  if (!shooterId) return;

  const shooter = players.find(p => p.player_id === shooterId)?.player;
  const shooterName = shooter ? shooter.name : 'Player';

  if (lastEvent.event_type === 'pot') {
    // Calculate break running total
    let breakTotal = 0;
    let consecutivePots = 0;
    
    for (let i = activeEvents.length - 1; i >= 0; i--) {
      const ev = activeEvents[i];
      if (ev.player_id !== shooterId) break;
      if (ev.event_type === 'pot') {
        breakTotal += ev.points;
        consecutivePots++;
      } else {
        break;
      }
    }

    let speechText = '';
    if (consecutivePots === 1) {
      // First pot: say Name + value
      speechText = `${shooterName}, ${breakTotal}`;
    } else {
      // Running total only
      speechText = `${breakTotal}`;
    }
    
    const utterance = getSpeechUtterance(speechText);
    if (utterance) window.speechSynthesis.speak(utterance);

  } else if (lastEvent.event_type === 'foul') {
    // Referee calls "Foul", penalty points, and opponent scores
    const foulPoints = lastEvent.points || 4;
    const speechText = `Foul, ${foulPoints}`;
    const utterance = getSpeechUtterance(speechText);
    if (utterance) window.speechSynthesis.speak(utterance);

  } else if (lastEvent.event_type === 'pass_turn') {
    // If the player had a break, call the final break total
    let finalBreak = 0;
    
    // Find the break before the pass
    const passIndex = activeEvents.findIndex(e => e.id === lastEvent.id);
    if (passIndex !== -1) {
      for (let i = passIndex - 1; i >= 0; i--) {
        const ev = activeEvents[i];
        if (ev.player_id !== shooterId) break;
        if (ev.event_type === 'pot') {
          finalBreak += ev.points;
        } else {
          break;
        }
      }
    }

    if (finalBreak > 0) {
      const speechText = `${shooterName}, ${finalBreak}`;
      const utterance = getSpeechUtterance(speechText);
      if (utterance) window.speechSynthesis.speak(utterance);
    }
  } else if (lastEvent.event_type === 'undo') {
    const utterance = getSpeechUtterance('Correction');
    if (utterance) window.speechSynthesis.speak(utterance);
  }
};
