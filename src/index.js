import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi'
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const server = express();
server.use(cors());
server.use(json());

(async () => {
  try {
      await client.connect();
      db = client.db('bate-bapo-UOL');
  } catch (error) {
      console.log(error);
  }
})();

const userSchema = joi.object({
  name: joi.string().empty(' ').min(3).required()
});

const messageSchema = joi.object({
  to: joi.string().empty(' ').required(),
  text: joi.string().empty(' ').required(),
  type: joi.valid('message', 'private_message').required()
});

server.listen(5000);