# Next.js B2C Sample App

A B2C storefront sample built with Next.js and [Descope](https://descope.com) for authentication. Includes a product catalog, cart, checkout with step-up auth, and a protected profile page.

## Hosted App

When using a **hosted** version of this app (https://www.peek-a-box.shop/), you can point it at your own Descope project and flow via URL query params. No env or code changes required.

| Param    | Example        | Description |
|----------|----------------|-------------|
| `project` | `?project=YOUR_PROJECT_ID` | Descope project ID. Once set, it is stored in a cookie so later requests use the same project. |
| `flow`    | `?flow=sign-up-or-in`      | Flow ID for the login page (e.g. `sign-up-or-in`). Stored in `localStorage` so the app uses it until you change it. |

Example: `https://www.peek-a-box.shop/login?project=YOUR_PROJECT_ID&flow=sign-up-or-in`

Use this to try the app with your own Descope project and flows without forking or configuring the repo.

## Running Locally

### Prerequisites

- A [Descope](https://descope.com) project

### Getting started

1. **Clone and install**

   ```bash
   git clone https://github.com/descope-sample-apps/peek-a-box-b2c-sample-app.git
   cd peek-a-box-b2c-sample-app
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and set your Descope project ID:
   
   `NEXT_PUBLIC_DESCOPE_PROJECT_ID=<your-project-id>`

3. **Run the app**

   ```bash
   npm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## E2E tests (Cypress)

1. **First time:** install the Cypress binary (after `npm install`):
   ```bash
   npm run cy:install
   ```
2. With the app running locally (`npm run dev`), in another terminal:
   - **Interactive:** `npm run cy:open` — opens Cypress UI to run or debug specs.
   - **Headless:** `npm run cy:run` — runs all e2e specs once.

Specs live in `cypress/e2e/` and cover home, cart, login, and navigation. Tests do not perform real sign-in; they assert page load and UI flows.

## License

MIT. See [LICENSE](LICENSE).
