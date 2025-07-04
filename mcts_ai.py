import copy
import random
import math

class MCTSNode:
    def __init__(self, game_state, parent=None, move=None):
        self.game_state = game_state
        self.parent = parent
        self.move = move
        self.children = []
        self.wins = 0
        self.visits = 0
        self.untried_moves = self.get_moves()

    def get_moves(self):
        return MCTS.get_legal_moves(self.game_state)

    def uct_select_child(self):
        return sorted(
            self.children,
            key=lambda c: c.wins / c.visits + math.sqrt(2 * math.log(self.visits) / c.visits)
        )[-1]

    def add_child(self, move, game_state):
        child = MCTSNode(game_state, self, move)
        self.untried_moves.remove(move)
        self.children.append(child)
        return child

    def update(self, result):
        self.visits += 1
        self.wins += result


class MCTS:
    def __init__(self, iterations=500):
        self.iterations = iterations

    def get_move(self, game):
        root = MCTSNode(copy.deepcopy(game))
        root_player = game.current_player

        for _ in range(self.iterations):
            node = root
            state = copy.deepcopy(game)

            # Selection
            while node.untried_moves == [] and node.children != []:
                node = node.uct_select_child()
                state.apply_player_move(*node.move, override_active_board=state.active_board)

            # Expansion
            if node.untried_moves:
                m = random.choice(node.untried_moves)
                state.apply_player_move(*m, override_active_board=state.active_board)
                node = node.add_child(m, copy.deepcopy(state))

            # Simulation
            result = self.simulate_random_playout(state, root_player)

            # Backpropagation
            while node is not None:
                node.update(result)
                node = node.parent

        best_child = max(root.children, key=lambda c: c.visits) if root.children else None
        return best_child.move if best_child else None

    @staticmethod
    def get_legal_moves(game):
        moves = []
        board = game.board
        active_board = game.active_board
        mini_status = game.mini_status

        for r in range(9):
            for c in range(9):
                mini_board_index = (r // 3) * 3 + (c // 3)
                if board[r][c] == "":
                    if active_board == -1 and mini_status[mini_board_index // 3][mini_board_index % 3] in ["", "D"]:
                        moves.append((r, c))
                    elif mini_board_index == active_board:
                        moves.append((r, c))
        return moves

    def simulate_random_playout(self, game, root_player):
        while not game.game_over:
            valid_moves = self.get_legal_moves(game)
            if not valid_moves:
                break
            move = self.choose_weighted_move(valid_moves)
            game.apply_player_move(*move, override_active_board=game.active_board)

        if game.winner == "D" or game.winner == "":
            return 0.5
        elif game.winner == root_player:
            return 1
        else:
            return 0

    def choose_weighted_move(self, moves):
        if not moves:
            return None
        center = [(4, 4)]
        corners = [(0, 0), (0, 8), (8, 0), (8, 8)]
        weights = []
        for move in moves:
            if move in center:
                weights.append(4)
            elif move in corners:
                weights.append(3)
            else:
                weights.append(1)
        return random.choices(moves, weights=weights)[0]
