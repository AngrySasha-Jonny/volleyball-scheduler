import React, { useState, useEffect } from "react";

// Simple deterministic shuffle using a fixed seed
function seededShuffle(array, seed) {
  const arr = [...array];
  let m = arr.length, t, i;
  let random = mulberry32(seed);
  while (m) {
    i = Math.floor(random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

// Mulberry32 PRNG from seed
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateAllPairs(teamCount) {
  const pairs = [];
  for (let i = 1; i <= teamCount; i++) {
    for (let j = i + 1; j <= teamCount; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

function normalizePair([a, b]) {
  return a < b ? [a, b] : [b, a];
}

// Schedule rounds greedily, 2 matches per round, no overlapping teams, drop partial rounds
function scheduleRounds(pairs) {
  const rounds = [];
  const remaining = [...pairs];

  while (remaining.length > 0) {
    const round = [];
    const usedTeams = new Set();

    for (let i = 0; i < remaining.length; ) {
      const [a, b] = remaining[i];
      if (!usedTeams.has(a) && !usedTeams.has(b)) {
        round.push([a, b]);
        usedTeams.add(a);
        usedTeams.add(b);
        remaining.splice(i, 1);
        if (round.length === 2) break;
      } else {
        i++;
      }
    }

    if (round.length === 2) {
      rounds.push(round);
    } else {
      break; // drop partial last round
    }
  }

  return rounds;
}

// Precompute schedules 4 to 15 teams using fixed seed
function precomputeSchedules() {
  const schedules = {};

  for (let teamCount = 4; teamCount <= 15; teamCount++) {
    // Round 1 fixed
    const firstRound = [
      [1, 2],
      [3, 4],
    ];

    // All pairs
    const allPairs = generateAllPairs(teamCount);
    // Remove pairs in first round
    const firstRoundNorm = firstRound.map(normalizePair).map(JSON.stringify);
    const remainingPairs = allPairs.filter(
      (p) => !firstRoundNorm.includes(JSON.stringify(normalizePair(p)))
    );

    // Deterministic shuffle with seed = teamCount to get same result each time
    const shuffledPairs = seededShuffle(remainingPairs, teamCount);

    // Schedule rounds from shuffled pairs
    const remainingRounds = scheduleRounds(shuffledPairs);

    schedules[teamCount] = [firstRound, ...remainingRounds];
  }

  return schedules;
}

const schedules = precomputeSchedules();

export default function App() {
  const [teamCount, setTeamCount] = useState(() => {
    return parseInt(localStorage.getItem("teamCount")) || 7;
  });
  const [rounds, setRounds] = useState([]);
  const [completedMatches, setCompletedMatches] = useState(() => {
    const saved = localStorage.getItem("completedMatches");
    return saved ? JSON.parse(saved) : {};
  });
  const [playCounts, setPlayCounts] = useState({});

  useEffect(() => {
    localStorage.setItem("teamCount", teamCount);

    const schedule = schedules[teamCount] || [];

    setRounds(schedule);
    setCompletedMatches({});

    // Count matches played per team
    const counts = {};
    for (let t = 1; t <= teamCount; t++) counts[t] = 0;
    schedule.forEach((round) => {
      round.forEach(([a, b]) => {
        counts[a]++;
        counts[b]++;
      });
    });
    setPlayCounts(counts);
  }, [teamCount]);

  useEffect(() => {
    localStorage.setItem("completedMatches", JSON.stringify(completedMatches));
  }, [completedMatches]);

  useEffect(() => {
    function handleBeforeUnload(e) {
      const totalMatches = rounds.length * 2;
      const completedCount = Object.values(completedMatches).reduce(
        (acc, arr) => acc + arr.length,
        0
      );
      if (completedCount < totalMatches) {
        e.preventDefault();
        e.returnValue =
          "You have incomplete matches. Are you sure you want to leave?";
        return e.returnValue;
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [completedMatches, rounds]);

  function toggleMatchComplete(roundIndex, courtIndex) {
    setCompletedMatches((prev) => {
      const roundMatches = new Set(prev[roundIndex] || []);
      if (roundMatches.has(courtIndex)) {
        roundMatches.delete(courtIndex);
      } else {
        roundMatches.add(courtIndex);
      }
      return { ...prev, [roundIndex]: Array.from(roundMatches) };
    });
  }

  return (
    <div className="p-4 space-y-6 max-w-xl mx-auto">
      <div>
        <label className="font-semibold text-lg mb-2 block">
          Number of Teams:
        </label>
        <input
          type="number"
          min="4"
          max="15"
          value={teamCount}
          onChange={(e) =>
            setTeamCount(
              Math.min(15, Math.max(4, parseInt(e.target.value) || 4))
            )
          }
          className="border px-2 py-1 w-20 rounded"
        />
      </div>

      <div className="border p-3 rounded bg-gray-50">
        <h3 className="font-semibold mb-2">Matches Per Team:</h3>
        <ul className="list-disc list-inside max-h-48 overflow-auto">
          {Object.entries(playCounts).map(([team, count]) => (
            <li key={team}>
              Team {team}: {count} match{count !== 1 ? "es" : ""}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {rounds.map((round, roundIndex) => (
          <div
            key={roundIndex}
            className="border rounded p-3 shadow-sm bg-white"
          >
            <h2 className="font-bold mb-2">Round {roundIndex + 1}</h2>
            {round.map(([a, b], courtIndex) => {
              const isCompleted =
                completedMatches[roundIndex]?.includes(courtIndex) ?? false;
              return (
                <div
                  key={courtIndex}
                  className={`flex justify-between items-center ${
                    isCompleted ? "opacity-50 line-through" : ""
                  }`}
                >
                  <div>
                    Court {courtIndex + 1}: Team {a} vs Team {b}
                  </div>
                  <button
                    onClick={() => toggleMatchComplete(roundIndex, courtIndex)}
                    className={`ml-4 px-3 py-1 rounded text-white ${
                      isCompleted
                        ? "bg-yellow-500"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isCompleted ? "Undo" : "Complete"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setCompletedMatches({});
          setTeamCount((count) => count); // force reload same schedule
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow"
      >
        Reset Progress
      </button>
    </div>
  );
}
