<script lang="ts">
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
  <div class="relative z-50 p-8 max-w-md w-full">
    <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/20 p-10 sm:p-16">
      <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 text-center leading-tight" style="font-family: 'Inter', -apple-system, sans-serif; background: linear-gradient(to right, #9333ea, #ec4899, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
        Welcome
      </h1>

      <form on:submit|preventDefault={handleSubmit} class="space-y-5">
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Inter', -apple-system, sans-serif;">
            Enter Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            disabled={loading}
            class="w-full px-6 py-5 bg-white/70 border-2 border-gray-200/50 text-gray-900 text-xl rounded-2xl focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none placeholder-gray-400 transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
            placeholder="Password"
            required
            style="font-family: 'Inter', -apple-system, sans-serif;"
          />
        </div>

        {#if error}
          <p class="text-red-500 text-sm font-medium" style="font-family: 'Inter', -apple-system, sans-serif;">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white py-5 px-10 rounded-2xl font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-[1.03] hover:brightness-110"
          style="font-family: 'Inter', -apple-system, sans-serif;"
        >
          {loading ? 'Logging in...' : 'Enter'}
        </button>
      </form>
    </div>
  </div>
</div>
