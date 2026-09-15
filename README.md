<img src="frontend/src/assets/lcc-logo.png" alt="London Chess Club logo" width="150">

---

# London Chess Club

The website and API for the London Chess Club: club news, event schedules, member ratings,
photo galleries, and game archives, live at **[londonchess.ca](https://londonchess.ca)**.

For feature requests or to report a bug, open an
[issue](https://github.com/mwiraszka/london-chess/issues) on GitHub, or
[email](mailto:michal@londonchess.ca?subject=LCC%20Website) me directly.

---

## Under the hood

| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;                                    |                      |                                    |
| ----------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------- |
| [![Angular](readme-icons/angular.png)](https://angular.dev)                                           | `Angular`            | frontend framework                 |
| [![Chart.js](readme-icons/chartjs.png)](https://www.chartjs.org/)                                     | `Chart.js`           | charts for game and player stats   |
| [![Clerk](readme-icons/clerk.png)](https://clerk.com)                                                 | `Clerk`              | user management and authentication |
| [![Cloudflare R2](readme-icons/cloudflare-r2.png)](https://www.cloudflare.com/developer-platform/r2/) | `Cloudflare R2`      | cloud storage for all site images  |
| [![Eagami UI](readme-icons/eagami-ui.png)](https://eagami.com/ui)                                     | `Eagami UI`          | Angular component and icon library |
| [![Express.js](readme-icons/expressjs.png)](https://expressjs.com)                                    | `Express.js`         | Node.js API framework              |
| [![GitHub Actions](readme-icons/github.png)](https://github.com/features/actions)                     | `GitHub Actions`     | CI and deployment workflows        |
| [![Lichess PGN Viewer](readme-icons/lichess.png)](https://github.com/lichess-org/pgn-viewer)          | `Lichess PGN Viewer` | interactive chess game replays     |
| [![MongoDB](readme-icons/mongodb.png)](https://www.mongodb.com)                                       | `MongoDB`            | document database                  |
| [![NgRx](readme-icons/ngrx.png)](https://ngrx.io)                                                     | `NgRx`               | reactive state management          |
| [![Ngx Markdown](readme-icons/ngx-markdown.png)](https://github.com/jfcere/ngx-markdown)              | `Ngx Markdown`       | markdown rendering for articles    |
| [![Sentry](readme-icons/sentry.png)](https://sentry.io)                                               | `Sentry`             | error tracking                     |
| [![Vercel](readme-icons/vercel.png)](https://vercel.com)                                              | `Vercel`             | hosting for the site and API       |
| [![Vitest](readme-icons/vitest.png)](https://vitest.dev)                                              | `Vitest`             | unit testing                       |

---

## Project layout

```
london-chess/
├─ frontend/   # Angular single-page app
└─ backend/    # Node + Express REST API
```

Each package is self-contained with its own `package.json`, and both deploy to Vercel
through GitHub Actions: preview builds from feature branches, production from `main`.
