const request = require('supertest');
const util = require('util');

const app = require('../app');
const db = require('../db/config');

const dbConnect = util.promisify(db.connect).bind(db);
const dbEnd = util.promisify(db.end).bind(db);

describe('blabla', () => {

    beforeAll(async () => {
        await dbConnect()
        .catch(err => console.log(err));
    });

    afterAll(async () => {
        await dbEnd()
        .catch(err => console.log(err));
    });

    /*beforeAll(async () => {
       
        connection = await mongoose.connect('mongodb://localhost:27017/test_'+process.env.DATABASE,{useNewUrlParser: true, useUnifiedTopology: true });
        db = mongoose.connection;
        const collection = process.env.COLLECTION;
        await db.createCollection(collection);

    });

    afterAll(async () => {

        const collection = "test_"+process.env.COLLECTION;
        await db.dropCollection(collection);
        await db.dropDatabase();
        await db.close();
        await connection.close();

    });*/

    it('lol', () => {
        const response = request(app);
        expect(1).toBe(1);
    })
})