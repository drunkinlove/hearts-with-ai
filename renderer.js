import { capitalize_first_letter, margins_float_to_px } from "./helpers.js";
import { RANKS } from "./table.js";

const MAX_HAND_SIZE = 13;
const SUIT_ORDER = ["♣", "♠", "♦", "♥"];

// export function test() {
//   const hand = [
//     "♠X",
//     "♦Q",
//     "♥4",
//     "♣J",
//     "♣K",
//     "♣8",
//     "♦5",
//     "♣7",
//     "♥3",
//     "♥Q",
//     "♥2",
//     "♠3",
//     "♦3",
//   ];
//   draw_hand(hand, "bottom", false);
//   draw_hand(hand, "top", true);
//   draw_hand(hand, "left", true);
//   draw_hand(hand, "right", true);
//   const trick_cards = {
//     bottom: "♥Q",
//     left: "♦Q",
//     top: "♣Q",
//     right: "♠Q",
//   };
//   for (const [side, val] of Object.entries(trick_cards))
//     draw_trick_card(side, val);
// }

function create_card(face_down, value, margins) {
  const rank_translations = {
    X: "10",
    J: "jack",
    Q: "queen",
    K: "king",
    A: "ace",
  };
  const suit_translations = {
    "♠": "spades",
    "♣": "clubs",
    "♦": "diamonds",
    "♥": "hearts",
  };
  const card = document.createElement("img");
  card.classList.add("card");
  const [suit, rank] = value;
  if (face_down) {
    card.src = `./assets/Tiled_blue_broken_line_rhombus_card_back.svg`;
  } else {
    card.src = `./assets/SVG-cards-1.3/${rank_translations[rank] ?? rank}_of_${suit_translations[suit]}`;
    if (["J", "Q", "K"].includes(rank)) {
      card.src = card.src + "2";
    }
    card.src = card.src + ".svg";
  }
  for (const [margin_side, margin_value] of Object.entries(margins)) {
    card.style["margin" + capitalize_first_letter(margin_side)] = margin_value;
  }
  return card;
}

export function clear_table(cls) {
  const table = document.getElementById("table");

  const childrenToRemove = table.querySelectorAll(`.${cls}`);
  childrenToRemove.forEach((child) => child.remove());
}

export function draw_nametags(
  player_scores,
  round_scores,
  player_ids_to_sides
) {
  const table = document.getElementById("table");
  var nametag = null;
  var round_score = null;
  var float_margins = null;
  var margins = null;
  var label = null;

  clear_table("nametag");

  for (const [player_id, score] of player_scores.entries()) {
    nametag = document.createElement("div");

    nametag.classList.add("nametag");

    float_margins = {};

    var side = player_ids_to_sides[player_id];

    if (side === "bottom") {
      float_margins["right"] = 0.45 * table.offsetWidth;
      float_margins["top"] = 0.55 * table.offsetWidth;
    }
    if (side === "left") {
      float_margins["right"] = 0.8 * table.offsetWidth;
      float_margins["bottom"] = 0.45 * table.offsetWidth;
    }
    if (side === "top") {
      float_margins["left"] = 0.45 * table.offsetWidth;
      float_margins["bottom"] = 0.55 * table.offsetWidth;
    }
    if (side === "right") {
      float_margins["top"] = 0.45 * table.offsetWidth;
      float_margins["left"] = 0.8 * table.offsetWidth;
    }

    margins = margins_float_to_px(float_margins);

    for (const [margin_side, margin_value] of Object.entries(margins)) {
      nametag.style["margin" + capitalize_first_letter(margin_side)] =
        margin_value;
    }

    round_score = round_scores.get(player_id);
    label = `${player_id}\nround: ${round_score}\nmatch: ${score}`;
    nametag.innerText = label;
    table.appendChild(nametag);
  }
}

export function draw_status(text) {
  clear_table("status");

  const table = document.getElementById("table");

  var status = document.createElement("div");
  status.classList.add("status");

  status.innerText = text;
  table.appendChild(status);
}

export function draw_trick_card(side, val) {
  const table = document.getElementById("table");
  const multipliers = {
    bottom: -1,
    left: -1,
    top: -1,
    right: -1,
  };
  var margins = {};
  margins[side] = `${0.1 * multipliers[side] * table.offsetWidth}px`;
  let card = create_card(false, val, margins);

  card.classList.add("trick");
  table.appendChild(card);
}

export function draw_hand(hand, side, face_down) {
  const table = document.getElementById("table");
  hand = hand.slice();
  hand.sort((a, b) => {
    return (
      SUIT_ORDER.indexOf(a[0]) - SUIT_ORDER.indexOf(b[0]) ||
      RANKS.indexOf(a[1]) - RANKS.indexOf(b[1])
    );
  });
  for (const [i, val] of hand.entries()) {
    var margins = {};

    if (["bottom", "top"].includes(side)) {
      const margins_float = {
        left: -0.2 * (hand.length / MAX_HAND_SIZE) * table.offsetWidth,
        [side]: -0.55 * table.offsetWidth,
      };
      margins = margins_float_to_px(margins_float);
      margins.left = `${(margins_float.left ?? 0) + i * 0.035 * table.offsetWidth}px`;
    } else {
      const margins_float = {
        top: -0.2 * (hand.length / MAX_HAND_SIZE) * table.offsetWidth,
        [side]: -0.8 * table.offsetWidth,
      };
      margins = margins_float_to_px(margins_float);
      margins.top = `${(margins_float.top ?? 0) + i * 0.035 * table.offsetWidth}px`;
    }

    let card = create_card(face_down, val, margins);
    if (!face_down) {
      card.classList.add("playable");
      card.dataset.value = val;
    }

    card.classList.add("hand");
    table.appendChild(card);
  }
}
