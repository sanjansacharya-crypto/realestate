# Fieldstone frontend

Dependency-free browser workspace for the backend API.

## Run locally

1. Start the backend in `../backend` with `npm run dev`.
2. Run `npm start` in this folder.
3. Open `http://localhost:5173`, sign in, and use the default API URL `http://localhost:5000/api/v1`.

The API URL is saved in local storage. Access and refresh tokens are kept in session storage and cleared at sign out. Requests use the selected organization header. The backend remains the authorization boundary; hiding controls in the UI is not security.

The frontend includes overview, project, plot, booking, construction, materials, modifications, attendance, documents, notifications and settings screens. File upload/download is unavailable because the backend currently stores document metadata only.

`server.mjs` is a local static development server, not a production web server.
