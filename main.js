import { DumbPlayer, HumanPlayer, AIPlayer } from "./players.js";
import { OpenAIClient } from "./llm_client.js";
import { Game } from "./game.js";

const llm_client = new OpenAIClient();

const player_ids = ["Rose", "Blanche", "Dorothy", "Sophia"];
const player_classes = [DumbPlayer, DumbPlayer, DumbPlayer, DumbPlayer];
const players = new Map();
for (var i = 0; i < 4; i++) {
  var player_id = player_ids[i];
  var opponents = player_ids.filter((pid) => pid !== player_id);
  players.set(
    player_ids[i],
    new player_classes[i](player_id, opponents, llm_client, false, false)
  );
}

for (var g = 0; g < 20; g++) {
  var game = new Game(player_ids, players);
  await game.play();
}
