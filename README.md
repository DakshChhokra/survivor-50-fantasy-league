# Survivor Fantasy League

A Survivor fantasy league for a friend group. Pick who gets voted off each week. Seasons are separate (Survivor 50, 51, …) with their own contestants, episodes, and leaderboard. Accounts carry over.

## How it works

- **League page**: tribe, leaderboard, this week’s pick, your history. Switch seasons from the dropdown (past seasons are read-only).
- **Weekly picks**: who goes home this episode. Friends can see each other’s picks — that’s on purpose.
- **Winner pick**: who wins the season (+50). Changeable until episode 1 locks.
- **Admin**: one page — create a season, add contestants/headshots, episodes, mark eliminations, reset a friend’s password.

## Scoring

| Event | Points |
|-------|--------|
| Correct weekly pick | +30 |
| Correct preseason winner pick | +50 |

A weekly pick is correct if that contestant was eliminated in that episode (double boots count).

## Admin workflow

1. Create a season (`Survivor 51`) and make it current when you’re ready to play.
2. **Contestants**: add names + headshots (edit if you typo).
3. **Episodes**: air date + pick deadline (Eastern).
4. **Results**: after the episode, mark who went home — scores update immediately.
5. **Users**: reset a password if someone forgets. No email flow.

Old seasons stay in the dropdown. People who skip a season simply don’t show on that season’s board until they pick.

## Password reset

Admin → Users → Set password. Tell them the new one.

## Database

SQLite at `./data/fantasy.db`. Deploy notes are in HELP.md.
