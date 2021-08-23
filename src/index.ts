import express, { Request, Response, Application, Router } from 'express';
import { MongoClient, Collection, Db, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

import { dbConfig } from './config/database';

const { host, dbName = 'mydb', collectionName = 'accounts' } = dbConfig;
const uri = `mongodb://${host}?writeConcern=majority`;

export const collections: { accounts?: Collection } = {};

export const connectToDatabase = async function () {
  const client: MongoClient = new MongoClient(uri);

  await client.connect();

  const db: Db = client.db(dbName);

  const accountCollection: Collection = db.collection(collectionName);

  collections.accounts = accountCollection;

  console.log(
    `Successfully connected to database: ${db.databaseName} & collection: ${accountCollection.collectionName}`
  );
};

// Connect to database
connectToDatabase();

const app: Application = express();
const PORT = process.env.PORT || 7000;
const router = Router();

app.use(cors());
app.use(express.json());

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const holders = await collections.accounts?.find({}).toArray();
    res.status(200).send(holders);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { pageSize = 10, lastId, nextPage = true } = req.body;
  let cursor;
  let lastDoc;

  try {
    if (!lastId) {
      cursor = await collections.accounts?.find({}).limit(pageSize);
    }

    // handle next page query
    if (lastId && nextPage) {
      cursor = await collections.accounts?.find({ _id: { $gt: new ObjectId(lastId) } }).limit(pageSize);
    }
    // handle prev page query
    if (lastId && !nextPage) {
      cursor = await collections.accounts?.find({ _id: { $lt: new ObjectId(lastId) } }).limit(pageSize);
    }

    const data = (await cursor?.toArray()) || [];
    lastDoc = nextPage ? data[data?.length - 1] : data[0];

    res.status(200).send({ accounts: data, lastDocId: lastDoc && lastDoc['_id'] });
  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
});

app.use('/', router);

app.listen(PORT, (): void => {
  console.log(`Server Running here 👉 https://localhost:${PORT}`);
});
