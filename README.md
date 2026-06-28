## Running Locally in VS Code

### 1. Open the repo in VS Code

* Open VS Code.
* Choose **File > Open Folder**.
* Select the `guitarlab-ai` repo folder.
* Open the integrated terminal with **Terminal > New Terminal**.

### 2. Set up the backend environment

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

After activation, the terminal prompt should show `(.venv)`.

If `.venv` setup was interrupted or looks broken, delete it and recreate it:

```bash
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

### 3. Run backend tests

From the repo root, with `.venv` activated:

```bash
PYTHONPATH=apps/backend python -m pytest apps/backend/tests -v
```

The backend test suite should pass.

### 4. Start the backend server

From the repo root, with `.venv` activated:

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

The backend runs at:

```txt
http://127.0.0.1:8000
```

Opening `http://127.0.0.1:8000` may show:

```json
{"detail": "Not Found"}
```

That is normal because there is no backend homepage route.

FastAPI docs are available at:

```txt
http://127.0.0.1:8000/docs
```

The GP-200 endpoint is:

```txt
POST /tone-maker/gp200
```

The Practice Coach audio-analysis endpoint is:

```txt
POST /practice/analyze-audio
```

Only keep the Practice Coach line if those branches have been merged into `main`.

### 5. Test the GP-200 API manually

With the backend running:

```bash
curl -X POST http://127.0.0.1:8000/tone-maker/gp200 \
  -H "Content-Type: application/json" \
  -d '{
    "tone_goal": "metal tight chug heavy rhythm",
    "pickup_type": "humbucker bridge",
    "connection_mode": "direct_usb"
  }'
```

The response should include:

* `device`: `Valeton`
* `model`: `GP-200`
* `style`
* `tone_intent`
* `modules`
* `dial_in_instructions`
* `warnings`
* `valid`
* `errors`

### 6. Set up and run the frontend

Open a second VS Code terminal:

```bash
cd apps/frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

The frontend runs at:

```txt
http://localhost:3000
```

The GP-200 page is:

```txt
http://localhost:3000/tone-maker/gp200
```

The root page at `http://localhost:3000` may still show the default Next.js starter page. That is expected until the final homepage UI is designed.

The frontend currently provides a basic testable interface, not the final designed UI.

### 7. Run frontend checks

From the repo root:

```bash
npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

## Troubleshooting

### Backend root shows `{"detail":"Not Found"}`

That is normal. Use:

```txt
http://127.0.0.1:8000/docs
```

or test the actual endpoint with `curl`.

### Next.js shows an allowedDevOrigins warning

Use the frontend through:

```txt
http://localhost:3000/tone-maker/gp200
```

instead of `http://127.0.0.1:3000/tone-maker/gp200`.

### Generate Patch changes the URL instead of generating a patch

If clicking **Generate Patch** changes the URL to something like:

```txt
/tone-maker/gp200?tone_goal=...
```

then the frontend form is submitting as a normal HTML GET request. That is a frontend bug. The form should prevent default submission and call the backend with:

```txt
POST http://127.0.0.1:8000/tone-maker/gp200
```

When working correctly, the backend terminal should show:

```txt
POST /tone-maker/gp200
```

not a frontend `GET` request with query parameters.
