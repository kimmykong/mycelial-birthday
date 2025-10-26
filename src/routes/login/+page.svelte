<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    loading = true;
    error = '';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        const data = await response.json();
        error = data.error || 'Invalid password';
      }
    } catch (err) {
      error = 'An error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen h-screen flex items-center justify-center overflow-hidden" style="background: linear-gradient(to bottom right, #f5e6d3, #e8d4b8, #d4c4a8);">
  <!-- Login Modal -->
  <div class="w-full max-w-lg px-4">
    <div class="relative rounded-2xl border p-8 sm:p-10" style="background: #faf7f2; box-shadow: 0 10px 40px rgba(93, 78, 55, 0.15); border-color: rgba(139, 115, 85, 0.2);">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-semibold mb-2 tracking-tight" style="color: #3d2817;">
          Welcome to Kim's birthday!
        </h1>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <!-- Input Field -->
        <div>
          <label for="password" class="block text-sm font-medium mb-2" style="color: #5d4e37;">
            {data.loginQuestion}
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            disabled={loading}
            class="w-full px-4 py-3.5 text-base rounded-xl outline-none transition-all duration-200"
            style="background: #ffffff; border: 1px solid rgba(139, 115, 85, 0.25); color: #3d2817;"
            onfocus={(e) => { e.currentTarget.style.borderColor='#8b6914'; e.currentTarget.style.boxShadow='0 0 0 4px rgba(139, 105, 20, 0.1)'; }}
            onblur={(e) => { e.currentTarget.style.borderColor='rgba(139, 115, 85, 0.25)'; e.currentTarget.style.boxShadow='none'; }}
            placeholder={data.loginPlaceholder}
            required
          />
        </div>

        {#if error}
          <p class="text-red-600 text-sm font-medium">{error}</p>
        {/if}

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={loading}
          class="w-full text-white py-3.5 rounded-xl font-medium text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: #5d4e37; box-shadow: 0 2px 8px rgba(93, 78, 55, 0.2);"
          onmouseover={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#6d5e47'; }}
          onmouseout={(e) => { if(!e.currentTarget.disabled) e.currentTarget.style.background='#5d4e37'; }}
        >
          {loading ? 'Logging in...' : 'Continue'}
        </button>
      </form>
    </div>
  </div>
</div>
