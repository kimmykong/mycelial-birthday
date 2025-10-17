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
  }

  let words: Word[] = $state([]);
  let containerWidth = $state(0);
  let containerHeight = $state(0);
  let container: HTMLDivElement;
  let showDebug = $state(false);

  function getSizeForRank(index: number, scaleFactor: number = 1): number {
    if (index < 5) return 80 * scaleFactor;
    if (index < 10) return 64 * scaleFactor;
    if (index < 15) return 52 * scaleFactor;
    if (index < 20) return 42 * scaleFactor;
    if (index < 25) return 34 * scaleFactor;
    return 28 * scaleFactor;
  }

  function getColorForPosition(y: number, offsetY: number, scale: number): string {
    // Convert screen Y to SVG Y coordinate
    const svgY = (y - offsetY) / scale;

    // Normalize Y position (30 = top of mushroom, 188 = bottom of stem)
    const normalized = (svgY - 30) / (188 - 30);
    const clamped = Math.max(0, Math.min(1, normalized));

    // Rainbow gradient from top to bottom
    const colors = [
      { r: 255, g: 0, b: 0 },     // red
      { r: 255, g: 127, b: 0 },   // orange
      { r: 255, g: 255, b: 0 },   // yellow
      { r: 0, g: 255, b: 0 },     // green
      { r: 0, g: 0, b: 255 },     // blue
      { r: 75, g: 0, b: 130 },    // indigo
      { r: 148, g: 0, b: 211 },   // violet
    ];

    // Determine which two colors to interpolate between
    const segment = clamped * (colors.length - 1);
    const index = Math.floor(segment);
    const nextIndex = Math.min(index + 1, colors.length - 1);
    const t = segment - index;

    const color1 = colors[index];
    const color2 = colors[nextIndex];

    const r = Math.round(color1.r + (color2.r - color1.r) * t);
    const g = Math.round(color1.g + (color2.g - color1.g) * t);
    const b = Math.round(color1.b + (color2.b - color1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
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
    const offsetY = (containerHeight - scaledHeight) / 2;

    console.log('Mushroom bounds:', { scale, offsetX, offsetY, scaledWidth, scaledHeight });

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
    // Tighter estimate for Arial bold
    return text.length * fontSize * 0.55;
  }

  function wordsOverlap(word1: Word, word2: Word): boolean {
    const w1 = getTextWidth(word1.text, word1.size);
    const h1 = word1.size * 1.2; // Add extra height for descenders
    const w2 = getTextWidth(word2.text, word2.size);
    const h2 = word2.size * 1.2;

    // Add padding - minimal to allow words to pack tightly
    const padding = 0;

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
    const wordHeight = size * 1.2;

    if (region === 'stem') {
      // Stem - vertically stacked, centered horizontally
      const centerX = 100;
      const x = centerX * scale + offsetX;
      const y = stemCurrentY * scale + offsetY;

      const insideMushroom = isInsideMushroom(x, y, wordWidth, wordHeight);
      if (insideMushroom && stemCurrentY + (wordHeight / scale) <= 188) {
        const color = getColorForPosition(y, offsetY, scale);
        const newWord = { text: adj.word, size, x, y, color };
        // Advance Y position for next word (touching bounds)
        stemCurrentY += (wordHeight / scale);
        return newWord;
      }
      return null;
    } else {
      // Cap - random placement with collision detection
      const minX = 35;
      const maxX = 165;
      const minY = 35;
      const maxY = 105;

      for (let attempts = 0; attempts < 500; attempts++) {
        const x = Math.random() * (maxX - minX) * scale + offsetX + minX * scale;
        const y = Math.random() * (maxY - minY) * scale + offsetY + minY * scale;

        const insideMushroom = isInsideMushroom(x, y, wordWidth, wordHeight);
        if (insideMushroom) {
          const color = getColorForPosition(y, offsetY, scale);
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
    console.log('initializeWords called with', adjectives.length, 'adjectives');
    console.log('Container dimensions:', containerWidth, containerHeight);

    let wordsToDisplay = adjectives;
    if (adjectives.length === 0) {
      console.log('Using placeholder data');
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

    let scaleFactor = 1;
    let placedWords: Word[] = [];
    let allPlaced = false;

    // Try with decreasing scale factors until all words fit
    while (!allPlaced && scaleFactor >= 0.4) {
      placedWords = [];
      stemCurrentY = 115; // Reset stem Y position for each attempt
      console.log(`Attempting placement with scale factor: ${scaleFactor}`);

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
          console.log(`✓ Placed long word "${adj.word}" in cap`);
        } else {
          unplacedWords.push(adj);
          console.log(`✗ Could not place long word "${adj.word}" in cap, will retry`);
        }
      }

      // Try to place short words in stem
      for (const adj of shortWords) {
        const index = wordsToDisplay.indexOf(adj);
        const word = tryPlaceWord(adj, index, scaleFactor, placedWords, 'stem', scale, offsetX, offsetY);

        if (word) {
          placedWords.push(word);
          console.log(`✓ Placed short word "${adj.word}" in stem`);
        } else {
          unplacedWords.push(adj);
          console.log(`✗ Could not place short word "${adj.word}" in stem, will retry in cap`);
        }
      }

      // Try to place remaining words in cap
      for (const adj of unplacedWords) {
        const index = wordsToDisplay.indexOf(adj);
        const word = tryPlaceWord(adj, index, scaleFactor, placedWords, 'cap', scale, offsetX, offsetY);

        if (word) {
          placedWords.push(word);
          console.log(`✓ Placed overflow word "${adj.word}" in cap`);
        } else {
          console.warn(`✗ Still could not place "${adj.word}"`);
        }
      }

      // Check if all words were placed
      if (placedWords.length === wordsToDisplay.length) {
        allPlaced = true;
        console.log(`✅ All ${wordsToDisplay.length} words placed with scale factor ${scaleFactor}`);
      } else {
        console.log(`⚠ Only placed ${placedWords.length}/${wordsToDisplay.length} words, reducing scale to ${(scaleFactor - 0.05).toFixed(2)}`);
        scaleFactor -= 0.05; // Smaller decrements for finer control
      }
    }

    if (!allPlaced) {
      console.error(`❌ Could not place all words even at scale factor ${scaleFactor}`);
    }

    words = placedWords;
  }

  onMount(() => {
    const updateSize = () => {
      containerWidth = container.clientWidth;
      containerHeight = container.clientHeight;
      console.log('Container size:', containerWidth, containerHeight);
      if (containerWidth > 0 && containerHeight > 0) {
        initializeWords();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        showDebug = !showDebug;
      }
    };

    // Wait for next tick to ensure container is rendered
    setTimeout(updateSize, 0);
    window.addEventListener('resize', updateSize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  $effect(() => {
    if (adjectives.length > 0 && containerWidth > 0) {
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
        <!-- Always show mushroom outline -->
        <path
          d="m 25,95 c 0,-40 40,-65 75,-65 35,0 75,25 75,65 0,10 -5,15 -15,15 h -35 c 0,40 4.21377,84 -25,84 -29.213771,0 -25,-44 -25,-84 H 40 C 30,110 25,105 25,95 Z"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.3"
        />

        {#if showDebug}
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
  {#each words as word (word.text)}
    {@const wordWidth = word.text.length * word.size * 0.55}
    {@const wordHeight = word.size * 1.2}

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
