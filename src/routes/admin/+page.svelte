<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let resetting = $state(false);

  async function handleReset() {
    if (!confirm('Are you sure you want to reset the database? This will delete all submissions and cannot be undone.')) {
      return;
    }

    resetting = true;
    try {
      const response = await fetch('/api/reset', {
        method: 'POST'
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to reset database');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      resetting = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-8">
  <div class="max-w-4xl mx-auto">
    <div class="bg-white rounded-lg shadow-2xl p-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">Submissions Admin</h1>
        <div class="flex gap-3">
          <button
            onclick={handleReset}
            disabled={resetting}
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting...' : 'Reset Database'}
          </button>
          <a
            href="/"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>

      <p class="text-gray-600 mb-6">
        Total sessions: {data.sessions.length}
      </p>

      <div class="space-y-3">
        {#each data.sessions as session}
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-500 mb-2 font-mono">Session: {session.sessionId}</p>
            <p class="text-gray-800">
              {session.words.join(', ')}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
