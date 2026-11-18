// Every fact here must match John's own record of his work; check it before changing a number.
// Public surfaces: roles not names for Episode and Rivva teams, no Episode revenue, no em dashes.

export const person = {
  name: 'John Etokhana',
  email: 'etokhanaj@gmail.com',
  avatar: '/assets/home/avatar.jpg',
  location: 'London',
  // Status badge under the avatar, as on the live site. John confirmed 12 Oct 2026.
  status: 'Available for work and advising',
  links: {
    github: 'https://github.com/etokhanaj',
    linkedin: 'https://www.linkedin.com/in/john-etokhana',
  },
};

export type Project = {
  slug: string;
  org: string;
  title: string;
  what: string; // the card's one line: a result, not a product description
  results?: string[]; // two or three results under a study's opening line
  label?: string;
  status: string;
  years: string;
  tint: string; // hsl(h s% 34%) sampled from the cover
  tags?: string[]; // role and stack, joined into the card's meta line
  image?: string; // hero screen; a labelled placeholder renders when missing
  imageAlt: string;
  heroFrame?: 'window' | 'phone';
  peek?: string; // a real screen that rises into the home tile
  peeks?: string[]; // two more screens the home tile cycles through after `peek`
  peekFrame?: 'phone'; // show the home tile's screen in a phone, whatever the study's hero uses
  earlier?: boolean; // listed under Earlier work on the home page, not as a card
  // Live-site card chrome: brand thumbnail class, white logo, one-line tagline, link label
  thumb: 't-episode' | 't-rivva' | 't-kora' | 't-milkyway' | 't-ab' | 't-inga';
  logo?: string; // white logo on the thumbnail; falls back to `wordmark` text
  wordmark?: string;
  tagline?: string;
  cardLabel: string;
  bg: 1 | 2 | 3 | 4 | 5 | 6; // painting behind the case study hero window
  site?: string; // live product, shown in the case study top bar
  url?: string; // address shown in the window chrome when there is no live link
};

export const projects: Project[] = [
  {
    slug: 'episode',
    org: 'Episode',
    title: "Episode: where should an agent's work live?",
    what: 'Customers published 38 campaign sites in the first month of onboarding.',
    results: ['38 campaign sites in customers’ first month', '10 businesses preferred the new review flow'],
    status: 'Private beta',
    years: '2026',
    tint: 'hsl(52 8% 34%)',
    tags: ['Product design', 'Front end', 'React · TS'],
    image: '/assets/episode/theatre-hero.jpg',
    imageAlt: 'The master page for Inga for Teams, a fictional campaign, in the theatre beside the agent chat writing the company pages',
    thumb: 't-episode',
    logo: '/assets/episode/wordmark-horizontal-white.svg',
    peek: '/assets/episode/theatre-hero.jpg',
    peeks: ['/assets/episode/theatre-outputs.jpg', '/assets/episode/analytics-report.jpg'],
    cardLabel: 'Read case study',
    bg: 2,
    site: 'https://useepisode.com',
  },
  {
    slug: 'rivva',
    org: 'Rivva',
    title: 'Rivva: an app that plans the day for adults with ADHD',
    what: 'Median time to a first completed task fell from 21 hours to 9 after the onboarding rebuild I led.',
    results: ['First completed task in 9 hours, down from 21', 'Activation 22% to 34%', '200 paying subscribers, no paid marketing'],
    status: 'Wound down',
    years: '2025 to 2026',
    tint: 'hsl(261 29% 34%)',
    tags: ['Co-founder', 'Design', 'Extension'],
    image: '/assets/rivva/m-home.jpg',
    imageAlt: "Rivva's Home: what's happening now, your energy through the day, the rest of today, and Nia a tap away",
    heroFrame: 'phone',
    thumb: 't-rivva',
    logo: '/assets/rivva/logo-white.png',
    tagline: 'Planning help for ADHD',
    peek: '/assets/rivva/m-home.jpg',
    peeks: ['/assets/rivva/f-nia-chips.jpg', '/assets/rivva/proto/on-plan.jpg'],
    cardLabel: 'Read case study',
    bg: 5,
    url: 'rivva.app',
  },
  {
    slug: 'kora',
    org: 'Kora',
    title: 'Kora: payments people complete',
    what: 'Support tickets about payment instructions fell 43% after my checkout redesign.',
    results: ['Payment-instruction tickets down 43%', '1,000+ merchants used the settlements tool', '90-day merchant retention 60% to 72.5% (groups of 40)'],
    status: 'Shipped',
    years: '2019 to 2022',
    tint: 'hsl(202 38% 34%)',
    tags: ['Product design', 'Payments', 'Onboarding'],
    image: '/assets/kora/modal-cover.webp',
    imageAlt: 'Kora checkout modal',
    thumb: 't-kora',
    logo: '/assets/kora/logo-white.png',
    tagline: 'Checkout and payments',
    peek: '/assets/kora/ck-pay.jpg',
    peeks: ['/assets/kora/ck-checking.jpg', '/assets/kora/ck-success.jpg'],
    peekFrame: 'phone',
    cardLabel: 'Read case study',
    bg: 6,
    site: 'https://korahq.com',
  },
  {
    slug: 'milkyway',
    earlier: true,
    org: 'MilkyWay',
    title: 'MilkyWay: making liquid staking legible',
    what: 'After 1-Click staking, people who finished staking from Babylon rose from 62% to 74%.',
    results: ['Finishing a stake from Babylon: 62% to 74%', 'More than 3 in 4 took the recommended validator', '$30M+ staked in 3 months, the protocol’s result'],
    status: 'Shipped',
    years: '2023 to 2025',
    tint: 'hsl(301 47% 34%)',
    tags: ['Product design', '0 to 1', 'Staking'],
    image: '/assets/milkyway/mw-hero.jpg',
    imageAlt: 'MilkyWay Liquid Staking: staking BABY, with Bridge tokens, Stake BABY and Stake from Babylon (1-Click)',
    thumb: 't-milkyway',
    logo: '/assets/milkyway/logo-white.png',
    tagline: 'Liquid staking',
    peek: '/assets/milkyway/mw-hero.jpg',
    cardLabel: 'Read case study',
    bg: 6,
    url: 'app.milkyway.zone',
  },
  {
    slug: 'pablo',
    earlier: true,
    org: 'Advanced Blockchain',
    title: 'Pablo: a swap flow that shows the outcome first',
    what: 'A swap people can judge before they confirm: dollars first, with the minimum they’ll receive.',
    results: ['Value in dollars and tokens first', 'Minimum received, fees and gas before you confirm', 'Across three products: transaction success 68% to 80%'],
    status: 'Shipped',
    years: '2022 to 2023',
    tint: 'hsl(222 30% 34%)',
    tags: ['Senior product design', 'DeFi'],
    imageAlt: 'The Pablo swap screen with its details open: minimum received, price impact and fees below the outcome',
    thumb: 't-ab',
    logo: '/assets/pablo/logo-white.svg',
    wordmark: 'Pablo',
    image: '/assets/pablo/swap-details.jpg',
    peek: '/assets/pablo/swap-details.jpg',
    tagline: 'Swap flow · Advanced Blockchain',
    cardLabel: 'Read case study',
    bg: 3,
    url: 'Pablo · swap',
  },
];

// Side projects with a short study: linked from Side projects on home, not
// shown in Selected work. Their "Next" link leads back into the main work.
export const sideProjects: Project[] = [
  {
    slug: 'inga',
    org: 'Inga',
    title: 'Inga: save anything from the web, and come back to it',
    what: 'Social bookmarking a few hundred people used: save from anywhere into collections you can share.',
    results: ['Extension, web app and monthly digest went live', 'A few hundred people used it'],
    status: 'Discontinued',
    years: '2024',
    tint: 'hsl(252 60% 40%)',
    tags: ['Side project', 'Design', 'Extension'],
    image: '/assets/inga/collections.jpg',
    imageAlt: "Inga's web app: a collection as a mood board of saved images and links, with filter, sort, notes, comments and share",
    heroFrame: 'window',
    thumb: 't-inga',
    cardLabel: 'Read the story',
    bg: 2,
    url: 'inga',
  },
];

export type Photo = {
  src?: string;
  alt?: string;
  caption: string;
  date?: string;
  place?: string;
  ratio?: number;
  href?: string;
  tags?: string[];
};

// Placeholders until John sends photos with captions.
export const photos: Photo[] = [
  { caption: 'Photo to come', place: 'London' },
  { caption: 'Another one soon', ratio: 4 / 5 },
  { caption: 'Still choosing' },
];

// A place on Window seat. `flight: false` when it wasn't a flight. Without
// `from`, the ticket shows only where he went.
export type Place = {
  city: string;
  country: string;
  code: string;
  from?: { city: string; code: string };
  via?: string;
  carrier?: string;
  flight?: boolean;
  when: string;
  caption: string;
  photo?: string;
  alt?: string;
};

// Window seat shows on the live site; set false to hide it again.
export const placesLive = true;

export type WritingItem = {
  title: string;
  excerpt: string;
  date: string;
  href?: string;
  lead?: boolean; // one of the notes shown up front on the home page
  image?: string;
  imageAlt?: string;
  ratio?: number;
};

export const writing: WritingItem[] = [
  {
    title: 'How I design with AI',
    lead: true,
    excerpt: 'Prototyping in the real stack, research at the speed of the question, and designing the AI that ships.',
    date: 'Essay',
    href: '/notes-ai/',
  },
  {
    title: 'The mind locks like a missile',
    excerpt: '',
    date: 'Substack',
    href: 'https://tokanaj.substack.com/p/the-mind-locks-like-a-missile',
  },
  {
    title: 'When overthinking turns against UX designers',
    excerpt: 'On the point where more thinking stops improving the work and starts replacing it.',
    date: 'Dear Designer',
    href: 'https://deardesigner.xyz/when-overthinking-turns-against-ux-designers/',
  },
  {
    title: 'The right way to design your dashboard',
    lead: true,
    excerpt: 'What a dashboard is for, and why most of them are built for the person who commissioned them.',
    date: 'The Unflux',
    href: 'https://www.theunflux.com/story/the-right-way-to-design-your-dashboard/',
  },
  {
    title: 'Everything is design, everything',
    excerpt: 'Written at Kora, on why design decisions do not stop at the screen.',
    date: 'Kora',
    href: 'https://medium.com/korapay-content/everything-is-design-everything-ec5bf5d5c3a5',
  },
];

// Press about John (from the live site).
export const media: WritingItem[] = [
  {
    title: 'Quick Fire with John Etokhana',
    excerpt: '',
    date: 'TechCabal',
    href: 'https://techcabal.com/2022/08/26/quick-fire-john-etokhana/',
  },
  {
    title: 'John Etokhana discusses the future of tech',
    excerpt: '',
    date: 'Business Insider Africa',
    href: 'https://africa.businessinsider.com/local/leaders/john-etokhana-discusses-his-career-and-the-future-of-tech-in-nigeria-and-africa/j4h8jyf',
  },
];

// ---------- Play mode (home) ----------
// Every badge is a true fact from the context pack or John's 12 Oct content pack.
export type Sticker = {
  id: string;
  shape: 'arch' | 'circle' | 'star' | 'hex' | 'half' | 'square';
  color: string;
  ring: string; // curved text
  icon?: 'dice' | 'mentor' | 'bolt' | 'prompt' | 'access' | 'ball' | 'scissors' | 'globe';
  big?: string; // a number in the middle instead of an icon
  href?: string; // where the proof lives
  tilt: number;
  title: string;
  story: string;
  when?: string; // shown on the open badge, e.g. 'May 2026'
};

export const play = {
  tagline: 'Designer, builder and games-night host',
  // About me on Play: John's approved two lines (13 Oct), then an ask.
  about: {
    lines: [
      'I trained as an electrical engineer in Benin City and now design in London. When I’m not designing, I’m usually hosting something, on a tennis court, or boarding a flight.',
    ],
    ask: 'Need a designer who can also build the thing?',
  },
  // Five badges: two about how John builds (from his own AI-session report, Jul 2026,
  // not linked or named publicly) and three about life outside work.
  stickers: [
    { id: 'burst', shape: 'star', color: '#9B7BF7', ring: 'BURST BUILDER', big: '63%', tilt: 5, title: 'Burst builder', story: '63% of my code work happens in short bursts: under 15 minutes or two commits at a time. I ship in small pieces that are easy to review.' },
    { id: 'robots', shape: 'circle', color: '#4F8EF7', ring: 'DANCES WITH ROBOTS', icon: 'prompt', tilt: -4, title: 'Dances with robots', story: 'I work with coding agents like a jam session: back and forth, shaping the work as I go. I changed course mid-task only 3% of the time.' },
    { id: 'tennis', shape: 'half', color: '#B7E35A', ring: 'INNER DJOKOVIC', icon: 'ball', tilt: -5, title: 'Channelling my inner Djokovic', story: 'Away from the screen I play tennis, channelling my inner Djokovic. The results are mostly my own.' },
    { id: 'games', shape: 'arch', color: '#FF8FB1', ring: 'GAMES NIGHT', icon: 'dice', tilt: 4, title: 'Games night host', story: '22 seats, a waitlist of 50, a new mix of people every quarter.' },
    { id: 'gym', shape: 'star', color: '#F6C945', ring: '6AM CLUB', tilt: -3, title: '6AM Club', story: 'Up at 6am for the gym, before the coffee and the emails.' },
  ] as Sticker[],
  // Window seat (/play/places/): one ticket per place, newest first. Codes are
  // the city's (LON, NYC) unless John named the airport (LGW, STN, LHR); Diani
  // Beach shows MBA, the airport it was reached through.
  // `photo` is optional; a ticket opens to it when there is one.
  places: [
    { city: 'Lisbon', country: 'Portugal', code: 'LIS', from: { city: 'London', code: 'LON' }, carrier: 'Ryanair', when: 'Nov 2026', caption: 'Meeting up after Web Summit.', photo: '/assets/places/lisbon.jpg', alt: 'John and a friend taking a selfie in a marble-walled concourse in Lisbon' },
    { city: 'San Francisco', country: 'US', code: 'SFO', from: { city: 'London', code: 'LON' }, carrier: 'United', when: 'Apr 2026', caption: 'Three weeks in the Bay, mostly heads down.', photo: '/assets/places/san-francisco.jpg', alt: 'The main hall at Stripe Sessions in San Francisco, a string quartet on the big screens and people walking down the aisle between rows of seats' },
    { city: 'Lagos', country: 'Nigeria', code: 'LOS', from: { city: 'London', code: 'LON' }, via: 'Abuja', when: 'Oct 2025', caption: 'Made it back for an Afrobeat night on Victoria Island.', photo: '/assets/places/lagos.jpg', alt: 'Dinner with family at Labelle in Lagos: jollof rice, salads and pasta on a dark table' },
    { city: 'Phuket', country: 'Thailand', code: 'HKT', from: { city: 'Bangkok', code: 'BKK' }, when: 'Oct 2025', caption: 'Slower island days before the long flight home.', photo: '/assets/places/phuket.jpg', alt: 'John standing on a wooden longtail boat among giant lily pads, beside a red Thai wooden house' },
    { city: 'Bangkok', country: 'Thailand', code: 'BKK', from: { city: 'London', code: 'LON' }, via: 'Doha', carrier: 'Qatar Airways', when: 'Oct 2025', caption: 'Five nights off Sukhumvit Soi 11.', photo: '/assets/places/bangkok.jpg', alt: 'A bowl of Thai beef noodle soup topped with sliced beef, coriander, fried garlic and meatballs, in a Meat Labo bowl' },
    { city: 'Toronto', country: 'Canada', code: 'YTO', from: { city: 'New York', code: 'NYC' }, carrier: 'Porter', when: 'Apr 2025', caption: 'Two weeks in Toronto to close out spring.', photo: '/assets/places/toronto.jpg', alt: 'A full rainbow over the Horseshoe Falls at Niagara, ice still on the water below the viewing platform' },
    { city: 'Houston', country: 'US', code: 'HOU', from: { city: 'New York', code: 'NYC' }, carrier: 'Delta', when: 'Apr 2025', caption: 'A quick detour south mid-trip.', photo: '/assets/places/houston.jpg', alt: 'John looking up at a white United States rocket on a yellow launch stand in Houston, under a clear blue sky' },
    { city: 'New York', country: 'US', code: 'NYC', from: { city: 'London', code: 'LON' }, carrier: 'Virgin Atlantic', when: 'Apr 2025', caption: 'Nine days in New York.', photo: '/assets/places/new-york.jpg', alt: 'The white winged Oculus at the World Trade Center, glass towers rising behind it under a clear blue sky' },
    { city: 'Budapest', country: 'Hungary', code: 'BUD', from: { city: 'Milan', code: 'MIL' }, carrier: 'Wizz Air', when: 'Mar 2025', caption: 'Met a falconer and his golden eagle at Buda Castle.', photo: '/assets/places/budapest.jpg', alt: 'A falconer in red medieval dress sitting with a golden eagle on his glove, in front of a carved stone monument in Buda Castle' },
    { city: 'Milan', country: 'Italy', code: 'MIL', from: { city: 'London Gatwick', code: 'LGW' }, carrier: 'Wizz Air', when: 'Mar 2025', caption: 'Two days in Milan on the way east.', photo: '/assets/places/milan.jpg', alt: 'The white Gothic front of Milan Cathedral under a deep blue sky, a pigeon flying overhead and crowds in the square' },
    { city: 'Lagos', country: 'Nigeria', code: 'LOS', from: { city: 'London Gatwick', code: 'LGW' }, carrier: 'Air Peace', when: 'Feb 2025', caption: 'Three weeks home in February.', photo: '/assets/places/lagos-feb-2025.jpg', alt: 'A selfie of John and seven friends in tuxedos and sunglasses, grinning and throwing peace signs in a hotel lobby' },
    { city: 'Marrakesh', country: 'Morocco', code: 'RAK', from: { city: 'London Stansted', code: 'STN' }, carrier: 'Ryanair', when: 'Jan 2025', caption: 'Starting 2025 in Marrakesh.', photo: '/assets/places/marrakesh.jpg', alt: 'A white gallery room in Marrakesh hung with Yves Saint Laurent’s colourful posters, Les quatre saisons on the far wall' },
    { city: 'Tenerife', country: 'Spain', code: 'TCI', from: { city: 'London Stansted', code: 'STN' }, carrier: 'Ryanair', when: 'Nov 2024', caption: 'Five days of sun at a villa in the south.', photo: '/assets/places/tenerife.jpg', alt: 'Sunset over the sea in the south of Tenerife, tall palm trees silhouetted above the lights of the town' },
    { city: 'Doha', country: 'Qatar', code: 'DOH', from: { city: 'London Heathrow', code: 'LHR' }, carrier: 'Qatar Airways', when: 'Sep 2024', caption: 'Five days on West Bay.', photo: '/assets/places/doha.jpg', alt: 'The curved, interlocking discs of the National Museum of Qatar behind a row of palm trees, under a clear blue sky' },
    { city: 'Seoul', country: 'South Korea', code: 'SEL', from: { city: 'London Heathrow', code: 'LHR' }, carrier: 'Korean Air', when: 'Jun 2024', caption: 'Ten days in Seoul, ending in Gangnam.', photo: '/assets/places/seoul.jpg', alt: 'John on a rooftop terrace in Seoul, the city, its highways and the mountains spread out behind him' },
    { city: 'Glasgow', country: 'UK', code: 'GLA', from: { city: 'London Luton', code: 'LTN' }, carrier: 'easyJet', when: 'May 2024', caption: 'Four days up north, staying in Partick.', photo: '/assets/places/glasgow.jpg', alt: 'Two stags locking antlers mid-leap under a soaring eagle in a gallery at Kelvingrove, Glasgow' },
    { city: 'Lagos and Abuja', country: 'Nigeria', code: 'LOS', from: { city: 'London Heathrow', code: 'LHR' }, carrier: 'British Airways', when: 'Dec 2023', caption: 'Christmas back home, with a few days in Abuja.', photo: '/assets/places/lagos-abuja-dec-2023.jpg', alt: 'Four friends posing outside a glass-fronted restaurant, two making peace signs' },
    { city: 'Diani Beach', country: 'Kenya', code: 'MBA', from: { city: 'Nairobi', code: 'NBO' }, carrier: 'Kenya Airways', when: 'Oct 2023', caption: 'A week at a villa on the Kenyan coast.', photo: '/assets/places/diani-beach.jpg', alt: 'John barefoot at the water’s edge on Diani Beach in a striped shirt and shorts, waves breaking behind him' },
    { city: 'Nairobi', country: 'Kenya', code: 'NBO', from: { city: 'London Heathrow', code: 'LHR' }, carrier: 'Kenya Airways', when: 'Oct 2023', caption: 'First stop in Kenya.', photo: '/assets/places/nairobi.jpg', alt: 'Three friends at breakfast around a long wooden table, a teapot and juice in the middle, a ceiling fan turning overhead' },
    { city: 'Berlin', country: 'Germany', code: 'BER', from: { city: 'Ibiza', code: 'IBZ' }, carrier: 'Ryanair', when: 'Aug 2023', caption: 'Straight from the Balearics to Berlin.', photo: '/assets/places/berlin.jpg', alt: 'A hand holding a bag of Leckere Erdnüsse, roasted peanuts in their shells, in a German supermarket aisle' },
    { city: 'Barcelona', country: 'Spain', code: 'BCN', from: { city: 'London Luton', code: 'LTN' }, carrier: 'Ryanair', when: 'Aug 2023', caption: 'Six days in Barcelona, ending at the Sagrada Família.', photo: '/assets/places/barcelona.jpg', alt: 'The Sagrada Família against a clear blue sky, a black-and-yellow Barcelona taxi passing in front' },
    { city: 'London', country: 'UK', code: 'LHR', from: { city: 'Lagos', code: 'LOS' }, carrier: 'British Airways', when: 'Mar 2023', caption: 'First time in London. Friends met me at Heathrow.', photo: '/assets/places/london.jpg', alt: 'Two friends grinning as they walk out of Heathrow arrivals, one pushing a trolley stacked with suitcases' },
    { city: 'Zanzibar', country: 'Tanzania', code: 'ZNZ', from: { city: 'Lagos', code: 'LOS' }, when: 'Sep 2021', caption: 'A week in Stone Town, between Tembo House and Maru Maru.', photo: '/assets/places/zanzibar.jpg', alt: 'John in a white cap, standing barefoot under an overhanging coral rock on the shore, the sea behind him' },
  ] as Place[],
  elsewhere: [
    { label: 'ADPList', href: 'https://adplist.org/mentors/john-etokhana', note: 'Where I mentor designers' },
    { label: 'Substack', href: 'https://tokanaj.substack.com/', note: 'Where I write, now and then' },
    { label: 'GitHub', href: 'https://github.com/etokhanaj', note: 'Where the code lives' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/john-etokhana', note: 'The formal version' },
  ],
  // Fallback for "Now playing" when the Spotify function isn't connected. Empty
  // until John picks the songs; the block hides itself when there's nothing to show.
  songs: [
    { title: 'Forgiveness', artist: 'Asake', href: 'https://open.spotify.com/track/5u4rozuOBse9MgrAzGspQy', image: '/assets/music/asake-forgiveness.jpg', album: 'M$NEY', released: '2026', length: 158569 },
    { title: 'APT.', artist: 'ROSÉ, Bruno Mars', href: 'https://open.spotify.com/track/5vNRhkKd0yEAg8suGBpjeY', image: 'https://i.scdn.co/image/ab67616d00001e0246085aa1855bd888abc51a5a', album: 'APT.', released: '2024', length: 169917 },
    { title: 'Love Yourz', artist: 'J. Cole', href: 'https://open.spotify.com/track/2e3Ea0o24lReQFR4FA7yXH', image: 'https://i.scdn.co/image/ab67616d00001e02c6e0948bbb0681ff29cdbae8', album: '2014 Forest Hills Drive', released: '2014', length: 211496 },
    { title: 'Man I Need', artist: 'Olivia Dean', href: 'https://open.spotify.com/track/1qbmS6ep2hbBRaEZFpn7BX', image: 'https://i.scdn.co/image/ab67616d00001e02e3d69e17dde129037a1f09e2', album: 'Man I Need', released: '2025', length: 184000 },
    { title: 'OZEBA', artist: 'Rema', href: 'https://open.spotify.com/track/7ySC0IjVS1PMEdsZOvsUK2', image: 'https://i.scdn.co/image/ab67616d00001e0219df46a8fa3d972ff4c84275', album: 'HEIS', released: '2024', length: 137684 },
    { title: 'May I Have This Dance (Remix) ft. Chance the Rapper', artist: 'Francis and the Lights', href: 'https://open.spotify.com/track/0VaIsQoIQY10uxBrOyZ5cQ', image: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/23/dd/e7/23dde7bd-c2a5-27bf-bce0-98408967747b/859721004596_cover.jpg/160x160bb.jpg', album: 'May I Have This Dance (Remix) [feat. Chance the Rapper]', released: '2017', length: 195356 },
    { title: 'Lucky Ones', artist: 'Lecrae', href: 'https://open.spotify.com/track/6I6FjSdFyV1PqDBCq7VFYk', image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/be/db/36/bedb36db-8830-bd2a-95f0-6f69ea7c3ab2/195497137787.jpg/160x160bb.jpg', album: 'Gravity', released: '2012', length: 277106 },
    { title: 'SLICK', artist: 'Victony', href: 'https://open.spotify.com/track/3AcgT1ZcF0e9YknCUD269u', image: 'https://i.scdn.co/image/ab67616d00001e02b1356b443072b4f8615af24d', album: 'SLICK', released: '2026', length: 106909 },
  ] as { title: string; artist: string; href?: string; image?: string; album?: string; released?: string; length?: number }[],
};

// Suggested questions for the JohnLM slot (phase 2). Page-aware later.
export const askSuggestions = [
  'What did you actually ship at Episode?',
  'Why did Rivva close?',
  'How do you work with engineers?',
];

export type CvRow = { name: string; meta: string; href?: string };

export const resume: { heading: string; rows: CvRow[] }[] = [
  {
    heading: 'experience',
    rows: [
      { name: 'Episode, Product Designer and Design Engineer, Contract', meta: '2026 to present' },
      { name: 'Rivva, Co-Founder, Head of Design', meta: '2025 to 2026' },
      { name: 'MilkyWay, Senior Product Designer', meta: '2023 to 2025' },
      { name: 'Advanced Blockchain AG, Senior Product Designer', meta: '2022 to 2023' },
      { name: 'Kora, Product Designer to Senior Product Designer', meta: '2019 to 2022' },
      { name: 'Rejuvenate Media, Brand & Marketing Designer', meta: '2017 to 2019' },
    ],
  },
  {
    heading: 'education',
    rows: [{ name: 'B.Eng. Electrical & Electronics Engineering', meta: 'University of Benin (2012 to 2017)' }],
  },
  {
    heading: 'community',
    rows: [
      { name: 'Mentor to 25+ designers', meta: 'ADPList (2022 to present)' },
      { name: 'Fellow', meta: 'Design Leadership Forum (2021 to present)' },
      { name: 'Co-organiser, led design for a 100+ volunteer team', meta: 'Be Epic Africa (2020 to 2022)' },
    ],
  },
];

// Built but hidden until John adds entries. Preview with /?workbench
export type WorkbenchItem = { date: string; text: string; image?: string; video?: string; alt?: string; ratio?: number };

export const workbench: { visible: boolean; items: WorkbenchItem[] } = {
  visible: false,
  items: [
    {
      date: 'Sep 2026',
      text: 'Gen Load. A section by section reveal for AI generation, so the wait shows work instead of a spinner.',
    },
    {
      date: 'Aug 2026',
      text: 'Probability to win, sitting next to raw conversion rate. Making a statistic honest and readable at a glance.',
    },
    {
      date: 'Mar 2026',
      text: 'A browser extension where every new tab becomes the one next thing, instead of a feed.',
    },
  ],
};
