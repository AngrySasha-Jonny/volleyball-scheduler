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

// Group pairs into rounds (2 matches per round, 2 courts)
function groupRounds(pairs) {
  const rounds = [];
  const remaining = pairs.map((p) => ({ teams: p, complete: false }));

  while (remaining.length > 0) {
    const usedTeams = new Set();
    const round = [];

    for (let i = 0; i < remaining.length; i++) {
      const [a, b] = remaining[i].teams;
      if (!usedTeams.has(a) && !usedTeams.has(b)) {
        round.push(remaining[i]);
        usedTeams.add(a);
        usedTeams.add(b);
      }
      if (round.length === 2) break; // 2 courts max
    }

    if (round.length < 2) break; // Don't keep rounds with less than 2 matches

    rounds.push(round);

    // Remove used pairs
    for (const match of round) {
      const index = remaining.findIndex(
        (m) =>
          (m.teams[0] === match.teams[0] && m.teams[1] === match.teams[1]) ||
          (m.teams[0] === match.teams[1] && m.teams[1] === match.teams[0])
      );
      if (index !== -1) remaining.splice(index, 1);
    }
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

  // Generate and save rounds when teamCount changes and on initial load (if no rounds saved)
  useEffect(() => {
    localStorage.setItem("teamCount", teamCount);
    if (rounds.length === 0) {
      const pairs = generatePairs(teamCount);
      const grouped = groupRounds(pairs);
      setRounds(grouped);
    }
  }, [teamCount]);

  // Save rounds to localStorage on every change
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

  // Regenerate schedule from scratch (resets progress)
  const regenerateSchedule = () => {
    const pairs = generatePairs(teamCount);
    const grouped = groupRounds(pairs);
    setRounds(grouped);
  };

  // Toggle complete state of a match
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

  // Reset all progress
  const resetProgress = () => {
    const clearedRounds = rounds.map((round) =>
      round.map((match) => ({ ...match, complete: false }))
    );
    setRounds(clearedRounds);
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
          <input
            id="teamCount"
            type="number"
            min="4"
            max="15"
            value={teamCount}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 4 && val <= 15) {
                setTeamCount(val);
                setRounds([]); // Clear rounds so new schedule regenerates
              }
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-center w-20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
