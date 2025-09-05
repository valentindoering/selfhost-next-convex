import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("risk_messages")
      .withIndex("by_createdTime")
      .order("asc")
      .collect();
  },
});

export const send = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("risk_messages", {
      role: "user",
      content: args.content,
      createdTime: now,
    });

    const reply = handleRiskCommand(args.content);
    await ctx.db.insert("risk_messages", {
      role: "system",
      content: reply,
      createdTime: now + 1,
    });
  },
});

function handleRiskCommand(text: string): string {
  const trimmed = text.trim();

  if (["31", "32", "21", "22", "11", "12"].includes(trimmed)) {
    return risk_attack(trimmed);
  }

  const countriesMatch = /^countries [2-5]$/.exec(trimmed);
  if (countriesMatch) {
    const nPlayers = parseInt(trimmed.split(" ")[1]!);
    return divide_countries(nPlayers);
  }

  if (/^\/howto$/.test(trimmed)) {
    return "if (['31', '32', '21', '22', '11', '12'].includes(text))\nif (/^countries [2-5]$/.test(text))\nif (/^\\/howto$/.test(text))";
  }

  return "Commands: '31','32','21','22','11','12' for dice; 'countries N' (2-5); /howto";
}

function risk_attack(text: string): string {
  const n_people: string = text;
  const attacker: number = parseInt(n_people[0]!);
  const defender: number = parseInt(n_people[1]!);

  const roll_dice = (): number => Math.floor(Math.random() * 6) + 1;
  const n_dices = (n: number): number[] =>
    Array.from({ length: n }, () => roll_dice()).sort((a, b) => b - a);
  const throw_dice: number[][] = [n_dices(attacker), n_dices(defender)];

  let outStr: string = `🎲 attacker (${throw_dice[0]}) | defender (${throw_dice[1]}) \n`;

  outStr += Array(Math.min(attacker, defender))
    .fill(null)
    .map((_, i) => {
      const attacker_val: number = throw_dice[0][i]!;
      const defender_val: number = throw_dice[1][i]!;
      return attacker_val <= defender_val
        ? `🥊 minus attacker army (A${attacker_val} D${defender_val})`
        : `🔫 minus defender army (A${attacker_val} D${defender_val})`;
    })
    .join("\n");

  return outStr;
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex]!,
      array[currentIndex]!,
    ];
  }
  return array;
}

function assignValuesToPlayers(values: string[], numOfPlayers: number): string[][] {
  const numOfValues = values.length;
  const numOfValuesPerPlayer = Math.floor(numOfValues / numOfPlayers);
  const numOfPlayersWithExtraValue = numOfValues % numOfPlayers;

  const players: string[][] = [];
  let valueIndex = 0;
  for (let i = 0; i < numOfPlayers; i++) {
    const numOfValuesForPlayer =
      numOfValuesPerPlayer + (i < numOfPlayersWithExtraValue ? 1 : 0);
    const playerValues: string[] = [];
    for (let j = 0; j < numOfValuesForPlayer; j++) {
      playerValues.push(values[valueIndex++]!);
    }
    players.push(playerValues);
  }
  return players;
}

function divide_countries(nPlayers: number): string {
  const countries = [
    "Alaska",
    "Alberta (Western Canada)",
    "Central America",
    "Eastern United States",
    "Greenland",
    "Northwest Territory",
    "Ontario (Central Canada)",
    "Quebec (Eastern Canada)",
    "Western United States",
    "Argentina",
    "Brazil",
    "Peru",
    "Venezuela",
    "Great Britain (Great Britain & Ireland)",
    "Iceland",
    "Northern Europe",
    "Scandinavia",
    "Southern Europe",
    "Ukraine (Eastern Europe, Russia)",
    "Western Europe",
    "Congo (Central Africa)",
    "East Africa",
    "Egypt",
    "Madagascar",
    "North Africa",
    "South Africa",
    "China",
    "India (Hindustan)",
    "Irkutsk",
    "Japan",
    "Kamchatka",
    "Middle East",
    "Mongolia",
    "Siam (Southeast Asia)",
    "Siberia",
    "Ural",
    "Yakutsk",
    "Eastern Australia",
    "Indonesia",
    "New Guinea",
    "Western Australia",
  ];

  shuffle(countries);
  const playerCountries = assignValuesToPlayers(countries, nPlayers);

  let outStr = `Total: ${countries.length} countries\n`;
  for (let i = 0; i < nPlayers; i++) {
    outStr += `  Player ${i + 1}: ${playerCountries[i]!.length} countries\n`;
  }
  outStr += `\n`;

  for (let i = 0; i < nPlayers; i++) {
    const playerCountries_i = playerCountries[i]!;
    outStr += `Player ${i + 1} (${playerCountries_i.length})\n`;
    for (let j = 0; j < playerCountries_i.length; j++) {
      outStr += `  ${playerCountries_i[j]}\n`;
    }
    outStr += `\n\n`;
  }

  return outStr;
}


