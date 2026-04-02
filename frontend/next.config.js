/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/vocabulary", destination: "/features/vocabulary" },
      { source: "/quiz", destination: "/features/quiz" },
      { source: "/review", destination: "/features/review" },
      { source: "/final-quiz", destination: "/features/final-quiz" },
      { source: "/results", destination: "/features/results" },
    ];
  },
};

module.exports = nextConfig;
