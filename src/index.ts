import * as dotenv from 'dotenv';
import express, { Request, Response, Application } from 'express';
import { MongoClient, Collection, Db } from 'mongodb';

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

app.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const holders = await collections.accounts?.find({}).toArray();
    res.status(200).send(holders);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(PORT, (): void => {
  console.log(`Server Running here 👉 https://localhost:${PORT}`);
});
