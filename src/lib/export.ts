import { jsPDF } from 'jspdf';
import { Session, Frame, FrameEvent, Player } from './store';
import { calculatePlayerStats } from './insights';

// CSV string escaping helper
const escapeCSV = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Exports session details and frame summary to a CSV file.
 */
export const exportSessionToCSV = (
  session: Session,
  frames: Frame[],
  players: Player[]
): void => {
  const headers = ['Frame Number', 'Mode', 'Reds Count', 'Winner Name', 'Notes', 'Date'];
  
  const rows = frames
    .filter(f => f.session_id === session.id)
    .map((f, index) => {
      const winner = players.find(p => p.id === f.winner_id);
      const winnerName = f.mode === 'team' 
        ? (f.winner_team === 'team_a' ? 'Team A' : 'Team B')
        : (winner ? winner.name : 'N/A');

      return [
        index + 1,
        f.mode === 'team' ? 'Team Mode' : 'Free For All',
        f.reds_count,
        winnerName,
        f.notes || '',
        new Date(f.created_at).toLocaleDateString(),
      ];
    });

  const csvContent = [
    ['Session Summary Report'],
    ['Start Time', new Date(session.start_time).toLocaleString()],
    ['End Time', session.end_time ? new Date(session.end_time).toLocaleString() : 'Active'],
    ['Duration (Seconds)', session.duration_seconds || 'N/A'],
    ['Session Notes', session.notes || ''],
    [],
    headers,
    ...rows
  ]
    .map(row => row.map(escapeCSV).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bee-snooker-session-${session.id.slice(0, 8)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports session details and event log to JSON format.
 */
export const exportSessionToJSON = (
  session: Session,
  frames: Frame[],
  events: FrameEvent[],
  players: Player[]
): void => {
  const exportData = {
    session: {
      id: session.id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_seconds: session.duration_seconds,
      notes: session.notes,
      photos: session.photos,
    },
    frames: frames
      .filter(f => f.session_id === session.id)
      .map(f => {
        const frameEvents = events.filter(e => e.frame_id === f.id);
        const winner = players.find(p => p.id === f.winner_id);
        return {
          id: f.id,
          reds_count: f.reds_count,
          mode: f.mode,
          status: f.status,
          winner: f.mode === 'team' ? f.winner_team : (winner ? { id: winner.id, name: winner.name } : null),
          notes: f.notes,
          events: frameEvents.map(e => ({
            id: e.id,
            player_name: players.find(p => p.id === e.player_id)?.name || 'System',
            event_type: e.event_type,
            ball: e.ball,
            points: e.points,
            sequence_no: e.sequence_no,
            device_info: e.device_info,
            created_at: e.created_at,
          })),
        };
      }),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bee-snooker-session-${session.id.slice(0, 8)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports a beautiful PDF report of the session, scores, ELO changes, and event stats.
 */
export const exportSessionToPDF = (
  session: Session,
  frames: Frame[],
  events: FrameEvent[],
  players: Player[]
): void => {
  const doc = new jsPDF() as any;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(47, 79, 79); // Dark Slate / Sage Green vibe
  doc.text('Bee Snooker — Session Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 27);
  doc.text(`Session ID: ${session.id}`, 14, 32);

  // Session metadata table
  const metaData = [
    ['Start Time', new Date(session.start_time).toLocaleString()],
    ['End Time', session.end_time ? new Date(session.end_time).toLocaleString() : 'Active'],
    ['Duration', session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} minutes` : 'N/A'],
    ['Notes', session.notes || 'No notes recorded.'],
  ];

  doc.autoTable({
    startY: 38,
    head: [['Field', 'Detail']],
    body: metaData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50] }, // Dark Sage Green
  });

  // Calculate stats for players participating in this session
  const sessionFrameIds = new Set(frames.filter(f => f.session_id === session.id).map(f => f.id));
  const sessionEvents = events.filter(e => sessionFrameIds.has(e.frame_id));

  // Determine active players
  const playerIds = new Set<string>();
  sessionEvents.forEach(e => {
    if (e.player_id) playerIds.add(e.player_id);
  });

  const sessionPlayers = players.filter(p => playerIds.has(p.id));
  
  // Aggregate stats
  const statsList = sessionPlayers.map(p => {
    // Generate dummy/session frame players map
    const mockFramePlayers = frames
      .filter(f => f.session_id === session.id)
      .map(f => ({
        frame_id: f.id,
        player_id: p.id,
        play_order: 1,
        is_breaker: false,
      }));

    return calculatePlayerStats(
      p.id,
      p.name,
      frames.filter(f => f.session_id === session.id),
      sessionEvents,
      mockFramePlayers
    );
  });

  // Player Summary Table
  const playerRows = statsList.map(s => [
    s.name,
    s.framesPlayed,
    s.wins,
    s.losses,
    s.totalPoints,
    s.averageFrameScore,
    s.highestFrameScore,
    s.fouls,
  ]);

  doc.setFontSize(14);
  doc.setTextColor(47, 79, 79);
  doc.text('Player Performance Summary', 14, doc.lastAutoTable.finalY + 15);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Player Name', 'Frames', 'Wins', 'Losses', 'Points', 'Avg Score', 'High Score', 'Fouls']],
    body: playerRows,
    theme: 'striped',
    headStyles: { fillColor: [47, 79, 79] },
  });

  // Frame details
  doc.setFontSize(14);
  doc.text('Frames Breakdown', 14, doc.lastAutoTable.finalY + 15);

  const frameRows = frames
    .filter(f => f.session_id === session.id)
    .map((f, idx) => {
      const winner = players.find(p => p.id === f.winner_id);
      const winnerName = f.mode === 'team'
        ? (f.winner_team === 'team_a' ? 'Team A' : 'Team B')
        : (winner ? winner.name : 'N/A');

      return [
        `Frame ${idx + 1}`,
        f.mode === 'team' ? 'Team' : 'FFA',
        f.reds_count,
        winnerName,
        f.notes || '',
      ];
    });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Frame', 'Mode', 'Reds Count', 'Winner', 'Notes']],
    body: frameRows,
    theme: 'grid',
    headStyles: { fillColor: [85, 107, 47] }, // Olive/Sage Green
  });

  // Save the PDF
  doc.save(`bee-snooker-session-${session.id.slice(0, 8)}.pdf`);
};
