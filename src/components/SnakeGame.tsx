import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Point, Direction, GameState } from '../types';
import {
  GRID_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INITIAL_SNAKE_LENGTH,
  GAME_SPEED,
  COLORS,
} from '../constants';

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [snake, setSnake] = useState<Point[]>([]);
  const [food, setFood] = useState<Point>({ x: 0, y: 0 });
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [nextDirection, setNextDirection] = useState<Direction>(Direction.RIGHT);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Refs for game loop to avoid dependency issues in setInterval/requestAnimationFrame
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const snakeRef = useRef<Point[]>([]);
  const directionRef = useRef<Direction>(Direction.RIGHT);

  // Initialize Game
  const initGame = useCallback(() => {
    const initialSnake: Point[] = [];
    const startX = Math.floor(CANVAS_WIDTH / GRID_SIZE / 4) * GRID_SIZE;
    const startY = Math.floor(CANVAS_HEIGHT / GRID_SIZE / 2) * GRID_SIZE;

    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      initialSnake.push({ x: startX - i * GRID_SIZE, y: startY });
    }

    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setDirection(Direction.RIGHT);
    directionRef.current = Direction.RIGHT;
    setNextDirection(Direction.RIGHT);
    setScore(0);
    generateFood(initialSnake);
    setGameState(GameState.PLAYING);
  }, []);

  const generateFood = (currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)) * GRID_SIZE,
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)) * GRID_SIZE,
      };
      // Ensure food doesn't spawn on snake
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    setFood(newFood);
  };

  const moveSnake = useCallback(() => {
    const head = { ...snakeRef.current[0] };

    switch (directionRef.current) {
      case Direction.UP:
        head.y -= GRID_SIZE;
        break;
      case Direction.DOWN:
        head.y += GRID_SIZE;
        break;
      case Direction.LEFT:
        head.x -= GRID_SIZE;
        break;
      case Direction.RIGHT:
        head.x += GRID_SIZE;
        break;
    }

    // Check Wall Collision
    if (
      head.x < 0 ||
      head.x >= CANVAS_WIDTH ||
      head.y < 0 ||
      head.y >= CANVAS_HEIGHT
    ) {
      gameOver();
      return;
    }

    // Check Self Collision
    if (snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameOver();
      return;
    }

    const newSnake = [head, ...snakeRef.current];

    // Check Food Collision
    if (head.x === food.x && head.y === food.y) {
      setScore(prev => {
        const newScore = prev + 10;
        if (newScore > highScore) setHighScore(newScore);
        return newScore;
      });
      generateFood(newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    setSnake(newSnake);
    // Update active direction from buffer
    setDirection(nextDirection);
    directionRef.current = nextDirection;
  }, [food, nextDirection, highScore]);

  const gameOver = () => {
    setGameState(GameState.GAME_OVER);
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== Direction.DOWN) setNextDirection(Direction.UP);
          break;
        case 'ArrowDown':
          if (direction !== Direction.UP) setNextDirection(Direction.DOWN);
          break;
        case 'ArrowLeft':
          if (direction !== Direction.RIGHT) setNextDirection(Direction.LEFT);
          break;
        case 'ArrowRight':
          if (direction !== Direction.LEFT) setNextDirection(Direction.RIGHT);
          break;
        case ' ': // Space to pause/resume
          if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
          else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameState]);

  // Game Loop
  useEffect(() => {
    const update = (time: number) => {
      if (gameState === GameState.PLAYING) {
        const deltaTime = time - lastUpdateTimeRef.current;
        if (deltaTime >= GAME_SPEED) {
          moveSnake();
          lastUpdateTimeRef.current = time;
        }
      }
      gameLoopRef.current = requestAnimationFrame(update);
    };

    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = requestAnimationFrame(update);
    }

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, moveSnake]);

  // Render Canvas
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;

    // Clear Canvas
    context.fillStyle = COLORS.BACKGROUND;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid
    context.strokeStyle = COLORS.GRID;
    context.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, CANVAS_HEIGHT);
      context.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(CANVAS_WIDTH, y);
      context.stroke();
    }

    // Draw Food
    context.fillStyle = COLORS.FOOD;
    context.shadowBlur = 15;
    context.shadowColor = COLORS.FOOD;
    context.beginPath();
    context.arc(food.x + GRID_SIZE / 2, food.y + GRID_SIZE / 2, GRID_SIZE / 2.5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    // Draw Snake
    snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? COLORS.SNAKE_HEAD : COLORS.SNAKE_BODY;
      context.shadowBlur = index === 0 ? 10 : 0;
      context.shadowColor = COLORS.SNAKE_HEAD;
      
      // Rounded rectangles for snake sections
      const padding = 2;
      const x = segment.x + padding;
      const y = segment.y + padding;
      const size = GRID_SIZE - padding * 2;
      const radius = 4;

      context.beginPath();
      context.roundRect(x, y, size, size, radius);
      context.fill();
      context.shadowBlur = 0;
    });

  }, [snake, food]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-8 font-sans text-slate-50">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-green-500 uppercase italic">
              Neon Snake
            </h1>
            <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
              Level 01 // System Operational
            </p>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col items-end">
              <span className="text-xs uppercase tracking-widest text-slate-500">Score</span>
              <span className="text-2xl font-mono font-bold">{score.toString().padStart(6, '0')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs uppercase tracking-widest text-slate-500">High Score</span>
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-yellow-500" />
                <span className="text-2xl font-mono font-bold text-yellow-500">{highScore.toString().padStart(6, '0')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative border-4 border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-green-500/10">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto cursor-none block"
          />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === GameState.START && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10"
              >
                <div className="text-center p-8 border-2 border-green-500 rounded-3xl bg-slate-900 shadow-2xl shadow-green-500/20">
                  <Play size={64} className="text-green-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                  <h2 className="text-3xl font-black mb-2 italic uppercase">System Ready</h2>
                  <p className="text-slate-400 mb-8 max-w-xs mx-auto">
                    Use arrow keys to navigate. Collect red cells to expand. Do not collide with walls or self.
                  </p>
                  <button
                    onClick={initGame}
                    className="px-10 py-4 bg-green-500 text-slate-950 font-black uppercase italic rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/30"
                  >
                    Initiate Sequence
                  </button>
                </div>
              </motion.div>
            )}

            {gameState === GameState.PAUSED && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10 backdrop-blur-sm"
              >
                <div className="text-center">
                  <Pause size={80} className="text-white mx-auto mb-4 animate-pulse" />
                  <h2 className="text-4xl font-black italic uppercase">Paused</h2>
                  <p className="text-slate-300 mt-2">Press SPACE to resume</p>
                </div>
              </motion.div>
            )}

            {gameState === GameState.GAME_OVER && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-red-500/20 z-10 backdrop-blur-md"
              >
                <div className="bg-slate-900 p-12 border-4 border-red-500 rounded-3xl text-center shadow-2xl shadow-red-500/40">
                  <h2 className="text-6xl font-black text-red-500 italic uppercase mb-2">Critical Failure</h2>
                  <p className="text-2xl font-mono mb-8 uppercase tracking-widest">Game Over // Final Score: {score}</p>
                  <button
                    onClick={initGame}
                    className="flex items-center gap-3 px-10 py-5 bg-red-500 text-white font-black uppercase italic rounded-full mx-auto hover:bg-red-600 transition-colors shadow-xl shadow-red-500/30"
                  >
                    <RotateCcw size={24} />
                    Restart System
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer / Controls Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center gap-6">
            <div className="grid grid-cols-3 gap-2">
              <div />
              <div className="p-2 border border-slate-700 rounded bg-slate-800"><ArrowUp size={16} /></div>
              <div />
              <div className="p-2 border border-slate-700 rounded bg-slate-800"><ArrowLeft size={16} /></div>
              <div className="p-2 border border-slate-700 rounded bg-slate-800"><ArrowDown size={16} /></div>
              <div className="p-2 border border-slate-700 rounded bg-slate-800"><ArrowRight size={16} /></div>
            </div>
            <div>
              <h3 className="font-bold uppercase italic text-sm text-slate-400 mb-1">Navigation</h3>
              <p className="text-slate-500 text-xs">Standard directional arrow input.</p>
            </div>
          </div>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center gap-6">
            <div className="px-4 py-2 border border-slate-700 rounded bg-slate-800 font-mono text-sm">SPACE</div>
            <div>
              <h3 className="font-bold uppercase italic text-sm text-slate-400 mb-1">Pause/Resume</h3>
              <p className="text-slate-500 text-xs">Toggle play state during operation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
