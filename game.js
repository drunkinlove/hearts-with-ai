import { Table, RANKS } from "./table.js";
import {
  draw_trick_card,
  draw_hand,
  clear_table,
  draw_nametags,
  draw_status,
} from "./renderer.js";

class Round {
  constructor(no, pass_direction) {
    this.no = no;
    this.current_trick = [];
    this.trick_no = 0;
    this.leads_trick = null;
    this.hearts_broken = false;
    this.pass_direction = pass_direction;
    this.player_moonshot = null;
  }
}

export class Game {
  constructor(player_ids, players, renderer) {
    this.player_ids = player_ids;
    this.players = players;

    const sides = ["bottom", "left", "top", "right"];
    this.player_ids_to_sides = Object.fromEntries(
      sides.map((s, i) => [player_ids[i], s])
    );

    this.player_scores = new Map();
    player_ids.forEach((player_id) => this.player_scores.set(player_id, 0));

    this.table = new Table(player_ids);

    this.round_no = -1;
    this.round = null;
    this.old_rounds = [];
    this.renderer = renderer;
  }

  _calculate_whose_move() {
    return (
      (this.player_ids.indexOf(this.round.leads_trick) +
        this.round.current_trick.length) %
      4
    );
  }

  _pass_cards(passed_by_player) {
    const updates = new Map();
    this.player_ids.forEach((player_id) =>
      updates.set(
        player_id,
        new Map([
          ["added", []],
          ["removed", []],
        ])
      )
    );

    for (const [player_id, passed_cards] of passed_by_player.entries()) {
      updates.get(player_id).set("removed", passed_cards); // remove cards from the passer
      var recipient = this.round.pass_direction.get(player_id);
      updates.get(recipient).set("added", passed_cards); // add cards to the recipient
    }

    this.table.update_hands(updates);

    for (const [player_id, hand] of this.table.hands.entries()) {
      if (hand.includes("♣2")) {
        this.round.leads_trick = player_id;
      }
    }
  }

  _start_round() {
    this.round_no += 1;

    const pass_direction = new Map();
    for (var i = 0; i < 4; i++) {
      pass_direction.set(
        this.player_ids[i],
        this.player_ids[(i + 1 + (this.round_no % 3)) % 4]
      );
    }

    if (this.round !== null) {
      this.old_rounds.push(Round);
    }
    this.round = new Round(this.round_no, pass_direction);

    console.log(
      `Starting round ${this.round_no}. Scores: ${[...this.player_scores.entries()]}. Pass directions: ${[...pass_direction.entries()]}.`
    );

    this.table = new Table(this.player_ids);

    for (const player_id of this.player_ids) {
      this.table.deal_cards(13, player_id);
    }
  }

  _filter_illegal_options(hand, player_id) {
    hand = hand.slice();

    if (hand.includes("♣2")) {
      return ["♣2"];
    }

    const leading_suit =
      this.round.current_trick.length !== 0
        ? this.round.current_trick[0][1][0]
        : null;
    const leading_suit_cards = this.table.hands
      .get(player_id)
      .filter((card) => card[0] === leading_suit);

    if ((leading_suit !== null) & (leading_suit_cards.length !== 0)) {
      return leading_suit_cards;
    }

    if (this.round.trick_no === 0) {
      hand = hand.filter((card) => card[0] !== "♥");
      hand = hand.filter((card) => card !== "♠Q");
    }

    if ((this.round.current_trick.length === 0) & !this.round.hearts_broken) {
      const safe = hand.filter((card) => card[0] !== "♥");
      if (safe.length !== 0) {
        hand = safe;
      }
    }
    return hand;
  }

  _finish_trick() {
    const leading_suit = this.round.current_trick[0][1][0];

    const plays_followed_suit = this.round.current_trick.filter(
      (play) => play[1][0] === leading_suit
    );

    var highest_rank = -1;
    var trick_taken_by = null;

    for (const [player_id, card] of plays_followed_suit) {
      var current_rank = RANKS.indexOf(card[1]);
      if (highest_rank < current_rank) {
        highest_rank = current_rank;
        trick_taken_by = player_id;
      }
    }

    const cards_in_trick = this.round.current_trick.map((item) => item[1]);

    this.table.cards_taken.set(
      trick_taken_by,
      this.table.cards_taken.get(trick_taken_by).concat(cards_in_trick)
    );

    console.log(
      `Trick ${this.round.trick_no}: ${this.round.current_trick} taken by ${trick_taken_by}`
    );
    this.round.leads_trick = trick_taken_by;
    this.round.current_trick = [];
    this.round.trick_no += 1;
  }

  _make_play(player_id, played_card) {
    const updates = new Map([
      [
        player_id,
        new Map([
          ["added", []],
          ["removed", [played_card]],
        ]),
      ],
    ]);

    this.table.update_hands(updates);
    this.round.current_trick.push([player_id, played_card]);

    const hearts_played = this.round.current_trick.filter(
      ([player_id, played_card]) => played_card[0] === "♥"
    );
    if (hearts_played.length !== 0) {
      this.round.hearts_broken = true;
    }
  }

  _round_continues() {
    for (const hand of this.table.hands.values()) {
      if (hand.length !== 0) {
        return true;
      }
    }
    return false;
  }

  _tally_score_in_round(player_id) {
    var score_in_round = 0;
    for (const card of this.table.cards_taken.get(player_id)) {
      score_in_round += this.table.card_values.get(card);
    }
    return score_in_round;
  }

  _check_moonshot() {
    for (const player_id of this.player_ids) {
      var score_in_round = this._tally_score_in_round(player_id);
      if (score_in_round === 26) {
        return player_id;
      }
    }
    return null;
  }

  _finish_round() {
    const player_moonshot = this._check_moonshot();
    if (player_moonshot !== null) {
      this.round.player_moonshot = player_moonshot;
      console.log(
        `Player ${player_moonshot} shot the moon! Adding 26 to everyone else's score.`
      );

      for (const player_id of this.player_ids.filter(
        (p) => p !== player_moonshot
      )) {
        this.player_scores.set(
          player_id,
          this.player_scores.get(player_id) + 26
        );
      }
    } else {
      for (const [player_id, cards_taken] of this.table.cards_taken.entries()) {
        var score_in_round = this._tally_score_in_round(player_id);
        this.player_scores.set(
          player_id,
          this.player_scores.get(player_id) + score_in_round
        );
      }
    }
    console.log(
      `Round ${this.round_no} over, scores: ${[...this.player_scores]}`
    );
  }

  _game_continues() {
    const hundred_reached =
      Array.from(this.player_scores.values().filter((s) => s >= 100)).length !==
      0;
    const lowest_score = Math.min(...this.player_scores.values());
    const several_winners =
      Array.from(this.player_scores.values().filter((x) => x === lowest_score))
        .length > 1;
    if (hundred_reached & !several_winners) {
      console.log(`Game over! Scores: ${[...this.player_scores]}`);

      draw_status(`Game over!`);
      return false;
    }
    return true;
  }

  async play_round() {
    var round_scores = new Map();
    this.player_ids.forEach((player_id) => round_scores.set(player_id, 0));

    draw_nametags(this.player_scores, round_scores, this.player_ids_to_sides);

    this._start_round();

    this._draw_hands();

    const passed_cards = new Map();
    for (const [player_id, player] of this.players.entries()) {
      var pass_recipient = this.round.pass_direction.get(player_id);

      passed_cards.set(
        player_id,
        await player.pass_three_cards(
          this.table.hands.get(player_id),
          pass_recipient
        )
      );
      console.log(
        `${player_id} passed ${passed_cards.get(player_id)} to ${pass_recipient}`
      );
    }
    this._pass_cards(passed_cards);

    this._draw_hands();

    while (this._round_continues()) {
      this.player_ids.forEach((player_id) => {
        round_scores.set(player_id, this._tally_score_in_round(player_id));
      });
      draw_nametags(this.player_scores, round_scores, this.player_ids_to_sides);

      var player_idx = this._calculate_whose_move();
      // var player_idx = this.player_ids.indexOf(player_id)
      var player_order = [];
      var player_order_ids = [];
      for (var i = 0; i < 4; i++) {
        player_order.push((player_idx + i) % 4);
        player_order_ids.push(this.player_ids[(player_idx + i) % 4]);
      }

      console.log(
        `Starting trick ${this.round.trick_no}. Order: ${player_order_ids}`
      );

      for (var t = 0; t < 4; t++) {
        var player_idx = this._calculate_whose_move();
        var player_id = this.player_ids[player_idx];
        var player = this.players.get(player_id);
        console.log(`${player_id} moves...`);
        var played_card = await player.select_card_for_trick(
          this.table.hands.get(player_id),
          this._filter_illegal_options(
            this.table.hands.get(player_id),
            player_id
          ),
          this.round.current_trick,
          this.table.cards_taken
        );

        this._make_play(player_id, played_card);

        this._draw_hands();
        draw_trick_card(this.player_ids_to_sides[player_id], played_card);

        await new Promise((r) => setTimeout(r, 1000));
      }
      this._finish_trick();

      clear_table("trick");
    }
    this._finish_round();
  }

  async _draw_hands() {
    clear_table("hand");

    for (var [player_id, side] of Object.entries(this.player_ids_to_sides)) {
      draw_hand(
        this.table.hands.get(player_id),
        side,
        side === "bottom" ? false : true
      );
    }
  }

  async play() {
    while (this._game_continues()) {
      await this.play_round();
    }
  }
}
