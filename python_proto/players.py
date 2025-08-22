import random
from abc import ABC, abstractmethod
from time import sleep
from table import Card, Play
from llm_client import Client


class Player(ABC):
    @abstractmethod
    def __init__(
        self,
        player_id: str,
        opponents: list[str],
        llm_client: Client,
        count_cards: bool,
        shoot_the_moon: bool,
    ) -> None:
        pass

    @abstractmethod
    def pass_three_cards(self, hand: set[Card], recipient: str) -> set[Card]:
        pass

    @abstractmethod
    def select_card_for_trick(
        self,
        hand: set[Card],
        legal_cards: set[Card],
        trick: list[Play],
        cards_taken: dict[str, set[Card]],
    ) -> Card:
        pass


class DumbPlayer(Player):
    """Always plays the safest card"""

    def __init__(
        self,
        player_id: str,
        opponents: list[str],
        llm_client: Client,
        count_cards: bool,
        shoot_the_moon: bool,
    ) -> None:
        pass

    def pass_three_cards(self, hand: set[Card], recipient: str) -> set[Card]:
        cards_to_pass = set(random.sample(sorted(hand), 3))
        return cards_to_pass

    def select_card_for_trick(
        self,
        hand: set[Card],
        legal_cards: set[Card],
        trick: list[Play],
        cards_taken: dict[str, set[Card]],
    ) -> Card:
        pass
        leading_suit = trick[0].card.suit if trick else None
        ordered_hand = []
        legal_cards = legal_cards.copy()
        bad_cards = []
        for card in legal_cards:
            if card == Card("♠", "Q"):
                bad_cards.append(card)
            if card.suit == leading_suit:
                ordered_hand.append(card)
            if card.suit == "♥":
                bad_cards.append(card)
        ordered_hand += legal_cards - set(ordered_hand) - set(bad_cards)
        ordered_hand += bad_cards

        played_card = ordered_hand[0]
        return played_card


class AIPlayer(Player):
    def __init__(
        self,
        player_id: str,
        opponents: list[str],
        llm_client: Client,
        count_cards: bool,
        shoot_the_moon: bool,
    ) -> None:
        self.count_cards = count_cards
        self.system_prompt = f"Your name is {player_id} and you're playing a game of Hearts against {', '.join(opponents)}."
        if shoot_the_moon:
            self.system_prompt = self.system_prompt + "\nTry to shoot the moon!"
        self.llm_client = llm_client
        self.period = 1

    def pass_three_cards(self, hand: set[Card], recipient: str) -> set[Card]:
        while True:
            try:
                prompt = f"Choose 3 cards to pass to {recipient}. Your hand: {hand}. Reply ONLY with a list of cards to pass like: '♦10,♣2,♥A'."
                reply = self.llm_client.get_response(self.system_prompt, prompt)
                cards_to_pass = set(
                    [
                        Card(item[0], item[1:])
                        for card in reply.split(",")
                        for item in card.strip().split(",")
                    ]
                )

                assert all(
                    [card in hand for card in cards_to_pass]
                ), "not all picked cards are in hand"
                assert len(cards_to_pass) == 3, "not enough cards picked for pass"
                break
            except Exception as e:
                print(f"Didn't work ({e}), trying again...")
                sleep(self.period)
        return cards_to_pass

    def select_card_for_trick(
        self,
        hand: set[Card],
        legal_cards: set[Card],
        trick: list[Play],
        cards_taken: dict[str, set[Card]],
    ) -> Card:
        pass
        while True:
            try:
                prompt = f"Choose a card to play in current trick. The trick so far: {trick}. Your hand: {hand}. Cards you can legally play: {legal_cards}\n"
                if self.count_cards:
                    prompt = (
                        prompt
                        + f"You have been counting cards that have been taken so far, use this to your advantage: {cards_taken}.\n"
                    )
                prompt = (
                    prompt
                    + "Reply ONLY with a card that's LEGAL to play in the format: '♣J'."
                )
                reply = self.llm_client.get_response(self.system_prompt, prompt)
                played_card = Card(reply[0], reply[1:])
                assert played_card in legal_cards, "illegal card picked"
                break
            except Exception as e:
                print(f"Didn't work ({e}), trying again...")
                sleep(self.period)
        return played_card


class HumanPlayer(Player):
    def __init__(
        self,
        player_id: str,
        opponents: list[str],
        llm_client: Client,
        count_cards: bool,
        shoot_the_moon: bool,
    ) -> None:
        pass

    def pass_three_cards(self, hand: set[Card], recipient: str) -> set[Card]:
        while True:
            try:
                user_input = input(
                    f"Passing three cards to {recipient}. Your hand is {hand}. List cards to pass like '♦10,♣2,♥A':"
                )
                cards_to_pass = [
                    Card(card[0].strip(), card[1:].strip())
                    for card in user_input.split(",")
                ]
                assert all([card in hand for card in cards_to_pass])
                break
            except Exception:
                print("That didn't work, try again...")

        cards_to_pass = random.sample(sorted(hand), 3)
        return set(cards_to_pass)

    def select_card_for_trick(
        self,
        hand: set[Card],
        legal_cards: set[Card],
        trick: list[Play],
        cards_taken: dict[str, set[Card]],
    ) -> Card:
        pass
        while True:
            try:
                user_input = input(
                    f"It's your turn to play the trick. Your hand is {hand}. Cards you can legally play: {legal_cards}. Trick so far: {trick}. Select a card to play like '♣J':"
                )
                played_card = Card(user_input[0].strip(), user_input[1:].strip())
                assert played_card in legal_cards
                break
            except Exception:
                print("That didn't work, try again...")
        return played_card
