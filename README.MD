# AutoDamage Inspector

Upload a vehicle photo, detect exterior damage using a Roboflow model, and visualize boxes. Built with Next.js + Tailwind. Keys stay server-side.

## Quickstart
1. `npm i`
2. Copy `.env.example` → `.env.local` and set:
   - `ROBOFLOW_API_KEY`
   - `ROBOFLOW_MODEL_ID` (ex: `your-workspace/car-damage`)
   - `ROBOFLOW_MODEL_VERSION` (ex: `1`)
3. `npm run dev` → open `http://localhost:3000`
4. Upload an image and click **Detect Damage**.

## Switch Models
Change `ROBOFLOW_MODEL_ID` and `ROBOFLOW_MODEL_VERSION` in `.env.local`. No code change required.

## Security
- API key is only used in `/app/api/infer/route.ts` (server).
- Client never sees your secret.

## Roadmap (team phase)
- Save outputs to MongoDB (image URL, boxes, VIN/plate, user id).
- PDF report generator (estimate template).
- Multi-model dropdown (damage, license plate, parts).
- Usage dashboard (volume, accuracy, latency).
- Agentic flow: auto-generate estimate ticket + email to customer.

## License
MIT
