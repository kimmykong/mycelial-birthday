<script lang="ts">
  import { onMount } from 'svelte';
  import WordCloud from '$lib/components/WordCloud.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let word = $state('');
  let error = $state('');
  let loading = $state(false);
  let submissionCount = $state(data.submissionCount);
  let adjectives = $state(data.adjectives);
  let modalOpen = $state(true);
  let updateKey = $state(0);

  const isDone = $derived(submissionCount >= 5);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!word.trim()) {
      error = 'Please enter a word';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/adjectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });

      const result = await response.json();

      if (response.ok) {
        submissionCount = result.count;
        word = '';
        // Refresh adjectives
        const adjectivesResponse = await fetch('/api/adjectives');
        const newAdjectives = await adjectivesResponse.json();
        console.log('Fetched new adjectives:', newAdjectives.length, 'words');
        adjectives = newAdjectives;
        updateKey++; // Force re-render
      } else {
        error = result.error || 'Failed to submit word';
      }
    } catch (err) {
      error = 'An error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    modalOpen = false;
  }

  function openModal() {
    modalOpen = true;
  }
</script>

<div class="min-h-screen h-screen relative overflow-hidden bg-gradient-to-b from-[#0a1f0a] via-[#1a3a1a] to-[#2d4a1a]">
  <!-- Forest Background Layers -->
  <div class="absolute inset-0 w-full h-full">
    <!-- Far trees (darkest) -->
    <div class="absolute inset-0 opacity-20">
      <svg class="w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="trees-far" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
            <polygon points="20,100 30,60 40,100" fill="#0a1f0a" opacity="0.6"/>
            <polygon points="60,100 75,40 90,100" fill="#0a1f0a" opacity="0.5"/>
            <polygon points="120,100 135,50 150,100" fill="#0a1f0a" opacity="0.7"/>
            <polygon points="170,100 180,70 190,100" fill="#0a1f0a" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#trees-far)"/>
      </svg>
    </div>

    <!-- Mid trees -->
    <div class="absolute inset-0 opacity-30">
      <svg class="w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="trees-mid" x="0" y="0" width="250" height="100" patternUnits="userSpaceOnUse">
            <polygon points="40,100 55,50 70,100" fill="#1a3a1a" opacity="0.7"/>
            <polygon points="100,100 120,35 140,100" fill="#1a3a1a" opacity="0.8"/>
            <polygon points="180,100 200,45 220,100" fill="#1a3a1a" opacity="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#trees-mid)"/>
      </svg>
    </div>

    <!-- Near trees (sides) -->
    <div class="absolute inset-0 opacity-40">
      <svg class="w-full h-full" preserveAspectRatio="none">
        <!-- Left side tree -->
        <polygon points="0,800 80,200 160,800" fill="#2d5016" opacity="0.5"/>
        <polygon points="-50,800 50,300 150,800" fill="#1a3a1a" opacity="0.6"/>

        <!-- Right side tree -->
        <polygon points="1800,800 1720,200 1640,800" fill="#2d5016" opacity="0.5"/>
        <polygon points="1850,800 1750,300 1650,800" fill="#1a3a1a" opacity="0.6"/>
      </svg>
    </div>

    <!-- Ground fog/mist effect -->
    <div class="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0a1f0a]/40 to-transparent"></div>
  </div>

  <!-- Word Cloud -->
  <div class="absolute inset-0 w-full h-full">
    {#key updateKey}
      <WordCloud {adjectives} />
    {/key}
  </div>

  <!-- Floating button to reopen modal (only show when modal is closed and not done) -->
  {#if !modalOpen && !isDone}
    <button
      onclick={openModal}
      class="fixed bottom-8 right-8 z-20 bg-[#3d6b1f] text-white px-6 py-3 rounded-full shadow-lg hover:bg-[#4a7c2c] transition-all hover:scale-105"
    >
      Submit Adjectives ({submissionCount}/5)
    </button>
  {/if}

  <!-- Modal -->
  {#if modalOpen}
    <div class="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-6 pb-8" style="bottom: 0 !important;">
      <!-- Modal Content - Translucent with backdrop blur -->
      <div class="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.3)] border border-white/20">
        <!-- Close button -->
        {#if !isDone}
          <button
            onclick={closeModal}
            class="absolute top-6 right-6 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full w-11 h-11 flex items-center justify-center transition-all hover:scale-110 shadow-md"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}

        {#if !isDone}
          <div class="px-10 sm:px-16 pt-14 pb-12 text-center">
            <!-- Question -->
            <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight" style="font-family: 'Inter', -apple-system, sans-serif; background: linear-gradient(to right, #9333ea, #ec4899, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              What are your top 5 adjectives that describe Kim?
            </h1>

            <!-- Progress -->
            <div class="flex justify-center items-center gap-2 mb-12">
              {#each Array(5) as _, i}
                <div class="w-2.5 h-2.5 rounded-full transition-all duration-300 {i < submissionCount ? 'bg-gradient-to-r from-purple-500 to-pink-500 scale-110' : 'bg-gray-300'}"></div>
              {/each}
            </div>

            <form onsubmit={handleSubmit} class="max-w-lg mx-auto space-y-5">
              <!-- Input Field -->
              <input
                type="text"
                bind:value={word}
                disabled={loading}
                class="w-full px-6 py-5 bg-white/70 border-2 border-gray-200/50 text-gray-900 text-xl rounded-2xl focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none placeholder-gray-400 transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
                placeholder="Type an adjective..."
                maxlength="50"
                required
                style="font-family: 'Inter', -apple-system, sans-serif;"
              />

              {#if error}
                <p class="text-red-500 text-sm font-medium">{error}</p>
              {/if}

              <!-- Submit Button - Rainbow gradient -->
              <button
                type="submit"
                disabled={loading}
                class="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white py-5 px-10 rounded-2xl font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-[1.03] hover:brightness-110"
                style="font-family: 'Inter', -apple-system, sans-serif;"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        {:else}
          <div class="text-center px-10 py-14">
            <div class="text-6xl mb-6">✨</div>
            <h2 class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-5" style="font-family: 'Inter', -apple-system, sans-serif;">
              Thank you!
            </h2>
            <p class="text-xl text-gray-700 mb-10" style="font-family: 'Inter', -apple-system, sans-serif;">
              You've submitted all 5 adjectives.
            </p>
            <button
              onclick={closeModal}
              class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 px-10 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
              style="font-family: 'Inter', -apple-system, sans-serif;"
            >
              Close
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
