<script lang="ts">
  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    loading = true;
    error = '';

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        window.location.href = '/admin';
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

<div class="min-h-screen h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a1f0a] via-[#1a3a1a] to-[#2d4a1a]">
  <!-- Forest Background Layers -->
  <div class="absolute inset-0 w-full h-full z-0">
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

  <!-- Login Modal -->
  <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl px-6" style="max-width: min(576px, calc(100vw - 48px));">
    <div class="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/20">
      <div class="px-10 sm:px-16 pt-14 pb-12 text-center">
        <!-- Question -->
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight" style="font-family: 'Inter', -apple-system, sans-serif; background: linear-gradient(to right, #9333ea, #ec4899, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          Admin Login
        </h1>

        <!-- Progress placeholder for alignment -->
        <div class="flex justify-center items-center gap-3 mb-8 mt-6" style="min-height: 20px;">
          <!-- Empty space to match adjectives modal layout -->
        </div>

        <form onsubmit={handleSubmit} class="space-y-5 flex flex-col items-center">
          <!-- Input Field -->
          <input
            id="password"
            type="password"
            bind:value={password}
            disabled={loading}
            class="px-6 py-4 bg-gradient-to-br from-white/90 to-white/70 border-2 border-purple-200/60 text-gray-900 text-lg rounded-full focus:from-white focus:to-white/95 focus:border-purple-400 focus:ring-4 focus:ring-purple-100/50 outline-none placeholder-gray-400 transition-all duration-300 backdrop-blur-sm"
            placeholder="Enter admin password..."
            required
            style="font-family: 'Inter', -apple-system, sans-serif; width: 320px; max-width: 90vw; box-shadow: 0 8px 32px rgba(147, 51, 234, 0.12), 0 4px 16px rgba(236, 72, 153, 0.08);"
          />

          {#if error}
            <p class="text-red-500 text-sm font-medium">{error}</p>
          {/if}

          <!-- Submit Button - Rainbow gradient -->
          <button
            type="submit"
            disabled={loading}
            class="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white py-4 px-8 rounded-full font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.03] hover:brightness-110"
            style="font-family: 'Inter', -apple-system, sans-serif; width: 320px; max-width: 90vw; box-shadow: 0 12px 40px rgba(147, 51, 234, 0.3), 0 6px 20px rgba(236, 72, 153, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;"
          >
            {loading ? 'Logging in...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  </div>
</div>
