const app = require('./app');

app.listen(process.env.PORT || 5432, () => console.log(`App listening on port ${process.env.PORT || 5432}...`));