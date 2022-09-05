import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const server = express();
server.use(cors());
server.use(json());

(async () => {
  try {
      await mongoClient.connect();
      db = mongoClient.db('bate-bapo-UOL');
  } catch (error) {
      console.error(error);
  }
})();

const getObject = async (collection, query = {}) => {
  const object = await db.collection(collection).find(query).toArray();
  return object;
}

async function insertUser(user) {
  await db.collection("messages").insertOne(user);
}

server.get('/participants', async (req, res) => {
  try {
      const participants = await getObject('participants');
      res.send(participants);
      
  } catch (error) {
      console.error(error);
      res.status(500).send("Resposta incompleta, verifique os dados solicitados");
  }
});

server.post('/participants', async (req, res) => {
  const { name } = req.body;

  const participantSchema = joi.object({
    name: joi.string().empty(' ').required()
  });

  const participantStatus = {
    from: name,
    to: 'Todos',
    text: 'entra na sala...',
    type: 'status',
    time: dayjs().format('HH:mm:ss')
};

  const participantsList = await db.collection("participants").find().toArray();
  const validation = participantSchema.validate({ name }, { abortEarly: false });
  const compareUser = participantsList.filter((user) => `${user.name}` === `${name}`);

  if (validation.error) {
      res.status(422).send("O campo de usuário não pode ser vazio.");
      return;
  }

try {
  if (compareUser.length > 0) {
      res.status(409).send("Usuário já existente. Por favor, cadastre outro nome de usuário.");
  } else {
    await db.collection('participants').insertOne({
      name: name,
      lastStatus: Date.now()
    });
    insertUser(participantStatus);
    res.sendStatus(201);
  }

} catch (error) {
  console.error(error);
  res.status(500).send("Requisição incompleta, verifique os dados enviados");
}
});

server.get("/messages", async (req, res) => {
  const { limit } = Number(req.query);
  const { user } = req.headers;

  const query = {
    $or: [
        {type: 'message'},
        {from: user},
        {to: user},
        {to: 'Todos'}
    ]
};

  const participantsList = await db.collection("participants").find().toArray();
  const messagesList = db.collection("messages").find(query).toArray();

  try {
    //const resMessages = await db.collection("messages").find().toArray();

    messagesList = participantsList.filter((participant) =>
      participant.to === "Todos" || participant.to === user || participant.from === user)

    res.send(messagesList.slice(-limit));


  } catch (error) {
    console.error(error);
    res.status(500).send("Resposta incompleta, verifique os dados solicitados");
  }
});

server.post('/messages', async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  const messageSchema = joi.object({
    to: joi.string().empty(' ').required(),
    text: joi.string().empty(' ').required(),
    type: joi.valid('message', 'private_message').required()
  });

  const messageStatus = {
    from: user,
    to: to,
    text: text,
    type: type,
    time: dayjs().format('HH:mm:ss')
}

  const validation = messageSchema.validate({ to, text, type }, { abortEarly: false });

  const findParticipant = async (user) => {
    const participant = await db.collection('participants').findOne({ name: user });
    return participant;
  }

  try {

      if (validation.error || !(await findParticipant(user)) || !((to === 'Todos') || await findParticipant(to))) {
          const errors = validation.error ? 
          validation.error.details.map(error => error.message)
          : "Usuário inexistente";
          res.status(422).send({ message: errors });
          return;
      } else {
        insertUser(messageStatus);
        res.sendStatus(201);
      }

  } catch (error) {
    console.error(error);
    res.status(500).send("Requisição incompleta, verifique os dados enviados");
  }
});

server.listen(5000);