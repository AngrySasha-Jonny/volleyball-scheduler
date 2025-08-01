import React, { useState, useEffect } from "react";

// Generate all unique pairs of teams
function generatePairs(teamCount) {
  const pairs = [];
  for (let i = 1; i <= teamCount; i++) {
    for (let j = i + 1; j <= teamCount; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

// Custom scheduling logic per your requirements
function scheduleRounds(teamCount) {
  const allPairs = generatePairs(teamCount);

  // Round 1 fixed: teams 1-4 play (1v2, 3v4)
  const rounds = [];
  const round1 = [
    { teams: [1, 2], complete: false },
    { teams: [3, 4], complete: false },
  ];
  rounds.push(round1);

  // Remove round1 pairs from allPairs
  let remainingPairs = allPairs.filter(
    ([a, b]) =>
      !(
        (a === 1 && b === 2) ||
        (a === 2 && b === 1) ||
        (a === 3 && b === 4) ||
        (a === 4 && b === 3)
      )
  );

  // Track matches played per team
  const matchesCount = {};
  for (let i = 1; i <= teamCount; i++) matchesCount[i] = 0;
  matchesCount[1] = 1;
  matchesCount[2] = 1;
  matchesCount[3] = 1;
  matchesCount[4] = 1;

  // Track played pairs to avoid repeats
  const playedPairs = new Set();
  round1.forEach(({ teams }) => {
    playedPairs.add(`${teams[0]}-${teams[1]}`);
    playedPairs.add(`${teams[1]}-${teams[0]}`);
  });

  // Schedule next rounds prioritizing teams with fewer matches to get max teams playing ASAP
  while (remainingPairs.length > 0) {
    const usedTeams = new Set();
    const round = [];

    // Sort pairs by sum of matches played (lower sum first)
    remainingPairs.sort((a, b) => {
      const aSum = matchesCount[a[0]] + matchesCount[a[1]];
      const bSum = matchesCount[b[0]] + matchesCount[b[1]];
      return aSum - bSum;
    });

    for (let i = 0; i < remainingPairs.length; i++) {
      const [a, b] = remainingPairs[i];
      if (
        !usedTeams.has(a) &&
        !usedTeams.has(b) &&
        !playedPairs.has(`${a}-${b}`)
      ) {
        round.push({ teams: [a, b], complete: false });
        usedTeams.add(a);
        usedTeams.add(b);
        playedPairs.add(`${a}-${b}`);
        playedPairs.add(`${b}-${a}`);
        matchesCount[a]++;
        matchesCount[b]++;
      }
      if (round.length === 2) break; // 2 courts max
    }

    // If we cannot fill both courts, break to avoid partial round
    if (round.length < 2) break;

    // Remove these pairs from remainingPairs
    round.forEach(({ teams }) => {
      const idx = remainingPairs.findIndex(
        ([x, y]) =>
          (x === teams[0] && y === teams[1]) || (x === teams[1] && y === teams[0])
      );
      if (idx !== -1) remainingPairs.splice(idx, 1);
    });

    rounds.push(round);
  }

  return rounds;
}

export default function App() {
  const [teamCount, setTeamCount] = useState(() => {
    return parseInt(localStorage.getItem("teamCount")) || 6;
  });

  const [rounds, setRounds] = useState(() => {
    const stored = localStorage.getItem("rounds");
    return stored ? JSON.parse(stored) : [];
  });

  // Generate and save rounds when teamCount changes or on initial load (if no rounds saved)
  useEffect(() => {
    localStorage.setItem("teamCount", teamCount);
    if (rounds.length === 0) {
      const generatedRounds = scheduleRounds(teamCount);
      setRounds(generatedRounds);
    }
  }, [teamCount]);

  // Save rounds to localStorage on rounds change
  useEffect(() => {
    localStorage.setItem("rounds", JSON.stringify(rounds));
  }, [rounds]);

  // Count matches played per team
  const matchesCount = {};
  for (let i = 1; i <= teamCount; i++) matchesCount[i] = 0;
  rounds.forEach((round) => {
    round.forEach((match) => {
      if (match.complete) {
        matchesCount[match.teams[0]]++;
        matchesCount[match.teams[1]]++;
      }
    });
  });

  // Toggle complete for match
  const toggleComplete = (roundIndex, courtIndex) => {
    const newRounds = rounds.map((round, rIdx) =>
      round.map((match, cIdx) => {
        if (rIdx === roundIndex && cIdx === courtIndex) {
          return { ...match, complete: !match.complete };
        }
        return match;
      })
    );
    setRounds(newRounds);
  };

  // Regenerate full schedule (clears progress)
  const regenerateSchedule = () => {
    const newRounds = scheduleRounds(teamCount);
    setRounds(newRounds);
  };

  // Reset all progress but keep schedule
  const resetProgress = () => {
    const cleared = rounds.map((round) =>
      round.map((match) => ({ ...match, complete: false }))
    );
    setRounds(cleared);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white p-6 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-indigo-700">
          Volleyball Scheduler
        </h1>

        <div className="flex items-center gap-3 mb-8 justify-center">
          <label htmlFor="teamCount" className="font-semibold text-lg">
            Number of Teams:
          </label>
          <select
            id="teamCount"
            value={teamCount}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setTeamCount(val);
              setRounds([]); // regenerate schedule
            }}
            className="border border-gray-300 rounded-md px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 4).map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Matches Played Per Team</h2>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(matchesCount).map(([team, count]) => (
              <div
                key={team}
                className="bg-white rounded shadow px-4 py-2 text-center font-medium text-indigo-700"
              >
                Team {team}: {count} match{count !== 1 ? "es" : ""}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {rounds.map((round, roundIndex) => (
            <div
              key={roundIndex}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-indigo-600">
                Round {roundIndex + 1}
              </h2>

              <div className="space-y-3">
                {round.map(({ teams, complete }, courtIndex) => (
                  <div
                    key={courtIndex}
                    className="flex items-center justify-between p-3 bg-indigo-50 rounded-md shadow-sm"
                  >
                    <span className="font-medium text-gray-700">
                      Court {courtIndex + 1}: Team {teams[0]} vs Team {teams[1]}
                    </span>
                    <button
                      onClick={() => toggleComplete(roundIndex, courtIndex)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                        complete
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                      }`}
                    >
                      {complete ? "Complete" : "Mark Complete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-4 flex-wrap">
          <button
            onClick={regenerateSchedule}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-colors"
          >
            Regenerate Schedule
          </button>
          <button
            onClick={resetProgress}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-md shadow-md transition-colors"
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}
