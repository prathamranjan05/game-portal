class UltimateTicTacToe:
    def __init__(self):
        self.board = [["" for _ in range(9)] for _ in range(9)]
        self.mini_status = [["" for _ in range(3)] for _ in range(3)]
        self.current_player = "X"
        self.active_board = -1
        self.game_over = False
        self.winner = ""
        self.main_win_cells = []
        self.mode = "AI"

    def set_mode(self, mode):
        if mode in ["AI", "2P"]:
            self.mode = mode

    def check_winner(self, board):
        lines = [
            [(0, 0), (0, 1), (0, 2)],
            [(1, 0), (1, 1), (1, 2)],
            [(2, 0), (2, 1), (2, 2)],
            [(0, 0), (1, 0), (2, 0)],
            [(0, 1), (1, 1), (2, 1)],
            [(0, 2), (1, 2), (2, 2)],
            [(0, 0), (1, 1), (2, 2)],
            [(0, 2), (1, 1), (2, 0)],
        ]
        for line in lines:
            vals = [board[r][c] for r, c in line]
            if vals[0] != "" and vals.count(vals[0]) == 3:
                return vals[0], line
        for row in board:
            if "" in row:
                return "", []
        return "D", []

    def get_mini_board(self, mini_index):
        mini_row = mini_index // 3
        mini_col = mini_index % 3
        return [self.board[r][mini_col * 3: mini_col * 3 + 3] for r in range(mini_row * 3, mini_row * 3 + 3)]

    def apply_player_move(self, row, col, override_active_board=None):
        if self.game_over or not (0 <= row < 9) or not (0 <= col < 9) or self.board[row][col] != "":
            return False

        mini_board_index = (row // 3) * 3 + (col // 3)
        actual_active = override_active_board if override_active_board is not None else self.active_board
        if actual_active != -1 and mini_board_index != actual_active:
            if self.mini_status[actual_active // 3][actual_active % 3] in ["", "D"]:
                return False

        mini_r = mini_board_index // 3
        mini_c = mini_board_index % 3
        if self.mini_status[mini_r][mini_c] not in ["", "D"]:
            return False

        self.board[row][col] = self.current_player

        mini = self.get_mini_board(mini_board_index)
        mini_result, _ = self.check_winner(mini)
        self.mini_status[mini_r][mini_c] = mini_result if mini_result != "" else ""

        big_result, winning_line = self.check_winner(self.mini_status)
        if big_result in ["X", "O"]:
            self.game_over = True
            self.winner = big_result
            self.main_win_cells = [[r, c] for r, c in winning_line]
        elif big_result == "D":
            self.game_over = True
            self.winner = "D"
            self.main_win_cells = []

        next_active = (row % 3) * 3 + (col % 3)
        nr, nc = next_active // 3, next_active % 3
        if self.mini_status[nr][nc] in ["X", "O", "D"]:
            self.active_board = -1
        else:
            self.active_board = next_active

        self.current_player = "O" if self.current_player == "X" else "X"
        return True

    def get_main_board_win_cells(self):
        return self.main_win_cells

    def get_state(self):
        return {
            "board": self.board,
            "current_player": self.current_player,
            "mini_status": self.mini_status,
            "active_board": self.active_board,
            "game_over": self.game_over,
            "winner": self.winner,
            "main_win_cells": self.main_win_cells,
            "mode": self.mode
        }
