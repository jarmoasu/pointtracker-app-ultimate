import { Game, GameEvent } from '@/types/game';

function chronological(events: GameEvent[]): GameEvent[] {
  return [...events].reverse();
}

function formatSignedAt(signedAt: string): string {
  const date = new Date(signedAt);
  return `${date.toLocaleDateString()} klo ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function buildResultShareText(game: Game, events: GameEvent[]): string {
  const chronoEvents = chronological(events);
  const lines: string[] = [];

  // 1. Final score
  lines.push(`${game.homeTeam.name} (Koti) - ${game.awayTeam.name} (Vieras)`);
  lines.push(`Lopputulos: ${game.score.home} - ${game.score.away}`);
  lines.push('');

  // 2. Captain signatures (confirmation timestamps), right after the result
  lines.push('KAPTEENIEN ALLEKIRJOITUKSET');
  lines.push(
    `${game.homeTeam.name}: ${
      game.homeCaptainSignature ? `vahvistettu ${formatSignedAt(game.homeCaptainSignature.signedAt)}` : 'Ei vahvistettu'
    }`,
  );
  lines.push(
    `${game.awayTeam.name}: ${
      game.awayCaptainSignature ? `vahvistettu ${formatSignedAt(game.awayCaptainSignature.signedAt)}` : 'Ei vahvistettu'
    }`,
  );
  lines.push('');

  // 3. Players by team, with a gap before the away team's players
  lines.push('PELAAJAT');
  lines.push(`${game.homeTeam.name}:`);
  if (game.homeTeam.players.length) {
    game.homeTeam.players.forEach((p) => lines.push(`${p.name} #${p.number}`));
  } else {
    lines.push('Ei pelaajia kirjattu');
  }
  lines.push('');
  lines.push(`${game.awayTeam.name}:`);
  if (game.awayTeam.players.length) {
    game.awayTeam.players.forEach((p) => lines.push(`${p.name} #${p.number}`));
  } else {
    lines.push('Ei pelaajia kirjattu');
  }
  lines.push('');

  // 4. Captains
  lines.push('KAPTEENIT');
  lines.push(
    `${game.homeTeam.name}: ${
      game.homeCaptainSignature
        ? `${game.homeCaptainSignature.name} #${game.homeCaptainSignature.number}`
        : 'Ei vahvistettu'
    }`,
  );
  lines.push(
    `${game.awayTeam.name}: ${
      game.awayCaptainSignature
        ? `${game.awayCaptainSignature.name} #${game.awayCaptainSignature.number}`
        : 'Ei vahvistettu'
    }`,
  );
  lines.push('');

  // 5. Timeouts, all of the home team's first, then all of the away team's
  lines.push('AIKALISÄT');
  const homeTimeouts = chronoEvents.filter((e) => e.type === 'timeout' && e.teamId === 'home');
  const awayTimeouts = chronoEvents.filter((e) => e.type === 'timeout' && e.teamId === 'away');
  const orderedTimeouts = [...homeTimeouts, ...awayTimeouts];
  if (orderedTimeouts.length) {
    orderedTimeouts.forEach((t) => lines.push(`${t.teamName ?? 'Joukkue'}: ${t.gameTime}`));
  } else {
    lines.push('Ei aikalisiä');
  }
  lines.push('');

  // 6. Team that started the attack
  lines.push('HYÖKKÄYKSEN ALOITTI');
  lines.push(
    game.attackStartTeam === 'home'
      ? game.homeTeam.name
      : game.attackStartTeam === 'away'
        ? game.awayTeam.name
        : 'Ei merkitty',
  );

  // 7. Halftime end time
  const halftimeEvent = chronoEvents.find(
    (e) => e.type === 'halftime' && typeof e.halftimeEndTime === 'string',
  );
  if (halftimeEvent?.halftimeEndTime) {
    lines.push('');
    lines.push('PUOLIAIKA');
    lines.push(`Puoliaika päättyi ${halftimeEvent.halftimeEndTime}`);
  }

  // 8. Goals, one below another, each field on its own line, blank line between goals
  lines.push('');
  lines.push('MAALIT');
  const goals = chronoEvents.filter((e) => e.type === 'goal');
  if (goals.length) {
    goals.forEach((g, index) => {
      const assist = g.assistName ? `${g.assistName} #${g.assistNumber}` : 'CALLAHAN';
      const situation = g.scoreAtEvent ? `${g.scoreAtEvent.home}-${g.scoreAtEvent.away}` : '-';
      lines.push('');
      lines.push(`${index + 1}. ${g.teamName ?? 'Joukkue'}`);
      lines.push(`Syöttö: ${assist}`);
      lines.push(`Maali: ${g.scorerName} #${g.scorerNumber}`);
      lines.push(`Aika: ${g.gameTime}`);
      lines.push(`Tilanne: ${situation}`);
    });
  } else {
    lines.push('Ei maaleja kirjattu');
  }

  return lines.join('\n');
}
