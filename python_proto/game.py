from time import sleep
import random
from players import Player, DumbPlayer, HumanPlayer, AIPlayer
from llm_client import GeminiClient, CerebrasClient
from collections import namedtuple
from table import Table, Card, Play
from typing import Optional, Type


class Round:
    def __init__(self, no: int, pass_direction: dict[str, str]) -> None:
        self.no = no
        self.current_trick: list[Play] = []
        self.trick_no = 0
        self.leads_trick: Optional[str] = None
        self.hearts_broken = False
        self.queen_of_spades_broken = True  # False if no < 1 else True
        self.pass_direction = pass_direction
        self.player_moonshot: Optional[str] = None


class Game:
    def __init__(self, player_ids: list[str], players: dict[str, Player]) -> None:
        self.player_ids = player_ids  # order matters
        self.players = players
        self.player_scores = {player_id: 0 for player_id in self.player_ids}

        self.table = Table(player_ids=[])
        self.round_no = -1

        # round data
        self.round = Round(-1, pass_direction={})
        self.old_rounds: list[Round] = []
        print(f"Starting game with {self.player_ids}")

    def _calculate_whose_move(self) -> str:
        assert isinstance(self.round.leads_trick, str)

        return self.player_ids[
            (
                self.player_ids.index(self.round.leads_trick)
                + len(self.round.current_trick)
            )
            % 4
        ]

    def _pass_cards(self, passed_by_player: dict[str, set[Card]]) -> None:
        updates: dict[str, dict[str, set[Card]]] = {
            player_id: {"added": set(), "removed": set()}
            for player_id in self.player_ids
        }
        for player_id, passed_cards in passed_by_player.items():
            assert not passed_cards - self.table.hands[player_id]
            updates[player_id]["removed"].update(passed_cards)
            updates[self.round.pass_direction[player_id]]["added"].update(passed_cards)

        self.table.update_hands(updates)

        for player_id, hand in self.table.hands.items():
            if Card("♣", "2") in hand:
                self.round.leads_trick = player_id

    def _start_round(self) -> None:
        self.round_no += 1

        pass_direction = {
            self.player_ids[i]: self.player_ids[(i + 1 + self.round_no % 3) % 4]
            for i in range(4)
        }
        if self.round:
            self.old_rounds.append(self.round)
        self.round = Round(no=self.round_no, pass_direction=pass_direction)

        print(
            f"Starting round {self.round_no}. Scores: {self.player_scores}. Pass directions: {pass_direction}."
        )

        self.table = Table(player_ids=self.player_ids)

        # deal 13 cards
        for player_id in self.player_ids:
            self.table.deal_cards(13, player_id)

    def _filter_illegal_options(self, hand: set[Card], player_id: str) -> set[Card]:
        hand = hand.copy()

        if Card("♣", "2") in hand:
            return {Card("♣", "2")}

        leading_suit = (
            self.round.current_trick[0][1].suit if self.round.current_trick else None
        )
        leading_suit_cards = {
            card for card in self.table.hands[player_id] if card.suit == leading_suit
        }
        if leading_suit and leading_suit_cards:
            return leading_suit_cards

        if self.round.trick_no == 0:
            hand = {
                card for card in hand if card.suit != "♥" and card != Card("♠", "Q")
            }
        if not self.round.current_trick and not self.round.hearts_broken:
            safe = {card for card in hand if card.suit != "♥"}
            if safe:
                hand = safe
        return hand

    def _finish_trick(self) -> None:
        leading_suit = self.round.current_trick[0].card.suit
        trick_taken_by = sorted(
            [
                (self.table.ranks.index(card.rank), player_id)
                for player_id, card in self.round.current_trick
                if card.suit == leading_suit
            ]
        )[-1][1]

        cards_in_trick = [card for player_id, card in self.round.current_trick]
        self.table.cards_taken[trick_taken_by] |= set(cards_in_trick)

        print(
            f"Trick {self.round.trick_no}: {self.round.current_trick} taken by {trick_taken_by}"
        )

        self.round.leads_trick = trick_taken_by
        self.round.current_trick = []
        self.round.trick_no += 1

    def _make_play(self, player_id: str, played_card: Card) -> None:
        assert player_id == self._calculate_whose_move()
        self.table.update_hands({player_id: {"removed": {played_card}}})
        self.round.current_trick.append(Play(player_id, played_card))

        if any([card.suit == "♥" for player_id, card in self.round.current_trick]):
            self.round.hearts_broken = True

    def _round_continues(self) -> bool:
        if any(self.table.hands.values()):
            return True
        return False

    def _check_moonshot(self) -> Optional[str]:
        for player_id in self.player_ids:
            if (
                sum(
                    [
                        1
                        for suit, rank in self.table.cards_taken[player_id]
                        if suit == "♥"
                    ]
                )
                == 13
                and Card("♠", "Q") in self.table.cards_taken[player_id]
            ):
                return player_id
        return None

    def _finish_round(self) -> None:
        player_moonshot = self._check_moonshot()
        if player_moonshot:
            self.round.player_moonshot = player_moonshot
            print(
                f"Player {player_moonshot} shot the moon! Adding 26 to everyone else's score."
            )
            for player_id in [pid for pid in self.player_ids if pid != player_moonshot]:
                self.player_scores[player_id] += 26
        else:
            for player_id, cards_taken in self.table.cards_taken.items():
                self.player_scores[player_id] += sum(
                    (self.table.card_values[card] for card in cards_taken)
                )
        print(f"Round {self.round_no} over, scores: {self.player_scores}")

    def _game_continues(self) -> bool:
        if (
            any([v > 100 for v in self.player_scores.values()])
            and list(self.player_scores.values()).count(
                min(self.player_scores.values())
            )
            == 1  # check if there's a single winner
        ):

            print(f"Game finished! Scores: {self.player_scores}")
            return False
        return True

    def play_round(self) -> None:
        self._start_round()

        passed_cards = {}
        for player_id, player in self.players.items():
            pass_recipient = self.round.pass_direction[player_id]
            passed_cards[player_id] = player.pass_three_cards(
                hand=self.table.hands[player_id], recipient=pass_recipient
            )
            print(f"{player_id} passed {passed_cards[player_id]} to {pass_recipient}")
        self._pass_cards(passed_cards)

        while self._round_continues():
            for player_id in self.player_ids:
                assert [isinstance(c, Card) for c in self.table.hands[player_id]]

            player_id = self._calculate_whose_move()
            player_order = [
                (self.player_ids.index(player_id) + i) % 4 for i in range(0, 4)
            ]
            print(
                f"Starting trick {self.round.trick_no}. Order: {[self.player_ids[i] for i in player_order]}"
            )
            assert (
                len(set(len(hand) for hand in self.table.hands.values())) == 1
            )  # assert everyone has the same number of cards in hand
            for _ in range(4):

                player_id = self._calculate_whose_move()
                player = self.players[player_id]

                print(f"{player_id} moves...")
                played_card = player.select_card_for_trick(
                    hand=self.table.hands[player_id],
                    legal_cards=self._filter_illegal_options(
                        self.table.hands[player_id], player_id
                    ),
                    trick=self.round.current_trick,
                    cards_taken=self.table.cards_taken,
                )
                self._make_play(player_id, played_card)

            self._finish_trick()

        self._finish_round()

    def play(self) -> None:
        while self._game_continues():
            self.play_round()


if __name__ == "__main__":
    llm_client = CerebrasClient()

    for i in range(10):
        player_classes: list[Type[Player]] = [AIPlayer, DumbPlayer, DumbPlayer, DumbPlayer]
        player_ids: list[str] = ["Tom", "Mary", "Holly", "Joslyn"]
        players: dict[str, Player] = {}
        for player_id, player_class in zip(player_ids, player_classes):
            players[player_id] = player_class(
                player_id=player_id,
                opponents=[pid for pid in player_ids if pid != player_id],
                llm_client=llm_client,
                count_cards=False,
                shoot_the_moon=False,
            )

        game = Game(player_ids=player_ids, players=players)
        game.play()
