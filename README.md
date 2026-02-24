# Survivor Fantasy League

A Survivor TV show fantasy league app for friend groups. Pick who gets voted off each week and compete on the leaderboard.

## Features

- **Public homepage**: Contestant status (Still In / Eliminated) + leaderboard
- **Weekly picks**: Submit who you think will be eliminated before the Wednesday deadline (+10 pts each correct pick)
- **Preseason winner pick**: Pick who wins the season for a +50 pt bonus
- **Admin panel**: Upload contestants, create episodes, mark eliminations, view all users

## Admin Workflow

1. **Setup** (`/admin/setup`): Add contestants with headshot photos
2. **Episodes** (`/admin/episodes`): Create episodes with air dates and pick deadlines
3. **Results** (`/admin/results`): After each episode airs, mark who was eliminated — scores update immediately
4. **Users** (`/admin/users`): View all registered accounts

## Scoring

| Event | Points |
|-------|--------|
| Correct weekly pick | +10 pts |
| Correct preseason winner pick | +50 pts bonus |

A weekly pick is correct if the picked contestant is among those eliminated that episode (works for double-elimination episodes too).

## Password Reset

No self-service password reset. Admin can reset a password directly in the database:

```bash
sqlite3 data/fantasy.db "UPDATE users SET password='newpassword' WHERE username='someone';"
```

## Database

The SQLite database is stored at `./data/fantasy.db`.
