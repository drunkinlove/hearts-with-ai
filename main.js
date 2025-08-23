import { DumbPlayer, HumanPlayer, AIPlayer } from "./players.js";
import { OpenAIClient } from "./llm_client.js";
import { Game } from "./game.js";

var llm_client = null;

const api_key = prompt("OpenAI API key?");
if (api_key !== null && api_key !== "") {
  llm_client = new OpenAIClient(api_key);
} else {
  console.log("No api_key, falling back to traditional AI...");
}

const player_ids = ["You", "Blanche", "Dorothy", "Sophia"];
const player_classes = [
  HumanPlayer,
  DumbPlayer,
  llm_client ? AIPlayer : DumbPlayer,
  DumbPlayer,
];
const players = new Map();
for (var i = 0; i < 4; i++) {
  var player_id = player_ids[i];
  var opponents = player_ids.filter((pid) => pid !== player_id);
  players.set(
    player_ids[i],
    new player_classes[i](player_id, opponents, llm_client, false, false)
  );
}

// test();

window.onload = async () => {
  var game = new Game(player_ids, players);
  await game.play();
};
