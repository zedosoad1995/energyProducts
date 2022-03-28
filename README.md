## Requirements

* Node 16
* Git

## Backend Setup

```bash
git clone https://github.com/zedosoad1995/energyProducts.git
cd energyProducts
```

Make sure to create a [.env](#) and [.env.test](#) files inside backend folder, using the same fields as [.env_example](backend/.env_example) and [.env.test_example](backend/.env.test_example), respectively.

## Frontend Setup

```bash
cd frontend
npm install
```

## Database Setup

Requirements:
* mySQL

Run the script [init.sql](backend/src/db/init.sql) to create the DB and tables, followed by the script [fillTables.sql](backend/src/db/fillTables.sql) to do the seeding.

## Steps to run backend

On the backend terminal

```bash
npm run start
```

## Steps to run frontend

On the frontend terminal

```bash
npm run start
```