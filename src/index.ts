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

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { pageSize = 100 } = req.body;

  try {
    const count = await collections.accounts?.countDocuments();
    const holders = (await collections.accounts?.find({}).limit(pageSize).toArray()) || [];
    const lastDoc = holders[holders?.length - 1];
    res.status(200).send({ accounts: holders, lastDocId: lastDoc && lastDoc['_id'], count });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.get('/highest-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const holder = await collections.accounts?.find({}).sort({ amt: -1 }).limit(1).toArray();
    res.status(200).send({ account: holder });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/next', async (req: Request, res: Response): Promise<void> => {
  const { pageSize = 10, lastId } = req.body;

  if (!lastId) {
    res.status(400).send({ error: 'No last document Id provided' });
  }

  try {
    const data =
      (await collections.accounts
        ?.find({ _id: { $gt: new ObjectId(lastId) } })
        .limit(pageSize)
        .toArray()) || [];

    const lastDoc = data[data?.length - 1];

    res.status(200).send({ accounts: data, lastDocId: lastDoc && lastDoc['_id'] });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/prev', async (req: Request, res: Response): Promise<void> => {
  const { pageSize = 100, lastId } = req.body;

  if (!lastId) {
    res.status(400).send({ error: 'No last document Id provided' });
  }

  try {
    const data =
      (await collections.accounts
        ?.find({ _id: { $lt: new ObjectId(lastId) } })
        .limit(pageSize)
        .toArray()) || [];

    const lastDoc = data[0];

    res.status(200).send({ accounts: data, lastDocId: lastDoc && lastDoc['_id'] });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/filter', async (req: Request, res: Response): Promise<void> => {
  const { pageSize = 100, type, value } = req.body;
  const query = { $or: [{ [type]: value }] };

  try {
    const data = (await collections.accounts?.find(query).limit(pageSize).toArray()) || [];
    const lastDoc = data[0];

    res.status(200).send({ accounts: data, lastDocId: lastDoc && lastDoc['_id'] });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/search', async (req: Request, res: Response): Promise<void> => {
  const { pageSize = 100, value } = req.body;
  const searchRegex = new RegExp(value, 'i');
  const query = { $or: [{ 'First Name': searchRegex }, { 'Last Name': searchRegex }] };

  try {
    const data = (await collections.accounts?.find(query).limit(pageSize).toArray()) || [];
    const lastDoc = data[0];

    res.status(200).send({ accounts: data, lastDocId: lastDoc && lastDoc['_id'] });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.use('/', router);

app.listen(PORT, (): void => {
  console.log(`Server Running here ???? https://localhost:${PORT}`);
});
