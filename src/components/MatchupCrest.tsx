import type { League, Team } from '@/types/models';

interface CrestProps {
  homeTeam: Team;
  awayTeam: Team;
  league?: League;
  size?: 'sm' | 'md' | 'lg';
}

export function MatchupCrest({ homeTeam, awayTeam, size = 'md' }: CrestProps) {
  const dims = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'sm' ? 'h-10 w-10 text-sm' : 'h-14 w-14 text-lg';
  return (
    <div className="flex items-center gap-3">
      <TeamCrest team={homeTeam} dims={dims} showName={size !== 'sm'} />
      <span className="text-xs font-bold" style={{ color: '#737A76' }}>VS</span>
      <TeamCrest team={awayTeam} dims={dims} showName={size !== 'sm'} />
    </div>
  );
}

function TeamCrest({ team, dims, showName }: { team: Team; dims: string; showName: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-full font-bold ${dims}`}
        style={{
          background: `linear-gradient(135deg, ${team.color}40, ${team.color}15)`,
          border: `2px solid ${team.color}50`,
          color: team.color,
        }}
      >
        <span className="serif">{team.abbr}</span>
      </div>
      {showName && (
        <span className="text-[10px] font-medium" style={{ color: '#737A76' }}>{team.city}</span>
      )}
    </div>
  );
}

interface MotifProps {
  league: League;
}

export function LeagueMotif({ league }: MotifProps) {
  const motifStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, overflow: 'hidden',
    pointerEvents: 'none', opacity: 0.06, zIndex: 0,
  };
  switch (league) {
    case 'NBA':
      return (
        <div style={motifStyle}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60%', height: '80%', border: '2px solid #F1F0EC', borderRadius: '4px' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', border: '2px solid #F1F0EC', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '2px', height: '100%', background: '#F1F0EC' }} />
        </div>
      );
    case 'NFL':
      return (
        <div style={motifStyle}>
          {[20, 40, 60, 80].map((y) => (
            <div key={y} style={{ position: 'absolute', top: `${y}%`, left: 0, right: 0, height: '1px', background: '#F1F0EC' }} />
          ))}
        </div>
      );
    case 'MLB':
      return (
        <div style={motifStyle}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '70%', height: '70%', border: '2px solid #F1F0EC', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '10%', left: '30%', width: '40%', height: '1px', background: '#F1F0EC', transform: 'rotate(15deg)' }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '30%', width: '40%', height: '1px', background: '#F1F0EC', transform: 'rotate(-15deg)' }} />
        </div>
      );
    case 'NHL':
      return (
        <div style={motifStyle}>
          <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', border: '2px solid #F1F0EC', borderRadius: '12px' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '30px', height: '30px', border: '2px solid #F1F0EC', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '0', bottom: '0', left: '50%', width: '1px', background: '#F1F0EC' }} />
        </div>
      );
    case 'Soccer':
      return (
        <div style={motifStyle}>
          <div style={{ position: 'absolute', inset: '5%', border: '1px solid #F1F0EC' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', border: '1px solid #F1F0EC', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '5%', left: '30%', right: '30%', height: '15%', border: '1px solid #F1F0EC' }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '30%', right: '30%', height: '15%', border: '1px solid #F1F0EC' }} />
        </div>
      );
  }
}
