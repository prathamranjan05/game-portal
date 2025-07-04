from flask import Flask, render_template, request, jsonify, session
from mcts_ai import MCTS
from game_logic import UltimateTicTacToe
from maze_generator import generate_dynamic_maze, find_path
import json
import os
from datetime import datetime
import random

app = Flask(__name__)
app.secret_key = 'supersecret'

WIDTH, HEIGHT = 10, 10
scoreboard_file = "scoreboard.json"

@app.route('/')
def home():
    return render_template('home.html')

# ================= TTT =================

@app.route('/tic-tac-toe')
def tic_tac_toe():
    return render_template('ultimate_ttt.html')

@app.route('/ttt-reset', methods=['POST'])
def reset_tic_game():
    global tic_tac_toe_game
    tic_tac_toe_game = UltimateTicTacToe()
    return jsonify(success=True, message="Game reset successfully.")

@app.route('/ttt-move', methods=['POST'])
def ttt_move():
    global tic_tac_toe_game
    try:
        tic_tac_toe_game
    except NameError:
        tic_tac_toe_game = UltimateTicTacToe()

    data = request.get_json()
    if tic_tac_toe_game.game_over:
        return jsonify({"invalid": True, "message": "Game is already over", **tic_tac_toe_game.get_state()})

    player = data.get("player")
    row = data.get("row")
    col = data.get("col")
    active_board = data.get("active_board", -1)
    mode = data.get("mode", "AI")
    tic_tac_toe_game.set_mode(mode)

    if player == "X":
        if row is None or col is None:
            return jsonify({"invalid": True, "message": "Row and column required"})
        valid = tic_tac_toe_game.apply_player_move(row, col, active_board)
        if not valid:
            return jsonify({"invalid": True, "message": "Invalid move"})
        return jsonify({**tic_tac_toe_game.get_state(), "main_win_cells": tic_tac_toe_game.get_state().get("main_win_cells", [])})

    elif player == "O":
        if tic_tac_toe_game.mode == "2P":
            if row is None or col is None:
                return jsonify({"invalid": True, "message": "Row and column required"})
            valid = tic_tac_toe_game.apply_player_move(row, col, active_board)
            if not valid:
                return jsonify({"invalid": True, "message": "Invalid move"})
            return jsonify({**tic_tac_toe_game.get_state(), "main_win_cells": tic_tac_toe_game.get_state().get("main_win_cells", [])})
        else:
            if tic_tac_toe_game.current_player != "O":
                return jsonify({"invalid": True, "message": "Not AI's turn"})
            mcts = MCTS(iterations=500)
            best_move = mcts.get_move(tic_tac_toe_game)
            if best_move is None:
                tic_tac_toe_game.game_over = True
                tic_tac_toe_game.winner = "D"
                return jsonify({"invalid": True, "message": "No moves left for AI", **tic_tac_toe_game.get_state()})
            tic_tac_toe_game.apply_player_move(*best_move)
            state = tic_tac_toe_game.get_state()
            state["ai_last_move"] = {"row": best_move[0], "col": best_move[1]}
            return jsonify({**state, "main_win_cells": state.get("main_win_cells", [])})

    return jsonify({"invalid": True, "message": "Invalid player"})

# ================= Mind Maze =================

@app.route('/mind-maze')
def mind_maze():
    return render_template('mind_maze.html')

@app.route('/get_maze')
def get_maze():
    player_name = request.args.get("name", "Anonymous")
    move_log = []
    maze, start, end = generate_dynamic_maze(WIDTH, HEIGHT, move_log=move_log)
    session['maze'] = maze
    session['player'] = start
    session['end'] = end
    session['start_time'] = datetime.now().timestamp()
    session['player_name'] = player_name
    session['move_log'] = move_log
    session['move_count'] = 0
    return jsonify({'maze': maze, 'player': start, 'end': end})

@app.route('/move', methods=['POST'])
def maze_move():
    data = request.get_json()
    if not data or 'direction' not in data:
        return jsonify({'status': 'error', 'message': 'No direction provided'}), 400

    direction = data['direction']
    maze = session['maze']
    x, y = session['player']
    end = session['end']
    move_log = session.get('move_log', [])
    move_count = session.get('move_count', 0)

    dx, dy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}.get(direction, (0, 0))
    nx, ny = x + dx, y + dy

    if 0 <= nx < WIDTH and 0 <= ny < HEIGHT and maze[ny][nx] == 'path':
        session['player'] = [nx, ny]
        move_log.append(direction)
        move_count += 1
        session['move_log'] = move_log
        session['move_count'] = move_count

        if [nx, ny] == end:
            elapsed = round(datetime.now().timestamp() - session['start_time'], 2)
            score = {
                "player": session['player_name'],
                "time": elapsed,
                "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            scores = load_scoreboard()
            scores.append(score)
            scores.sort(key=lambda x: x["time"])
            top_scores = scores[:5]
            save_scoreboard(top_scores)

            top_player = score in top_scores
            best_player = score == top_scores[0]

            return jsonify({
                'status': 'won',
                'top_player': top_player,
                'best_player': best_player
            })

        new_maze, _, new_end = generate_dynamic_maze(WIDTH, HEIGHT, start=session['player'], move_log=move_log)
        if move_count % 3 == 0:
            candidates = []
            last_row, last_col = HEIGHT - 1, WIDTH - 1
            for x in range(WIDTH):
                if new_maze[last_row][x] == 'path' and [x, last_row] != session['player']:
                    candidates.append([x, last_row])
            for y in range(HEIGHT):
                if new_maze[y][last_col] == 'path' and [last_col, y] != session['player']:
                    candidates.append([last_col, y])
            if candidates:
                new_end = random.choice(candidates)

        session['maze'] = new_maze
        session['end'] = new_end
        return jsonify({'status': 'ok', 'maze': new_maze, 'player': session['player'], 'end': new_end})

    return jsonify({'status': 'blocked'})

@app.route('/reset', methods=['POST'])
def reset_maze():
    move_log = []
    maze, start, end = generate_dynamic_maze(WIDTH, HEIGHT, move_log=move_log)
    session['maze'] = maze
    session['player'] = start
    session['end'] = end
    session['start_time'] = datetime.now().timestamp()
    session['move_log'] = move_log
    session['move_count'] = 0
    return jsonify({'maze': maze, 'player': start, 'end': end})

@app.route('/hint')
def get_hint():
    maze = session['maze']
    path = find_path(maze, session['player'], session['end'])
    return jsonify({'hint': path})

@app.route('/scoreboard')
def scoreboard():
    return jsonify(load_scoreboard())

def load_scoreboard():
    try:
        with open(scoreboard_file, 'r') as f:
            return json.load(f)
    except:
        return []

def save_scoreboard(data):
    with open(scoreboard_file, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == '__main__':
    app.run(debug=True)
