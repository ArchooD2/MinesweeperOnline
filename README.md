# MinesweeperOnline
Basic Full-Stack App for Minesweeper Online

Play Online: https://minesweeper-online-t7p0.onrender.com/game

# To run Locally:

```bash
git clone https://github.com/ArchooD2/MinesweeperOnline.git
cd MinesweeperOnline
# python3 -m venv venv
# venv/Scripts/activate
pip install -r requirements.txt
sqlite3 database.db < schema.sql
flask run
```

Lines starting with `#` are not necessary.

## Features

* Progressive Difficulty
* SQLite Database for User Accounts and Leaderboards
* Client-Sided Gameplay
* Simple HTML/CSS

## Requirements

Outlined in [requirements.txt](requirements.txt).

## License

This project is licensed under the [Mozilla Public License 2.0 (MPL-2.0)](LICENSE.md)

## Contributing

If you would like to contribute to this project, please read [CONTIBUTING.md](CONTRIBUTING.md)