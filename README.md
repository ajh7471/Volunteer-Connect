# Volunteer Connect

Connect volunteers with meaningful opportunities in your community.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

These are already configured in your Vercel project.

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
volunteer-connect/
├── app/
│   ├── about/
│   │   └── page.tsx       # About page
│   ├── contact/
│   │   └── page.tsx       # Contact page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   └── supabaseClient.ts  # Supabase client configuration
└── README.md
\`\`\`

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Database:** Supabase
- **Deployment:** Vercel

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. Set up your Supabase database schema
2. Add authentication pages (login/signup)
3. Create volunteer opportunity listings
4. Build user profiles
5. Implement search and filtering

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
