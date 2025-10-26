<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  let resetting = $state(false);
  let deletingSession = $state<string | null>(null);

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
        await invalidateAll();
      } else {
        alert('Failed to reset database');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      resetting = false;
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm(`Are you sure you want to delete session ${sessionId}?`)) {
      return;
    }

    deletingSession = sessionId;
    try {
      const response = await fetch('/api/admin/delete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      deletingSession = null;
    }
  }
</script>

<div class="min-h-screen p-8" style="background: linear-gradient(to bottom right, #f5e6d3, #e8d4b8, #d4c4a8);">
  <div class="max-w-4xl mx-auto">
    <div class="rounded-2xl shadow-2xl p-8" style="background: #faf7f2; box-shadow: 0 10px 40px rgba(93, 78, 55, 0.15);">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold" style="color: #3d2817;">Submissions Admin</h1>
        <div class="flex gap-3">
          <button
            onclick={handleReset}
            disabled={resetting}
            class="px-4 py-2 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style="background: #8b0000; box-shadow: 0 2px 8px rgba(139, 0, 0, 0.2);"
            onmouseover={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#a00000'; }}
            onmouseout={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#8b0000'; }}
          >
            {resetting ? 'Resetting...' : 'Reset Database'}
          </button>
          <a
            href="/"
            class="px-4 py-2 text-white rounded-xl font-medium transition-colors"
            style="background: #5d4e37; box-shadow: 0 2px 8px rgba(93, 78, 55, 0.2);"
            onmouseover={(e) => e.currentTarget.style.background='#6d5e47'}
            onmouseout={(e) => e.currentTarget.style.background='#5d4e37'}
          >
            Back to Home
          </a>
        </div>
      </div>

      <p class="mb-6" style="color: #6b5744;">
        Total sessions: {data.sessions.length}
      </p>

      <div class="space-y-3">
        {#each data.sessions as session}
          <div class="rounded-xl p-4 flex items-start justify-between gap-4" style="background: rgba(139, 115, 85, 0.08); border: 1px solid rgba(139, 115, 85, 0.15);">
            <div class="flex-1">
              <p class="text-sm mb-2 font-mono" style="color: #8b7355;">Session: {session.sessionId}</p>
              <p style="color: #3d2817;">
                {session.words.join(', ')}
              </p>
            </div>
            <button
              onclick={() => handleDeleteSession(session.sessionId)}
              disabled={deletingSession === session.sessionId}
              class="px-3 py-1.5 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              style="background: #8b0000; box-shadow: 0 2px 6px rgba(139, 0, 0, 0.2);"
              onmouseover={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#a00000'; }}
              onmouseout={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#8b0000'; }}
            >
              {deletingSession === session.sessionId ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
