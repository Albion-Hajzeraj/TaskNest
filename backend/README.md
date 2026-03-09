# TaskNest Backend

Clean architecture layout:

- `src/modules/tasks/task.controller.js`: HTTP layer
- `src/modules/tasks/task.service.js`: business rules and validation
- `src/modules/tasks/task.repository.js`: persistence layer
- `src/shared/file-store.js`: JSON file storage abstraction

## Run

```bash
cd backend
npm install
npm run dev
```

API base URL: `http://localhost:4000`

In another terminal, start the frontend:

```bash
cd my-react-app
npm install
npm start
```

The frontend is configured with a dev proxy to `http://localhost:4000`.

## Routes

- `GET /health`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
