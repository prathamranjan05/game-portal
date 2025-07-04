import random
from collections import deque, Counter

def generate_dynamic_maze(width, height, start=None, end=None, move_log=None, max_attempts=100):
    direction_bias = get_direction_bias(move_log or [], width, height)

    for _ in range(max_attempts):
        maze = [['wall'] * width for _ in range(height)]
        for y in range(height):
            for x in range(width):
                bias = direction_bias.get((x, y), 0)
                wall_chance = min(0.6, 0.35 + bias)
                if random.random() > wall_chance:
                    maze[y][x] = 'path'

        start = start or [0, 0]
        end = end or [width - 1, height - 1]
        maze[start[1]][start[0]] = 'path'
        if end != start:
            maze[end[1]][end[0]] = 'path'


        if find_path(maze, start, end):
            return maze, start, end
    raise Exception("Failed to generate solvable maze after 100 attempts")

def find_path(maze, start, end):
    width, height = len(maze[0]), len(maze)
    queue = deque([(start, [])])
    visited = set()

    while queue:
        (x, y), path = queue.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        path = path + [(x, y)]

        if [x, y] == end:
            return path

        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and maze[ny][nx] == 'path':
                queue.append(((nx, ny), path))
    return None

def get_direction_bias(move_log, width=10, height=10):
    bias_map = {}
    direction_counts = Counter(move_log)
    total_moves = sum(direction_counts.values())
    if total_moves == 0:
        return bias_map

    direction_weights = {
        'up': direction_counts['up'] / total_moves,
        'down': direction_counts['down'] / total_moves,
        'left': direction_counts['left'] / total_moves,
        'right': direction_counts['right'] / total_moves,
    }

    for y in range(height):
        for x in range(width):
            bias = 0
            if direction_weights['up'] > 0.4 and y < height // 2:
                bias += 0.05
            if direction_weights['down'] > 0.4 and y > height // 2:
                bias += 0.05
            if direction_weights['left'] > 0.4 and x < width // 2:
                bias += 0.05
            if direction_weights['right'] > 0.4 and x > width // 2:
                bias += 0.05
            if bias > 0:
                bias_map[(x, y)] = bias
    return bias_map
