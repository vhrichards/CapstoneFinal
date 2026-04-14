This is the PlannerMVP frontend built with [Next.js](https://nextjs.org).

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Add your OpenAI API key in `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Open [http://localhost:3000](http://localhost:3000), login, open a trip, then click "Plan My Trip with AI".

## AI Itinerary Integration

- Server route: `app/api/itinerary/route.ts`
- Model client: OpenAI SDK (`openai`)
- Required env var: `OPENAI_API_KEY`

The frontend sends trip details and voted preferences to the server route. The route calls the LLM and returns a 3-day itinerary JSON payload, which is then saved to local trip storage and displayed on the plan page.

## Hotel Recommendations

- Server route: `app/api/hotels/recommendations/route.ts`

The trip plan page sends destination, dates, and aggregated budget preferences to the hotel route. The route returns local budget-aware hotel recommendations for the selected destination.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
