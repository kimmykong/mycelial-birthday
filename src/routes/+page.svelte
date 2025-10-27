<script lang="ts">
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
  let inputElement: HTMLInputElement;

  // Track which round we're in
  let bonusRoundStart = $state(0);
  let bonusRoundSize = $state(5); // First round is 5, subsequent are 3
  let isNewSession = $state(false);

  // Track the initial submission count when page loaded
  // This prevents showing thank you screen on page load if they already have submissions
  const initialSubmissionCount = data.submissionCount;

  // Calculate if done with current round
  const isDone = $derived(() => {
    // Don't show thank you on initial page load if they already have submissions
    if (submissionCount === initialSubmissionCount && initialSubmissionCount > 0) {
      return false;
    }
    const done = submissionCount >= bonusRoundStart + bonusRoundSize;
    return done;
  });

  // Check if submissions are allowed (from now until the configured end date)
  const isSubmissionAllowed = $derived(() => {
    if (!data.submissionEndDate) {
      // If no end date configured, allow submissions
      return true;
    }
    const now = new Date();
    return now.getTime() <= data.submissionEndDate;
  });

  // Focus input when modal opens
  $effect(() => {
    if (modalOpen && !isDone() && inputElement) {
      setTimeout(() => inputElement.focus(), 100);
    }
  });

  function addMoreWords() {
    bonusRoundStart = submissionCount;
    bonusRoundSize = 3; // Subsequent rounds are 3 adjectives
    isNewSession = false; // Continue current session
  }

  function nextUp() {
    bonusRoundStart = submissionCount;
    bonusRoundSize = 3; // Subsequent rounds are 3 adjectives
    isNewSession = true; // Start new session
  }

  function startNewPerson() {
    bonusRoundStart = 0;
    bonusRoundSize = 5; // Reset to 5 for new person
    submissionCount = 0;
    isNewSession = true; // Start completely new session
    modalOpen = true;
  }


  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const inputValue = target.value;

    // Check if user tried to enter invalid characters
    if (/[^a-zA-Z]/.test(inputValue)) {
      if (/\s/.test(inputValue)) {
        error = 'Please enter only one word (no spaces)';
      } else {
        error = 'Please enter only letters';
      }
    } else {
      error = ''; // Clear error if input is valid
    }

    // Only allow alphabetic characters (no spaces, numbers, or special chars)
    const cleaned = inputValue.replace(/[^a-zA-Z]/g, '');
    word = cleaned;
    target.value = cleaned;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!word.trim()) {
      error = 'Please enter a word';
      return;
    }

    // Additional validation: ensure only alphabetic characters
    if (!/^[a-zA-Z]+$/.test(word)) {
      error = 'Please enter only letters (no spaces or special characters)';
      return;
    }

    const submittedWord = word.trim().toLowerCase();

    // Optimistic update: clear input immediately
    word = '';
    loading = true;
    error = '';

    // Optimistic update: increment count immediately
    const previousCount = submissionCount;
    submissionCount = previousCount + 1;

    try {
      const response = await fetch('/api/adjectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: submittedWord, newSession: isNewSession })
      });

      const result = await response.json();

      if (response.ok) {
        // Update with actual count from server
        submissionCount = result.count;
        isNewSession = false; // Reset after first submission in new session

        // Update adjectives from POST response
        adjectives = result.adjectives;
        updateKey++; // Force re-render

        // Refocus input after submission
        setTimeout(() => inputElement?.focus(), 100);
      } else {
        // Rollback optimistic update on error
        submissionCount = previousCount;
        word = submittedWord; // Restore the word
        error = result.error || 'Failed to submit word';
      }
    } catch (err) {
      // Rollback optimistic update on error
      submissionCount = previousCount;
      word = submittedWord; // Restore the word
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

<div class="min-h-screen h-screen relative overflow-hidden" style="background: linear-gradient(to bottom right, #f5e6d3, #e8d4b8, #d4c4a8);">

  <!-- Word Cloud -->
  <div class="absolute inset-0 w-full h-full">
    {#key updateKey}
      <WordCloud {adjectives} />
    {/key}
  </div>

  <!-- Floating button to reopen modal (only show when modal is closed and not done and submissions allowed) -->
  {#if !modalOpen && !isDone && isSubmissionAllowed()}
    <button
      onclick={openModal}
      class="fixed bottom-8 right-8 z-20 text-white px-5 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium text-sm" style="background: #5d4e37; box-shadow: 0 10px 25px rgba(93, 78, 55, 0.3);"
    >
      Submit Adjectives ({submissionCount}/5)
    </button>
  {/if}

  <!-- Modal - only show if submissions are allowed -->
  {#if modalOpen && isSubmissionAllowed()}
    <div class="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pb-6 sm:px-6" style="bottom: 0 !important;">
      <!-- Modal Content -->
      <div class="relative rounded-2xl border" style="background: #faf7f2; box-shadow: 0 -4px 24px rgba(93, 78, 55, 0.15); border-color: rgba(139, 115, 85, 0.2);">
        <!-- Close button -->
        {#if !isDone()}
          <button
            onclick={closeModal}
            class="absolute top-4 right-4 rounded-lg p-2 transition-all duration-200" style="color: #8b7355; background: transparent;" onmouseover={(e) => e.currentTarget.style.background='rgba(139, 115, 85, 0.1)'} onmouseout={(e) => e.currentTarget.style.background='transparent'}
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}

        {#if !isDone()}
          <div class="px-5 py-4 sm:px-6 sm:py-5">
            <!-- Question -->
            <h1 class="text-base sm:text-lg font-semibold mb-1 leading-tight tracking-tight" style="color: #3d2817;">
              {#if bonusRoundSize === 5}
                What are your top 5 adjectives that describe Kim?
              {:else}
                Add {bonusRoundSize} more adjectives
              {/if}
            </h1>
            <!-- Progress -->
            <div class="flex items-center gap-2 mb-3">
              {#each Array(bonusRoundSize) as _, i}
                {@const rawProgress = submissionCount - bonusRoundStart}
                {@const currentProgress = Math.max(0, Math.min(bonusRoundSize, rawProgress))}
                <div class="h-1.5 flex-1 rounded-full overflow-hidden" style="background: rgba(139, 115, 85, 0.15);">
                  <div
                    class="h-full transition-all duration-500 ease-out"
                    style="width: {i < currentProgress ? '100%' : '0%'}; background: linear-gradient(to right, #8b6914, #a0782b);"
                  ></div>
                </div>
              {/each}
            </div>

            <form onsubmit={handleSubmit} class="space-y-2.5">
              <!-- Input Field -->
              <input
                bind:this={inputElement}
                type="text"
                bind:value={word}
                oninput={handleInput}
                disabled={loading}
                class="w-full px-3 py-2 text-base rounded-xl outline-none transition-all duration-200"
                style="background: #ffffff; border: 1px solid rgba(139, 115, 85, 0.25); color: #3d2817;"
                onfocus={(e) => { e.currentTarget.style.borderColor='#8b6914'; e.currentTarget.style.boxShadow='0 0 0 4px rgba(139, 105, 20, 0.1)'; }}
                onblur={(e) => { e.currentTarget.style.borderColor='rgba(139, 115, 85, 0.25)'; e.currentTarget.style.boxShadow='none'; }}
                placeholder="Enter an adjective"
                maxLength={50}
                required
              />

              {#if error}
                <p class="text-red-600 text-sm font-medium">{error}</p>
              {/if}

              <!-- Submit Button and Next Person button side by side -->
              <div class="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  class="text-white py-2 rounded-xl font-medium text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  class:flex-1={bonusRoundSize === 3}
                  class:w-full={bonusRoundSize === 5}
                  style="background: #5d4e37; box-shadow: 0 2px 8px rgba(93, 78, 55, 0.2);"
                  onmouseover={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#6d5e47'; }}
                  onmouseout={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#5d4e37'; }}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>

                {#if bonusRoundSize === 3}
                  <button
                    type="button"
                    onclick={startNewPerson}
                    class="flex-1 py-2 rounded-xl font-medium text-base transition-all duration-200"
                    style="background: rgba(139, 115, 85, 0.1); color: #5d4e37;"
                    onmouseover={(e) => e.currentTarget.style.background='rgba(139, 115, 85, 0.2)'}
                    onmouseout={(e) => e.currentTarget.style.background='rgba(139, 115, 85, 0.1)'}
                  >
                    Next Person →
                  </button>
                {/if}
              </div>
            </form>
          </div>
        {:else}
          <div class="text-center px-10 py-12">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background: linear-gradient(to bottom right, #8b6914, #a0782b);">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-2xl font-semibold mb-2" style="color: #3d2817;">Thank you!</h2>
            <p class="text-sm mb-8" style="color: #6b5744;">You've submitted {bonusRoundSize} adjectives. Want to add more?</p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onclick={addMoreWords}
                class="text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                style="background: #5d4e37; box-shadow: 0 2px 8px rgba(93, 78, 55, 0.2);"
                onmouseover={(e) => e.currentTarget.style.background='#6d5e47'}
                onmouseout={(e) => e.currentTarget.style.background='#5d4e37'}
              >
                Add More
              </button>
              <button
                onclick={nextUp}
                class="text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                style="background: #8b6914; box-shadow: 0 2px 8px rgba(139, 105, 20, 0.2);"
                onmouseover={(e) => e.currentTarget.style.background='#a0782b'}
                onmouseout={(e) => e.currentTarget.style.background='#8b6914'}
              >
                Next Up
              </button>
              <button
                onclick={closeModal}
                class="px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                style="background: rgba(139, 115, 85, 0.1); color: #5d4e37;"
                onmouseover={(e) => e.currentTarget.style.background='rgba(139, 115, 85, 0.2)'}
                onmouseout={(e) => e.currentTarget.style.background='rgba(139, 115, 85, 0.1)'}
              >
                Close
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
