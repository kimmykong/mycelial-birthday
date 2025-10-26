<script lang="ts">
  import { onMount } from 'svelte';

  interface Adjective {
    word: string;
    count: number;
  }

  let { adjectives = [] }: { adjectives: Adjective[] } = $props();

  interface Word {
    text: string;
    size: number;
    x: number;
    y: number;
    color: string;
    isCircle?: boolean; // For white mushroom dots
    id?: string; // Unique identifier for keying
  }

  let words: Word[] = $state([]);
  let containerWidth = $state(0);
  let containerHeight = $state(0);
  let container: HTMLDivElement;
  let showDebug = $state(false);
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  // Store mushroom bounds for color calculations
  let mushroomScale = $state(1);
  let mushroomOffsetX = $state(0);
  let mushroomOffsetY = $state(0);

  // Cache for text measurements to avoid repeated canvas operations
  const textWidthCache = new Map<string, number>();
  const textHeightCache = new Map<string, number>();

  function getSizeForRank(index: number, scaleFactor: number = 1): number {
    if (index < 5) return 80 * scaleFactor;
    if (index < 10) return 64 * scaleFactor;
    if (index < 15) return 52 * scaleFactor;
    if (index < 20) return 42 * scaleFactor;
    if (index < 25) return 34 * scaleFactor;
    return 28 * scaleFactor;
  }

  function getColorForPosition(y: number, x: number, offsetY: number, offsetX: number, scale: number): string {
    // Convert screen coordinates to SVG coordinates
    const svgY = (y - offsetY) / scale;
    const svgX = (x - offsetX) / scale;

    // Determine if in cap (y <= 110) or stem (y > 110)
    const isInCap = svgY <= 110;

    if (isInCap) {
      // Cap: Vertical gradient from dark red at top to orange-yellow at very bottom
      // Normalize Y position in cap (30 = top, 110 = bottom)
      const normalizedY = (svgY - 30) / (110 - 30);
      const clampedY = Math.max(0, Math.min(1, normalizedY));

      // Use exponential curve to keep red longer, only orange at very bottom
      const curve = Math.pow(clampedY, 3); // Cubic curve keeps it red until near the end

      // Dark red at top to orange-yellow at very bottom
      const darkRed = { r: 139, g: 0, b: 0 };        // #8b0000 (dark red)
      const orangeYellow = { r: 255, g: 200, b: 50 }; // #ffc832 (orange-yellow)

      const r = Math.round(darkRed.r + (orangeYellow.r - darkRed.r) * curve);
      const g = Math.round(darkRed.g + (orangeYellow.g - darkRed.g) * curve);
      const b = Math.round(darkRed.b + (orangeYellow.b - darkRed.b) * curve);

      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Stem: White colors with subtle gradient from left to right
      // Normalize X position across stem width (78 to 122)
      const normalizedX = (svgX - 78) / (122 - 78);
      const clampedX = Math.max(0, Math.min(1, normalizedX));

      // Off-white to pure white gradient
      const offWhite = { r: 245, g: 242, b: 237 };   // #f5f2ed
      const pureWhite = { r: 255, g: 255, b: 255 };  // #ffffff

      const r = Math.round(offWhite.r + (pureWhite.r - offWhite.r) * clampedX);
      const g = Math.round(offWhite.g + (pureWhite.g - offWhite.g) * clampedX);
      const b = Math.round(offWhite.b + (pureWhite.b - offWhite.b) * clampedX);

      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  function getMushroomBounds() {
    const svgWidth = 200;
    const svgHeight = 220;

    // Calculate the scale to match the SVG sizing - larger now to fit all words
    const maxWidth = Math.min(containerWidth * 0.95, 1200);
    const maxHeight = containerHeight * 0.95;
    const scale = Math.min(maxWidth / svgWidth, maxHeight / svgHeight);

    const scaledWidth = svgWidth * scale;
    const scaledHeight = svgHeight * scale;

    const offsetX = (containerWidth - scaledWidth) / 2;
    // Position mushroom in upper portion with spacing from top, leaving room for modal at bottom
    // Use 8% top margin, center in remaining upper 60% of space
    const topMargin = containerHeight * 0.08;
    const availableHeight = containerHeight * 0.6;
    const offsetY = topMargin + (availableHeight - scaledHeight) / 2;

    return { scale, offsetX, offsetY };
  }

  function isInsideMushroom(x: number, y: number, wordWidth: number = 0, wordHeight: number = 0): boolean {
    const { scale, offsetX, offsetY } = getMushroomBounds();

    // Check all four corners of the word bounding box
    const corners = [
      { x: x - wordWidth/2, y: y - wordHeight/2 }, // top-left
      { x: x + wordWidth/2, y: y - wordHeight/2 }, // top-right
      { x: x - wordWidth/2, y: y + wordHeight/2 }, // bottom-left
      { x: x + wordWidth/2, y: y + wordHeight/2 }, // bottom-right
    ];

    // All corners must be inside the mushroom
    return corners.every(corner => {
      const svgX = (corner.x - offsetX) / scale;
      const svgY = (corner.y - offsetY) / scale;

      // Cap region (circular top half) - half-circle shape
      if (svgY >= 30 && svgY <= 110) {
        const centerX = 100;
        const centerY = 110; // Bottom of the circle at y=110
        const radius = 75; // Circle radius
        const distanceFromCenter = Math.sqrt(Math.pow(svgX - centerX, 2) + Math.pow(svgY - centerY, 2));
        // Check if inside circle and above the center line (top half only)
        if (distanceFromCenter <= radius && svgY <= centerY) {
          return true;
        }
      }

      // Stem region - tighter bounds and correct max Y
      if (svgY > 110 && svgY <= 188) { // Reduced from 192 to 188 for safer margin
        if (svgX >= 78 && svgX <= 122) { // Tighter: was 76-124
          return true;
        }
      }

      return false;
    });
  }

  function getTextWidth(text: string, fontSize: number): number {
    // Check cache first
    const cacheKey = `${text}-${fontSize}`;
    const cached = textWidthCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Use canvas to measure actual text width
    if (!ctx) {
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      ctx = canvas.getContext('2d');
    }

    let width: number;
    if (ctx) {
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      width = ctx.measureText(text).width;
    } else {
      // Fallback estimation if canvas not available
      width = text.length * fontSize * 0.55;
    }

    // Cache the result
    textWidthCache.set(cacheKey, width);
    return width;
  }

  function getTextHeight(text: string, fontSize: number): number {
    // Check cache first
    const cacheKey = `${text}-${fontSize}`;
    const cached = textHeightCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Use canvas to measure actual text height
    if (!ctx) {
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      ctx = canvas.getContext('2d');
    }

    let height: number;
    if (ctx) {
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      const metrics = ctx.measureText(text);
      // actualBoundingBoxAscent + actualBoundingBoxDescent gives the actual height
      const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
      const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
      // Add asymmetric padding: 10% on ascent, 30% on descent (descenders need more space)
      height = ascent * 1.1 + descent * 1.3;
    } else {
      // Fallback estimation if canvas not available
      height = fontSize * 1.2;
    }

    // Cache the result
    textHeightCache.set(cacheKey, height);
    return height;
  }

  function wordsOverlap(word1: Word, word2: Word): boolean {
    const w1 = getTextWidth(word1.text, word1.size);
    const h1 = getTextHeight(word1.text, word1.size);
    const w2 = getTextWidth(word2.text, word2.size);
    const h2 = getTextHeight(word2.text, word2.size);

    // Add small padding to prevent tight overlaps
    const padding = 2;

    const horizontalOverlap = !(
      word1.x + w1/2 + padding < word2.x - w2/2 ||
      word1.x - w1/2 - padding > word2.x + w2/2
    );

    const verticalOverlap = !(
      word1.y + h1/2 + padding < word2.y - h2/2 ||
      word1.y - h1/2 - padding > word2.y + h2/2
    );

    return horizontalOverlap && verticalOverlap;
  }

  let stemCurrentY = 115; // Track current Y position in stem

  function tryPlaceWord(
    adj: { word: string; count: number },
    index: number,
    scaleFactor: number,
    placedWords: Word[],
    region: 'cap' | 'stem',
    scale: number,
    offsetX: number,
    offsetY: number
  ): Word | null {
    const size = getSizeForRank(index, scaleFactor);
    const wordWidth = getTextWidth(adj.word, size);
    const wordHeight = getTextHeight(adj.word, size);

    if (region === 'stem') {
      // Stem - vertically stacked, centered horizontally
      const centerX = 100;
      const x = centerX * scale + offsetX;
      const y = stemCurrentY * scale + offsetY;

      const insideMushroom = isInsideMushroom(x, y, wordWidth, wordHeight);
      const spacingBetweenWords = 4 / scale; // 4px spacing between words
      if (insideMushroom && stemCurrentY + (wordHeight / scale) + spacingBetweenWords <= 188) {
        const color = getColorForPosition(y, x, offsetY, offsetX, scale);
        const newWord = { text: adj.word, size, x, y, color };
        // Advance Y position for next word with spacing
        stemCurrentY += (wordHeight / scale) + spacingBetweenWords;
        return newWord;
      }
      return null;
    } else {
      // Cap - random placement with collision detection
      const minX = 35;
      const maxX = 165;
      const minY = 35;
      const maxY = 105;

      for (let attempts = 0; attempts < 1000; attempts++) {
        const x = Math.random() * (maxX - minX) * scale + offsetX + minX * scale;
        const y = Math.random() * (maxY - minY) * scale + offsetY + minY * scale;

        const insideMushroom = isInsideMushroom(x, y, wordWidth, wordHeight);
        if (insideMushroom) {
          const color = getColorForPosition(y, x, offsetY, offsetX, scale);
          const newWord = { text: adj.word, size, x, y, color };
          const overlaps = placedWords.some(existingWord => wordsOverlap(newWord, existingWord));

          if (!overlaps) {
            return newWord;
          }
        }
      }

      return null;
    }
  }

  function initializeWords() {
    let wordsToDisplay = adjectives;
    if (adjectives.length === 0) {
      wordsToDisplay = [
        { word: 'creative', count: 30 },
        { word: 'kind', count: 28 },
        { word: 'intelligent', count: 26 },
        { word: 'funny', count: 24 },
        { word: 'thoughtful', count: 22 },
        { word: 'caring', count: 20 },
        { word: 'ambitious', count: 18 },
        { word: 'inspiring', count: 16 },
        { word: 'generous', count: 14 },
        { word: 'passionate', count: 12 },
        { word: 'wise', count: 11 },
        { word: 'brave', count: 10 },
        { word: 'loyal', count: 9 },
        { word: 'honest', count: 8 },
        { word: 'patient', count: 7 },
        { word: 'cheerful', count: 6 },
        { word: 'empathetic', count: 5 },
        { word: 'determined', count: 4 },
        { word: 'fun', count: 4 },
        { word: 'warm', count: 4 },
        { word: 'bright', count: 3 },
        { word: 'curious', count: 3 },
        { word: 'genuine', count: 3 },
        { word: 'playful', count: 2 },
        { word: 'confident', count: 2 },
        { word: 'open', count: 2 },
        { word: 'cool', count: 2 },
        { word: 'sweet', count: 1 },
        { word: 'silly', count: 1 },
        { word: 'amazing', count: 1 },
      ];
    }

    const { scale, offsetX, offsetY } = getMushroomBounds();

    // Store bounds for template color calculations
    mushroomScale = scale;
    mushroomOffsetX = offsetX;
    mushroomOffsetY = offsetY;

    // Start with larger scale for fewer words
    // Scale from 1.0 (30+ words) to 2.0 (1-5 words)
    const wordCount = wordsToDisplay.length;
    let initialScaleFactor = 1.0;
    if (wordCount <= 5) {
      initialScaleFactor = 2.0;
    } else if (wordCount <= 10) {
      initialScaleFactor = 1.6;
    } else if (wordCount <= 15) {
      initialScaleFactor = 1.4;
    } else if (wordCount <= 20) {
      initialScaleFactor = 1.2;
    }

    let scaleFactor = initialScaleFactor;
    let placedWords: Word[] = [];
    let allPlaced = false;

    // Try with decreasing scale factors until all words fit
    while (!allPlaced && scaleFactor >= 0.3) {
      placedWords = [];
      stemCurrentY = 115; // Reset stem Y position for each attempt

      // Separate words by length
      const longWords = wordsToDisplay.filter(adj => adj.word.length > 6);
      const shortWords = wordsToDisplay.filter(adj => adj.word.length <= 6);
      const unplacedWords: typeof wordsToDisplay = [];

      // Try to place long words in cap
      for (const adj of longWords) {
        const index = wordsToDisplay.indexOf(adj);
        const word = tryPlaceWord(adj, index, scaleFactor, placedWords, 'cap', scale, offsetX, offsetY);

        if (word) {
          placedWords.push(word);
        } else {
          unplacedWords.push(adj);
        }
      }

      // Try to place short words in stem
      for (const adj of shortWords) {
        const index = wordsToDisplay.indexOf(adj);
        const word = tryPlaceWord(adj, index, scaleFactor, placedWords, 'stem', scale, offsetX, offsetY);

        if (word) {
          placedWords.push(word);
        } else {
          unplacedWords.push(adj);
        }
      }

      // Try to place remaining words in cap with more attempts
      const stillUnplaced: typeof wordsToDisplay = [];
      for (const adj of unplacedWords) {
        const index = wordsToDisplay.indexOf(adj);
        const word = tryPlaceWord(adj, index, scaleFactor, placedWords, 'cap', scale, offsetX, offsetY);

        if (word) {
          placedWords.push(word);
        } else {
          stillUnplaced.push(adj);
        }
      }

      // Check if all words were placed
      if (placedWords.length === wordsToDisplay.length) {
        allPlaced = true;
      } else {
        scaleFactor -= 0.05; // Smaller decrements for finer control

        // If we've tried enough and have most words placed, accept it
        if (scaleFactor < 0.3 && placedWords.length >= wordsToDisplay.length * 0.7) {
          allPlaced = true;
        }
      }
    }

    // Add white circle dots to the mushroom cap (only if we have some words)
    if (placedWords.length > 0) {
      // Find the highest word (minimum Y position)
      const highestWordY = Math.min(...placedWords.map(w => w.y - getTextHeight(w.text, w.size) / 2));

      const maxDotsToPlace = 10;
      const minDotDistance = 30; // Minimum distance between dots in pixels
      let dotsPlaced = 0;
      const placedDots: Word[] = [];

      for (let i = 0; i < maxDotsToPlace; i++) {
        const dot = tryPlaceWord(
          { word: `●${i}`, count: 1 }, // Circle character with unique identifier
          999 + i, // High index for small size
          scaleFactor,
          placedWords,
          'cap', // Only place in cap
          scale,
          offsetX,
          offsetY
        );

        if (dot) {
          const dotTop = dot.y - getTextHeight(dot.text, dot.size) / 2;

          // Check if dot is below the highest word
          if (dotTop < highestWordY) {
            continue;
          }

          // Check if this dot is too close to other dots
          const tooClose = placedDots.some(existingDot => {
            const dx = dot.x - existingDot.x;
            const dy = dot.y - existingDot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < minDotDistance;
          });

          if (!tooClose) {
            dot.isCircle = true;
            dot.id = `dot-${i}`; // Unique ID for this dot
            dot.text = '●'; // Override text to just show the circle without the number
            dot.color = 'rgba(255, 255, 255, 0.95)'; // White with slight transparency
            dot.size = 24; // Medium size dots
            placedWords.push(dot);
            placedDots.push(dot);
            dotsPlaced++;
          }
        }
      }
    }

    words = placedWords;
  }

  onMount(() => {
    const updateSize = () => {
      containerWidth = container.clientWidth;
      containerHeight = container.clientHeight;
      if (containerWidth > 0 && containerHeight > 0) {
        initializeWords();
      }
    };

    // Debounce resize events to avoid excessive recalculations
    let resizeTimeout: number;
    const debouncedUpdateSize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(updateSize, 150);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        showDebug = !showDebug;
      }
    };

    // Wait for next tick to ensure container is rendered
    setTimeout(updateSize, 0);
    window.addEventListener('resize', debouncedUpdateSize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedUpdateSize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  $effect(() => {
    // Re-initialize whenever adjectives change or container is ready
    if (containerWidth > 0) {
      initializeWords();
    }
  });
</script>

<style>
  .word {
    position: absolute;
    font-family: Arial, sans-serif;
    font-weight: bold;
    pointer-events: none;
    user-select: none;
    transform: translate(-50%, -50%);
    transition: none;
  }
</style>

<div bind:this={container} class="relative w-full h-full">
  <!-- SVG Background -->
  {#if containerWidth > 0 && containerHeight > 0}
    {@const bounds = getMushroomBounds()}
    <div
      class="absolute pointer-events-none"
      style="
        left: {bounds.offsetX}px;
        top: {bounds.offsetY}px;
        width: {200 * bounds.scale}px;
        height: {220 * bounds.scale}px;
      "
    >
      <svg
        viewBox="0 0 200 220"
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-full"
      >
        {#if showDebug}
          <!-- Mushroom outline -->
          <path
            d="m 25,95 c 0,-40 40,-65 75,-65 35,0 75,25 75,65 0,10 -5,15 -15,15 h -35 c 0,40 4.21377,84 -25,84 -29.213771,0 -25,-44 -25,-84 H 40 C 30,110 25,105 25,95 Z"
            fill="none"
            stroke="black"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.3"
          />

          <!-- Debug: Show actual cap half-circle bounds -->
          <path d="M 25,110 A 75,75 0 0,1 175,110" fill="none" stroke="red" stroke-width="1" opacity="0.5" />

          <!-- Debug: Show actual stem rectangle bounds -->
          <rect x="78" y="110" width="44" height="78" fill="none" stroke="blue" stroke-width="1" opacity="0.5" />
        {/if}
      </svg>
    </div>

    {#if showDebug}
      <!-- Debug info overlay -->
      <div class="absolute top-4 left-4 bg-black/70 text-white text-xs p-2 rounded font-mono pointer-events-none">
        <div>Scale: {bounds.scale.toFixed(2)}</div>
        <div>Offset: ({Math.round(bounds.offsetX)}, {Math.round(bounds.offsetY)})</div>
        <div>Container: {containerWidth}x{containerHeight}</div>
        <div>Mushroom: {Math.round(200 * bounds.scale)}x{Math.round(220 * bounds.scale)}</div>
        <div class="mt-1 text-red-400">Red: Cap half-circle (center=(100,110), radius=75)</div>
        <div class="text-blue-400">Blue: Stem rect (x=78-122, y=110-188)</div>
        <div class="mt-1 text-green-400">Press SPACE to toggle debug</div>
      </div>
    {/if}
  {/if}

  <!-- Words -->
  {#each words as word (word.id || word.text)}
    {@const wordWidth = getTextWidth(word.text, word.size)}
    {@const wordHeight = getTextHeight(word.text, word.size)}

    {#if showDebug}
      <!-- Debug: Word bounding box -->
      <div
        class="absolute pointer-events-none"
        style="
          left: {word.x - wordWidth/2}px;
          top: {word.y - wordHeight/2}px;
          width: {wordWidth}px;
          height: {wordHeight}px;
          border: 1px solid rgba(0, 255, 0, 0.3);
        "
      ></div>
    {/if}

    <div
      class="word"
      style="
        left: {word.x}px;
        top: {word.y}px;
        font-size: {word.size}px;
        color: {word.color};
      "
    >
      {word.text}
    </div>
  {/each}
</div>
