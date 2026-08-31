// Centralized sports imagery — all from Pexels (license-free, hotlinkable).

export const SPORTS_IMAGES = {
  entranceHero: 'https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&w=1600',
  stripSoccer: 'https://images.pexels.com/photos/33827025/pexels-photo-33827025.jpeg?auto=compress&cs=tinysrgb&w=800',
  stripNFL: 'https://images.pexels.com/photos/34304261/pexels-photo-34304261.jpeg?auto=compress&cs=tinysrgb&w=800',
  stripNBA: 'https://images.pexels.com/photos/33696837/pexels-photo-33696837.jpeg?auto=compress&cs=tinysrgb&w=800',
  todayHero: 'https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&w=1600',
  todaySoccer: 'https://images.pexels.com/photos/33827025/pexels-photo-33827025.jpeg?auto=compress&cs=tinysrgb&w=800',
  todayNFL: 'https://images.pexels.com/photos/34304261/pexels-photo-34304261.jpeg?auto=compress&cs=tinysrgb&w=800',
  todayNBA: 'https://images.pexels.com/photos/33696837/pexels-photo-33696837.jpeg?auto=compress&cs=tinysrgb&w=800',
  todayMLB: 'https://images.pexels.com/photos/16547083/pexels-photo-16547083.jpeg?auto=compress&cs=tinysrgb&w=800',
  todayNHL: 'https://images.pexels.com/photos/13978860/pexels-photo-13978860.jpeg?auto=compress&cs=tinysrgb&w=800',
} as const;

export const SPORT_STRIP = [
  { league: 'Soccer', label: 'Soccer', img: SPORTS_IMAGES.todaySoccer, alt: 'Action-packed soccer game with athletes competing intensely' },
  { league: 'NFL', label: 'Football', img: SPORTS_IMAGES.todayNFL, alt: 'Aerial view of the Rose Bowl stadium in Los Angeles' },
  { league: 'NBA', label: 'Basketball', img: SPORTS_IMAGES.todayNBA, alt: 'Players playing basketball outdoors on a sunny day' },
  { league: 'MLB', label: 'Baseball', img: SPORTS_IMAGES.todayMLB, alt: 'Night baseball game at a packed stadium with vibrant crowd' },
  { league: 'NHL', label: 'Hockey', img: SPORTS_IMAGES.todayNHL, alt: 'Dynamic action shot of a hockey player skating during a game' },
] as const;
